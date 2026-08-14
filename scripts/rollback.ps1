# rollback.ps1 — re-deploy a snapshot tag to revert a bad launch.
#
# Usage:
#   pwsh scripts/rollback.ps1                            # rollback to most recent backup tag
#   pwsh scripts/rollback.ps1 -Tag backup/main-20260531  # rollback to specific tag

param(
	[string]$Tag,
	[switch]$Preview
)

$ErrorActionPreference = 'Stop'

# Find the tag if not specified
if (-not $Tag) {
	$Tag = git tag --list 'backup/main-*' --sort=-creatordate | Select-Object -First 1
	if (-not $Tag) { throw "No backup/main-* tags found. Specify -Tag explicitly." }
	Write-Host "Using most recent snapshot: $Tag" -ForegroundColor Yellow
}

# Verify the tag exists
git rev-parse --verify "$Tag^{commit}" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Tag '$Tag' does not exist locally. Run: git fetch --tags" }

$tagSha = git rev-parse "$Tag^{commit}"
Write-Host "About to deploy commit $($tagSha.Substring(0,7)) ($Tag) to Cloudflare Pages." -ForegroundColor Yellow
Write-Host "Press ENTER to continue or Ctrl+C to abort."
Read-Host

# Build from the tag
Write-Host "▸ Checking out $Tag..." -ForegroundColor Yellow
git checkout $Tag 2>&1 | Out-Null

try {
	Write-Host "▸ pnpm install..." -ForegroundColor Yellow
	pnpm install --frozen-lockfile 2>&1 | Out-Null

	Write-Host "▸ pnpm build..." -ForegroundColor Yellow
	pnpm build 2>&1 | Out-Null

	$branch = if ($Preview) { 'staging' } else { 'main' }
	Write-Host "▸ wrangler pages deploy → $branch..." -ForegroundColor Yellow
	pnpm exec wrangler pages deploy .svelte-kit/cloudflare --project-name=shivworks-network --branch=$branch
	if ($LASTEXITCODE -ne 0) { throw "wrangler pages deploy failed" }

	Write-Host "" ; Write-Host "✓ Rolled back to $Tag" -ForegroundColor Green
	Write-Host "  Now investigate the bad deploy — your branch is in detached-HEAD state at $Tag." -ForegroundColor DarkGray
	Write-Host "  Return to your work branch with: git checkout <branch-name>" -ForegroundColor DarkGray
} catch {
	Write-Host "✗ Rollback failed: $($_.Exception.Message)" -ForegroundColor Red
	Write-Host "  Return to your branch with: git checkout -" -ForegroundColor DarkGray
	throw
}
