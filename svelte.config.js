import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isReplitPreview = Boolean(process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS);
const isReplitDeployment = process.env.SHIVWORKS_DEPLOY_TARGET === 'replit';
// Local dev platform config. Points the adapter at wrangler.local.jsonc so
// ENVIRONMENT, PUBLIC_SITE_URL and CLERK_AUTHORIZED_PARTIES describe localhost
// rather than production. Without it a dev server 503s on every route, and any
// Clerk session is rejected with:
//   Invalid JWT Authorized party claim (azp) "http://localhost:5173"
//
// Detected two ways so it cannot be missed:
//   1. SHIVWORKS_LOCAL_DEV=1, set by the dev scripts in package.json.
//   2. `vite dev` in argv — a fallback for Windows shells, where the inline
//      `VAR=1 cmd` syntax in those scripts does not set the variable.
//
// Build and deploy are unaffected: `vite build` has no "dev" in argv and the
// scripts that run it never set the variable.
const isViteDevCommand = process.argv.some((arg) => arg === 'dev' || arg.endsWith('/dev'));
const isLocalDev = process.env.SHIVWORKS_LOCAL_DEV === '1' || isViteDevCommand;

/** @returns {import('@sveltejs/adapter-cloudflare').AdapterOptions | undefined} */
function cloudflareAdapterOptions() {
	if (isReplitPreview) {
		return {
			platformProxy: {
				configPath: './wrangler.replit.jsonc',
				persist: false,
				remoteBindings: false
			}
		};
	}

	if (isLocalDev) {
		return {
			platformProxy: {
				configPath: './wrangler.local.jsonc',
				// Persist so the local D1 data (migrations, your dev member row)
				// survives a restart. State lives in .wrangler/, already gitignored.
				persist: true,
				remoteBindings: false
			}
		};
	}

	return undefined;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isReplitDeployment ? adapterNode() : adapterCloudflare(cloudflareAdapterOptions())
	}
};

export default config;
