# scripts/snapshot-main.ps1
# Tag origin/main as backup/main-YYYYMMDD-HHMM before any potentially destructive
# operation. Tag is pushed to origin so the snapshot survives if your local clone
# is lost. Recover with:  git reset --hard backup/main-<timestamp>
#
# Run this BEFORE every `git pull` on main, and BEFORE merging any external PR
# (especially from Replit / Aaron's bot / anything you didn't author yourself).
#
# Ledger: 2026-05-29 · added after Replit's destructive push to main wiped the
# planning bundle; this script makes that scenario a 60-second rollback.

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Error "Not inside a git repository."
    exit 1
}
Set-Location $repoRoot

Write-Host "→ Fetching origin..." -ForegroundColor Cyan
git fetch origin --quiet

$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$tagName = "backup/main-$timestamp"

# Tag origin/main (not local HEAD — we want the snapshot of what's actually on
# the remote at this moment, regardless of your working tree).
$mainSha = git rev-parse origin/main
Write-Host "→ Tagging $tagName at $($mainSha.Substring(0,7))..." -ForegroundColor Cyan
git tag -a $tagName $mainSha -m "Snapshot of origin/main before sync at $timestamp"

Write-Host "→ Pushing tag to origin..." -ForegroundColor Cyan
git push origin $tagName --quiet

Write-Host ""
Write-Host "✓ Snapshot saved: $tagName -> $($mainSha.Substring(0,7))" -ForegroundColor Green
Write-Host "  Recover with:   git reset --hard $tagName" -ForegroundColor Yellow
Write-Host "  List snapshots: git tag -l 'backup/main-*'" -ForegroundColor Yellow
