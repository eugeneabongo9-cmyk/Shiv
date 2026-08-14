import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		allowedHosts: ['.replit.dev', '.picard.replit.dev', '.trycloudflare.com'],
		watch: {
			// Ignore Claude Code agent worktrees + caches that emit huge file-change
			// storms and freeze the dev server. The watcher must not see worktrees
			// (they are full repo clones for parallel agents) or test-results / report
			// directories that get rewritten constantly.
			ignored: [
				'**/.claude/worktrees/**',
				'**/.svelte-kit/**',
				'**/node_modules/**',
				'**/test-results/**',
				'**/playwright-report/**',
				'**/.wrangler/**'
			]
		}
	},
	// Pre-bundle lucide-svelte (1000+ icon aliases) so SSR doesn't time out on
	// per-icon fetchModule calls. Vite 6's transport defaults to a 60s timeout
	// which gets exceeded on first cold page render of any route that imports
	// a Lucide icon. Treating it as non-external for SSR forces it through Vite's
	// optimizer up-front.
	ssr: {
		noExternal: ['lucide-svelte']
	},
	optimizeDeps: {
		include: ['lucide-svelte']
	}
});
