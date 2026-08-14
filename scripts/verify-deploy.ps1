# verify-deploy.ps1 — curl every public route on a deployed URL, report status.
#
# Usage:
#   pwsh scripts/verify-deploy.ps1                                           # hits canonical .pages.dev
#   pwsh scripts/verify-deploy.ps1 -BaseUrl https://network.shivworks.com    # hits custom domain
#   pwsh scripts/verify-deploy.ps1 -BaseUrl https://shivworks-network.pages.dev -Verbose

param(
	[string]$BaseUrl = "https://shivworks-network.pages.dev",
	[switch]$Verbose
)

$publicRoutes = @(
	@{ path = '/';                expect = 200; desc = 'landing' },
	@{ path = '/login';           expect = 200; desc = 'Clerk login' },
	@{ path = '/signup';          expect = 200; desc = 'Clerk signup' },
	@{ path = '/checkout';        expect = @(200,302,307); desc = 'checkout (auth-or-redirect)' },
	@{ path = '/sitemap.xml';     expect = 200; desc = 'sitemap' }
)

$authedRoutes = @(
	@{ path = '/dashboard';       expect = @(302,307); desc = 'dashboard → /login when unauth' },
	@{ path = '/library';         expect = @(302,307); desc = 'library → /login when unauth' },
	@{ path = '/account';         expect = @(302,307); desc = 'account → /login when unauth' },
	@{ path = '/find-partners';   expect = @(302,307); desc = 'find-partners → /login when unauth' },
	@{ path = '/messages';        expect = @(302,307); desc = 'messages → /login when unauth' },
	@{ path = '/leaderboard';     expect = @(302,307); desc = 'leaderboard → /login when unauth' },
	@{ path = '/profile';         expect = @(302,307); desc = 'profile → /account redirect' },
	@{ path = '/people';          expect = @(302,307); desc = 'people → /find-partners redirect' }
)

$apiRoutes = @(
	@{ path = '/api/members';     expect = 200; desc = 'founding-member count' }
)

function Hit($base, $route) {
	$url = "$base$($route.path)"
	$expected = @($route.expect)
	try {
		$r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0 -ErrorAction Stop
		$code = $r.StatusCode
	} catch {
		$code = $_.Exception.Response.StatusCode.value__
		if (-not $code) { $code = 'ERR' }
	}
	$ok = $expected -contains $code
	$icon = if ($ok) { '✓' } else { '✗' }
	$color = if ($ok) { 'Green' } else { 'Red' }
	$expectStr = $expected -join '|'
	Write-Host ("  {0} {1,3}  (expect {2})  {3,-30}  {4}" -f $icon, $code, $expectStr, $route.desc, $url) -ForegroundColor $color
	return $ok
}

Write-Host ""
Write-Host "Verifying $BaseUrl" -ForegroundColor Cyan
Write-Host ""

$pass = 0; $fail = 0

Write-Host "── Public routes" -ForegroundColor Yellow
foreach ($r in $publicRoutes) { if (Hit $BaseUrl $r) { $pass++ } else { $fail++ } }

Write-Host ""
Write-Host "── Auth-gated routes (should redirect when unauthenticated)" -ForegroundColor Yellow
foreach ($r in $authedRoutes) { if (Hit $BaseUrl $r) { $pass++ } else { $fail++ } }

Write-Host ""
Write-Host "── API endpoints" -ForegroundColor Yellow
foreach ($r in $apiRoutes) { if (Hit $BaseUrl $r) { $pass++ } else { $fail++ } }

Write-Host ""
$summary = if ($fail -eq 0) { "✓ all $pass routes verified" } else { "✗ $fail of $($pass + $fail) failed" }
$summaryColor = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host $summary -ForegroundColor $summaryColor
if ($fail -ne 0) { exit 1 }
