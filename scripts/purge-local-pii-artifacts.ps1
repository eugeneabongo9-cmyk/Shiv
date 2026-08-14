# Purge local customer-data artifacts (does NOT touch Cloudflare D1 production).
# Run from repo root. Review docs/security/pii-remediation-report.md first.
#
# Usage:
#   pwsh -File scripts/purge-local-pii-artifacts.ps1           # dry-run (default)
#   pwsh -File scripts/purge-local-pii-artifacts.ps1 -Execute  # delete files

param(
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root '.git'))) {
    $root = Get-Location
}

$targets = @(
    'founding-members.sql',
    'audit-report.html',
    'data/shivworks-network.db',
    'data/shivworks-network.db-wal',
    'data/shivworks-network.db-shm',
    'buyers.csv',
    'buyers.sql',
    '.wrangler'
)

if (Test-Path (Join-Path $root 'd1-paste-chunks')) {
    $targets += Get-ChildItem (Join-Path $root 'd1-paste-chunks') -Filter '*.sql' |
        ForEach-Object { $_.FullName.Substring($root.Length + 1) }
}

$found = @()
foreach ($rel in $targets) {
    $full = Join-Path $root $rel
    if (Test-Path $full) { $found += $full }
}

if ($found.Count -eq 0) {
    Write-Host 'No local PII artifacts found.'
    exit 0
}

Write-Host "Local PII artifacts ($($found.Count)):"
foreach ($f in $found) {
    $item = Get-Item $f
    Write-Host "  $($item.FullName)  ($($item.Length) bytes)"
}

if (-not $Execute) {
    Write-Host ''
    Write-Host 'Dry-run only. Re-run with -Execute to delete.'
    exit 0
}

foreach ($f in $found) {
    if ((Get-Item $f).PSIsContainer) {
        Remove-Item -LiteralPath $f -Recurse -Force
    } else {
        Remove-Item -LiteralPath $f -Force
    }
    Write-Host "Deleted $f"
}

Write-Host 'Done. Production D1 was not modified.'
