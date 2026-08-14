# scripts/kill-orphans.ps1
#
# Janitor for stale Node processes left behind by interrupted dev runs and
# test runs. Safe to run anytime - it spares the live dev server, your active
# Claude MCP tooling, and any process whose parent is still running.
#
# Usage:
#   powershell -File scripts/kill-orphans.ps1            # interactive, ask before kill
#   powershell -File scripts/kill-orphans.ps1 -DryRun    # just show, no kill
#   powershell -File scripts/kill-orphans.ps1 -Force     # kill without asking
#   powershell -File scripts/kill-orphans.ps1 -Watch     # loop every 30s

param(
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Watch,
    [int]$WatchIntervalSeconds = 30
)

function Get-ListeningPids {
    $set = New-Object 'System.Collections.Generic.HashSet[int]'
    $rows = netstat -ano | Select-String 'LISTENING'
    foreach ($row in $rows) {
        $line = $row.Line.Trim()
        if ($line -match '\s+(\d+)\s*$') {
            [void]$set.Add([int]$Matches[1])
        }
    }
    return $set
}

function Get-LivePidSet {
    $set = New-Object 'System.Collections.Generic.HashSet[int]'
    foreach ($p in Get-CimInstance Win32_Process) {
        [void]$set.Add([int]$p.ProcessId)
    }
    return $set
}

function Get-Verdict {
    param($proc, $listeners, $livePids)

    $cmd = $proc.CommandLine
    if (-not $cmd) { return 'spare' }

    # Things we always keep
    if ($cmd -match 'desktop-commander') { return 'keep' }
    if ($cmd -match 'markdown-viewer')   { return 'keep' }
    if ($cmd -match 'StreamDeck')        { return 'keep' }
    if ($cmd -match 'playwright/mcp')    { return 'keep' }
    if ($cmd -match 'mcp-server\\dist')  { return 'keep' }

    # Vite: keep the one with a listening port, kill orphans
    if ($cmd -match 'vite') {
        if ($listeners.Contains([int]$proc.ProcessId)) { return 'keep' }
        return 'kill'
    }

    $isOrphan = -not $livePids.Contains([int]$proc.ParentProcessId)

    # Stale build/test/install runs whose parent is dead
    if ($cmd -match 'svelte-check' -and $isOrphan) { return 'kill' }
    if ($cmd -match 'vitest' -and $isOrphan)       { return 'kill' }
    if ($cmd -match 'wrangler' -and $isOrphan)     { return 'kill' }
    if ($cmd -match 'pnpm' -and $isOrphan)         { return 'kill' }

    # Sub-5MB ghost processes whose parent is dead
    if ($proc.WorkingSetSize -lt 5MB -and $isOrphan) { return 'kill' }

    return 'spare'
}

function Sweep {
    $listeners = Get-ListeningPids
    $livePids = Get-LivePidSet

    $rows = @()
    foreach ($p in (Get-CimInstance Win32_Process -Filter "Name='node.exe'")) {
        $verdict = Get-Verdict $p $listeners $livePids
        $mb = [math]::Round($p.WorkingSetSize / 1MB, 0)
        $cmd = ''
        if ($p.CommandLine) {
            $clean = ($p.CommandLine -replace '\s+', ' ')
            $cmd = $clean.Substring(0, [math]::Min(70, $clean.Length))
        }
        $rows += [PSCustomObject]@{
            PID = $p.ProcessId
            PPID = $p.ParentProcessId
            MB = $mb
            Verdict = $verdict
            Cmd = $cmd
        }
    }

    $now = Get-Date -Format 'HH:mm:ss'
    Write-Host ''
    Write-Host "=== Node process audit @ $now ===" -ForegroundColor Cyan
    $rows | Sort-Object MB -Descending | Format-Table -AutoSize

    $kills = $rows | Where-Object { $_.Verdict -eq 'kill' }
    if ($kills.Count -eq 0) {
        Write-Host 'Nothing to kill.' -ForegroundColor Green
        return
    }

    $killsArray = @($kills)
    $count = $killsArray.Count
    $freed = 0
    foreach ($k in $killsArray) { $freed += $k.MB }
    Write-Host ''
    Write-Host ('Candidates to kill: ' + $count + ' processes, ' + $freed + ' MB total') -ForegroundColor Yellow
    $kills | Format-Table PID, MB, Cmd -AutoSize

    if ($DryRun) {
        Write-Host 'DryRun - nothing killed.' -ForegroundColor Gray
        return
    }

    if (-not $Force -and -not $Watch) {
        $answer = Read-Host 'Proceed? (y/n)'
        if ($answer -ne 'y') {
            Write-Host 'Cancelled.' -ForegroundColor Gray
            return
        }
    }

    foreach ($k in $kills) {
        try {
            Stop-Process -Id $k.PID -Force -ErrorAction Stop
            Write-Host "killed PID $($k.PID) ($($k.MB) MB)" -ForegroundColor Red
        } catch {
            Write-Host "PID $($k.PID) already gone or access denied" -ForegroundColor DarkYellow
        }
    }

    Write-Host ''
    Write-Host ('Freed approximately ' + $freed + ' MB.') -ForegroundColor Green
}

if ($Watch) {
    Write-Host "Watching every $WatchIntervalSeconds seconds. Ctrl+C to stop." -ForegroundColor Cyan
    while ($true) {
        Sweep
        Start-Sleep -Seconds $WatchIntervalSeconds
    }
} else {
    Sweep
}
