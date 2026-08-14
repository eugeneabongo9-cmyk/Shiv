# launch.ps1 — one-command launch to Cloudflare Pages dev URL.
#
# Runs sequentially: verify → migrate → deploy → smoke. Stops on first failure
# so half-broken deploys never reach prod. The deploy target is the canonical
# .pages.dev URL; custom domain (network.shivworks.com) wiring is Aaron's task
# in the CF dashboard and isn't required for this script.
#
# Usage:
#   pwsh scripts/launch.ps1                # full launch (prod)
#   pwsh scripts/launch.ps1 -SkipMigrate   # skip remote D1 migration step
#   pwsh scripts/launch.ps1 -SkipSmoke     # skip the deployed-URL smoke check
#   pwsh scripts/launch.ps1 -Preview       # deploy to preview branch instead

param(
	[switch]$SkipMigrate,
	[switch]$SkipSmoke,
	[switch]$Preview
)

$ErrorActionPreference = 'Stop'

function Section($title) {
	Write-Host ""
	Write-Host "─── $title ───────────────────────────────────────────" -ForegroundColor Cyan
}

function Step($name, $block) {
	$start = Get-Date
	Write-Host "▸ $name" -ForegroundColor Yellow
	& $block
	if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "Step '$name' failed (exit $LASTEXITCODE)" }
	$elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
	Write-Host "  ✓ $name ($($elapsed)s)" -ForegroundColor Green
}

$startedAt = Get-Date
Write-Host "Launch — started $($startedAt.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor White

# ─── Phase 0 · Pre-flight verification ────────────────────────────────────────
Section "Phase 0 · pre-flight"

Step "git status clean" {
	$dirty = git status --porcelain
	if ($dirty) {
		Write-Host "  ⚠ Working tree has uncommitted changes:" -ForegroundColor Yellow
		Write-Host $dirty
		Write-Host "  Continue anyway? (Ctrl+C to abort, ENTER to continue)" -ForegroundColor Yellow
		Read-Host
	}
}

Step "pnpm install --frozen-lockfile" { pnpm install --frozen-lockfile 2>&1 | Out-Null }
Step "pnpm check" { pnpm check 2>&1 | Out-Null }
Step "pnpm test" { pnpm test 2>&1 | Out-Null }
Step "pnpm lint" { pnpm lint 2>&1 | Out-Null }
Step "pnpm build" { pnpm build 2>&1 | Out-Null }

# ─── Phase 1 · Snapshot for rollback ──────────────────────────────────────────
Section "Phase 1 · rollback snapshot"

$tagName = "backup/main-$((Get-Date).ToString('yyyyMMdd-HHmm'))"
Step "tag $tagName" {
	git tag $tagName HEAD 2>&1 | Out-Null
	git push origin $tagName 2>&1 | Out-Null
}
Write-Host "  → if launch fails: pwsh scripts/rollback.ps1 -Tag $tagName" -ForegroundColor DarkGray

# ─── Phase 2 · D1 migrations against remote ──────────────────────────────────
Section "Phase 2 · D1 migrations"

if ($SkipMigrate) {
	Write-Host "  ⊘ skipped (-SkipMigrate)" -ForegroundColor DarkGray
} else {
	Step "wrangler d1 migrations apply --remote" {
		pnpm exec wrangler d1 migrations apply shivworks-network-db --remote 2>&1 | Tee-Object -Variable migOut
		Write-Host $migOut -ForegroundColor DarkGray
	}
}

# ─── Phase 3 · Deploy to Cloudflare Pages ─────────────────────────────────────
Section "Phase 3 · deploy"

$branch = if ($Preview) { 'staging' } else { 'main' }
$envLabel = if ($Preview) { 'PREVIEW' } else { 'PRODUCTION' }

Step "wrangler pages deploy ($envLabel → $branch)" {
	pnpm exec wrangler pages deploy .svelte-kit/cloudflare --project-name=shivworks-network --branch=$branch 2>&1 | Tee-Object -Variable deployOut
	Write-Host $deployOut -ForegroundColor DarkGray
}

# Extract the deployment URL from wrangler output
$deployUrl = $deployOut | Select-String -Pattern 'https://[a-z0-9-]+\.shivworks-network\.pages\.dev' | ForEach-Object { $_.Matches.Value } | Select-Object -First 1
if (-not $deployUrl) { $deployUrl = 'https://shivworks-network.pages.dev' }

# ─── Phase 4 · Smoke against deployed URL ─────────────────────────────────────
Section "Phase 4 · deployed-URL smoke"

if ($SkipSmoke) {
	Write-Host "  ⊘ skipped (-SkipSmoke)" -ForegroundColor DarkGray
} else {
	$routes = @('/', '/login', '/signup', '/checkout', '/sitemap.xml')
	foreach ($route in $routes) {
		$url = "$deployUrl$route"
		try {
			$r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0 -ErrorAction Stop
			$code = $r.StatusCode
		} catch {
			$code = $_.Exception.Response.StatusCode.value__
			if (-not $code) { $code = 'ERR' }
		}
		$ok = $code -ge 200 -and $code -lt 400
		$color = if ($ok) { 'Green' } else { 'Red' }
		Write-Host ("  {0,3}  {1}" -f $code, $url) -ForegroundColor $color
		if (-not $ok) { throw "smoke failed on $url (HTTP $code)" }
	}
}

# ─── Done ─────────────────────────────────────────────────────────────────────
$total = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
Section "Done"
Write-Host "  Deployed to: $deployUrl" -ForegroundColor Green
Write-Host "  Rollback tag: $tagName" -ForegroundColor DarkGray
Write-Host "  Total time: $($total)s" -ForegroundColor White
