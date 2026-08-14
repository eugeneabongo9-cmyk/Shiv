# scripts/sync-upstream.ps1
# Keep the fork's main in lockstep with upstream so wave branches stay mergeable.
# Ledger entry: 2026-05-26 · scripts/sync-upstream.{ps1,sh} — Upstream sync helper
# See .planning/LEDGER.md for why this exists and how it's invoked.

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Error "Not inside a git repository."
    exit 1
}
Set-Location $repoRoot

# Refuse to run on a dirty working tree.
$dirty = git status --porcelain
if ($dirty) {
    Write-Error "Working tree is dirty. Commit or stash first.`n$dirty"
    exit 1
}

# Verify upstream remote exists.
$remotes = git remote
if ($remotes -notcontains 'upstream') {
    Write-Error "No 'upstream' remote. Run: git remote add upstream https://github.com/createsomethingtoday/shivworks-network.git"
    exit 1
}

$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "→ Fetching upstream..." -ForegroundColor Cyan
git fetch upstream --quiet

Write-Host "→ Checking out main..." -ForegroundColor Cyan
git checkout main --quiet

Write-Host "→ Fast-forwarding main to upstream/main..." -ForegroundColor Cyan
git merge --ff-only upstream/main

Write-Host "→ Pushing to origin..." -ForegroundColor Cyan
git push origin main --quiet

$newSha = git rev-parse --short HEAD
Write-Host ""
Write-Host "✓ Fork main is now at $newSha (matches upstream/main)." -ForegroundColor Green

if ($currentBranch -ne 'main') {
    Write-Host ""
    Write-Host "Returning you to '$currentBranch'." -ForegroundColor Yellow
    git checkout $currentBranch --quiet
    Write-Host "  Rebase onto the new main with:  git rebase main" -ForegroundColor Yellow
}
