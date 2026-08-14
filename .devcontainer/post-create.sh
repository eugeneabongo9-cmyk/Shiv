#!/usr/bin/env bash
# Runs once when the Codespace is first created.
# Installs the toolchain this repo needs so the dev loop is one step from cold start.
set -euo pipefail

echo "=== shivworks-network post-create setup ==="

echo "--- enabling pnpm 9.15.0 via corepack ---"
corepack enable
corepack prepare pnpm@9.15.0 --activate

echo "--- installing Doppler CLI (secrets injection) ---"
curl -sLf --retry 3 --tlsv1.2 --proto '=https' 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
	| sudo gpg --dearmor -o /usr/share/keyrings/doppler-cli.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-cli.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" \
	| sudo tee /etc/apt/sources.list.d/doppler-cli.list >/dev/null
sudo apt-get update -qq
sudo apt-get install -y doppler

echo "--- installing project dependencies (frozen lockfile) ---"
cd "$(git rev-parse --show-toplevel)"
pnpm install --frozen-lockfile

echo "--- syncing SvelteKit generated types ---"
pnpm exec svelte-kit sync

echo "--- installing Playwright Chromium + OS deps (for pnpm smoke) ---"
pnpm exec playwright install --with-deps chromium

echo ""
echo "=== setup complete ==="
echo ""
echo "Next steps inside this Codespace:"
echo "  1. gh auth login        # if not already authed via Codespaces"
echo "  2. doppler login        # one-time Doppler auth"
echo "  3. doppler setup        # bind to the shivworks-network project + config"
echo "  4. Start the dev server, bound for the public port forward:"
echo "       doppler run -- pnpm dev --host 0.0.0.0 --port 5173"
echo "  5. Codespaces forwards port 5173 (public) — share that URL for live preview."
echo ""
echo "Other commands:"
echo "  pnpm check    # svelte-check"
echo "  pnpm smoke    # Playwright public-route tests"
echo "  pnpm build    # vite build for the Cloudflare adapter"
echo ""
