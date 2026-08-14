# scripts/dev-supervisor.ps1
#
# Keeps the vite dev server alive across native crashes (better-sqlite3
# std::terminate, Node hard-aborts, etc.). On exit, logs the reason and
# restarts with exponential backoff. Stops after MaxRetries failures
# within a 10-minute window.
#
# Usage:
#   powershell -File scripts/dev-supervisor.ps1
#   powershell -File scripts/dev-supervisor.ps1 -MaxRetries 20
#
# Ctrl+C in the supervisor window stops both supervisor + vite.

param(
    [int]$MaxRetries = 10,
    [int]$Port = 5173,
    [string]$LogDir = '.planning/dev-server-logs'
)

$ErrorActionPreference = 'Stop'

# All env vars required by the dev server.
$env:NODE_ENV = 'development'
$env:DATABASE_PATH = 'E:/dev/clients/outerfields/shivworks-network/data/shivworks-network.db'
$env:SENTRY_DSN = 'https://2664361723f976ef7137f88ea15473b9@o4511458511159296.ingest.us.sentry.io/4511475223625728'
$env:VITE_SENTRY_DSN = $env:SENTRY_DSN

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Track crash timestamps for the rolling-window rate-limit.
$crashTimes = New-Object 'System.Collections.Generic.Queue[DateTime]'
$attempt = 0

Write-Host ''
Write-Host '=== dev-supervisor starting ===' -ForegroundColor Cyan
Write-Host ('Port:    ' + $Port) -ForegroundColor Gray
Write-Host ('Logs:    ' + $LogDir) -ForegroundColor Gray
Write-Host ('Retries: ' + $MaxRetries + ' within any 10 minutes') -ForegroundColor Gray
Write-Host ''

# Kill any stale vite already on the port before starting.
function Stop-StaleVite {
    $line = netstat -ano | Select-String ":$Port " | Select-String 'LISTENING'
    if ($line) {
        $stalePid = ($line.Line.Trim() -split '\s+')[-1]
        if ($stalePid -match '^\d+$') {
            Write-Host ('  killing stale vite PID ' + $stalePid) -ForegroundColor DarkYellow
            try { Stop-Process -Id ([int]$stalePid) -Force -ErrorAction Stop } catch {}
            Start-Sleep -Seconds 2
        }
    }
}

while ($true) {
    $attempt++

    # Prune old crashes from the window
    $cutoff = (Get-Date).AddMinutes(-10)
    while ($crashTimes.Count -gt 0 -and $crashTimes.Peek() -lt $cutoff) {
        [void]$crashTimes.Dequeue()
    }

    if ($crashTimes.Count -ge $MaxRetries) {
        Write-Host ''
        Write-Host ('FATAL: ' + $crashTimes.Count + ' crashes in the last 10 minutes; giving up.') -ForegroundColor Red
        Write-Host ('Check logs in ' + $LogDir) -ForegroundColor Yellow
        exit 1
    }

    Stop-StaleVite

    $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
    $logOut = Join-Path $LogDir ('vite-' + $ts + '.out.log')
    $logErr = Join-Path $LogDir ('vite-' + $ts + '.err.log')

    Write-Host ('[attempt ' + $attempt + '] starting vite -> ' + $logOut) -ForegroundColor Green

    # Launch pnpm dev. Must go through cmd because pnpm is a .CMD shim,
    # not a true .exe — Start-Process can't spawn it directly.
    try {
        $proc = Start-Process `
            -FilePath 'cmd.exe' `
            -ArgumentList '/c', 'pnpm.cmd', 'dev' `
            -NoNewWindow `
            -PassThru `
            -RedirectStandardOutput $logOut `
            -RedirectStandardError $logErr
    } catch {
        Write-Host ('  failed to spawn pnpm: ' + $_.Exception.Message) -ForegroundColor Red
        $crashTimes.Enqueue((Get-Date))
        Start-Sleep -Seconds 5
        continue
    }

    Write-Host ('  vite PID ' + $proc.Id) -ForegroundColor Gray

    # Watch the process until it exits.
    try {
        $proc | Wait-Process
    } catch {
        # Already exited or invalid handle — fall through to restart loop.
    }

    $exitCode = if ($null -ne $proc.ExitCode) { $proc.ExitCode } else { '?' }
    Write-Host ('  vite PID ' + $proc.Id + ' exited (code ' + $exitCode + ')') -ForegroundColor Yellow
    $crashTimes.Enqueue((Get-Date))

    # Look at the last log lines to surface the crash reason
    if (Test-Path $logErr) {
        $tail = Get-Content $logErr -Tail 5 -ErrorAction SilentlyContinue
        if ($tail) {
            Write-Host '  -- last err lines --' -ForegroundColor DarkGray
            foreach ($line in $tail) { Write-Host ('  ' + $line) -ForegroundColor DarkGray }
        }
    }

    # Backoff: 3s, 5s, 10s, 20s, capped at 30s
    $backoff = @(3, 5, 10, 20, 30)[[math]::Min($attempt - 1, 4)]
    Write-Host ('  restarting in ' + $backoff + 's...') -ForegroundColor Cyan
    Start-Sleep -Seconds $backoff
}
