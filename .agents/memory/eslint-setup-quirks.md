---
name: ESLint + Prettier setup quirks for SvelteKit + TS
description: Lessons from wiring up ESLint flat config + Prettier in this codebase
---

## no-undef must be turned off for TS/Svelte files

TypeScript's own checker handles undefined references. ESLint's `no-undef` fires false positives on TS global namespaces like `App.Locals['user']` used throughout this app's Svelte components. Set `'no-undef': 'off'` globally in the ESLint config.

**Why:** Two components (Nav.svelte, MemberIdentityPanel.svelte) use `App.Locals` at the interface prop level — a TS global namespace, not a runtime variable. ESLint cannot see TS namespaces.

## eslint-plugin-svelte v3 flat config rules to downgrade

The following rules from `eslint-plugin-svelte`'s `flat/recommended` are noisy on the existing codebase and should be set to `'warn'` for the baseline:
- `svelte/no-navigation-without-resolve` — fires on plain `<a href>` links
- `svelte/require-each-key` — many `{#each}` blocks have no keyed expression
- `svelte/no-useless-mustaches` — falsely flags `{'\n...'}` placeholder strings where the JS escape is intentional

## prettier --write . hangs in Replit

Running `prettier --write .` hangs because it tries to format too many files (node_modules leakthrough, binary files in .local/, etc.). Always scope it:
```
prettier --write "src/**/*.{ts,svelte,js}" "tests/**/*.ts" "*.{json,md,yml,yaml}"
```

**How to apply:** The `format` and `format:check` scripts in package.json are already scoped this way.

## husky init requires git write access

`pnpm husky` (init) runs `git config core.hooksPath .husky` which is a git write operation blocked in Replit's main agent. Create `.husky/pre-commit` manually and make it executable with `chmod +x`. The `prepare: "husky"` script will set up hooks properly when `pnpm install` runs in a real git environment (CI, local dev).
