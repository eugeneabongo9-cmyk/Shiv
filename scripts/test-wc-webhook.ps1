# test-wc-webhook.ps1 — send a fake-signed POST to /api/wc/webhook to verify
# the endpoint accepts valid signatures and rejects bad ones. Lets us prove
# our endpoint works without WooCommerce being wired up on the other side.
#
# Usage:
#   pwsh scripts/test-wc-webhook.ps1 -Url https://shivworks-network.pages.dev/api/wc/webhook -Secret <secret>
#   pwsh scripts/test-wc-webhook.ps1 -Local                # hits http://localhost:5173 with WC_WEBHOOK_SECRET from .env

param(
	[string]$Url,
	[string]$Secret,
	[switch]$Local,
	[int]$ProductId = 31517,      # 31517 = bronze, 31518 = vip
	[string]$Email = "test+wc@shivworks.com",
	[string]$Name = "Test Buyer"
)

$ErrorActionPreference = 'Stop'

if ($Local) {
	if (-not $Url) { $Url = "http://localhost:5173/api/wc/webhook" }
	if (-not $Secret -and (Test-Path .env)) {
		$Secret = (Get-Content .env | Where-Object { $_ -match '^WC_WEBHOOK_SECRET=' }) -replace '^WC_WEBHOOK_SECRET=', ''
	}
}

if (-not $Url) { throw "Specify -Url <full webhook URL> (or -Local for local dev server)" }
if (-not $Secret) { throw "Specify -Secret <shared HMAC secret>" }

$orderId = [int](Get-Random -Maximum 999999999)
$body = @{
	id = $orderId
	status = "completed"
	billing = @{
		first_name = ($Name -split ' ')[0]
		last_name = ($Name -split ' ')[1..($Name.Length)] -join ' '
		email = $Email
	}
	line_items = @(
		@{
			product_id = $ProductId
			name = if ($ProductId -eq 31517) { "ShivWorks Network — Founding Bronze" } else { "ShivWorks Network — Founding VIP" }
			quantity = 1
		}
	)
} | ConvertTo-Json -Depth 10 -Compress

# Compute HMAC-SHA256, base64
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
$signature = [Convert]::ToBase64String($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($body)))

Write-Host "POST $Url" -ForegroundColor Cyan
Write-Host "Order: $orderId · Product: $ProductId · Email: $Email" -ForegroundColor DarkGray
Write-Host ""

# ─── Test 1: valid signature ──────────────────────────────────────────────────
Write-Host "Test 1 · valid signature" -ForegroundColor Yellow
try {
	$r = Invoke-WebRequest -Uri $Url -Method POST -Body $body -ContentType "application/json" `
		-Headers @{ "x-wc-webhook-signature" = $signature } -UseBasicParsing
	Write-Host "  $($r.StatusCode)  $($r.Content)" -ForegroundColor Green
} catch {
	$resp = $_.Exception.Response
	Write-Host "  $($resp.StatusCode.value__)  $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# ─── Test 2: tampered signature (must fail with 401) ──────────────────────────
Write-Host ""
Write-Host "Test 2 · tampered signature (expect 401)" -ForegroundColor Yellow
try {
	$bad = $signature.Substring(0, $signature.Length - 4) + "AAAA"
	$r = Invoke-WebRequest -Uri $Url -Method POST -Body $body -ContentType "application/json" `
		-Headers @{ "x-wc-webhook-signature" = $bad } -UseBasicParsing
	Write-Host "  $($r.StatusCode)  $($r.Content)" -ForegroundColor Red
	Write-Host "  ✗ expected 401 but got $($r.StatusCode)" -ForegroundColor Red
} catch {
	$code = $_.Exception.Response.StatusCode.value__
	if ($code -eq 401) {
		Write-Host "  401  (rejected — correct)" -ForegroundColor Green
	} else {
		Write-Host "  $code  unexpected" -ForegroundColor Red
	}
}

# ─── Test 3: replay (same order, valid signature — should be idempotent) ──────
Write-Host ""
Write-Host "Test 3 · replay same order (expect 200 + alreadyProcessed:true)" -ForegroundColor Yellow
try {
	$r = Invoke-WebRequest -Uri $Url -Method POST -Body $body -ContentType "application/json" `
		-Headers @{ "x-wc-webhook-signature" = $signature } -UseBasicParsing
	Write-Host "  $($r.StatusCode)  $($r.Content)" -ForegroundColor Green
} catch {
	Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done. Check D1 for member_imports row with email=$Email." -ForegroundColor White
