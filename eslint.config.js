import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
        js.configs.recommended,
        ...ts.configs.recommended,
        ...svelte.configs['flat/recommended'],
        {
                languageOptions: {
                        // tsconfigRootDir pins typescript-eslint to this project root.
                        // Without it, v8+ throws "multiple candidate TSConfigRootDirs"
                        // when leftover .claude/worktrees/* (each a full repo clone with
                        // its own tsconfig.json) coexist with our root tsconfig.json.
                        parserOptions: {
                                tsconfigRootDir: import.meta.dirname
                        },
                        globals: {
                                ...globals.browser,
                                ...globals.node
                        }
                }
        },
        {
                files: ['**/*.svelte'],
                languageOptions: {
                        parserOptions: {
                                parser: ts.parser
                        }
                }
        },
        {
                rules: {
                        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
                        '@typescript-eslint/no-explicit-any': 'warn',
                        'no-console': ['warn', { allow: ['error', 'warn'] }],
                        // TypeScript already catches undefined references in TS/Svelte files;
                        // no-undef fires false positives on TS global namespaces like App.Locals.
                        'no-undef': 'off',
                        // These Svelte rules fire on the existing codebase's href patterns and #each blocks.
                        // Downgraded to warn for the baseline; address incrementally.
                        'svelte/no-navigation-without-resolve': 'warn',
                        'svelte/require-each-key': 'warn',
                        // no-useless-mustaches incorrectly flags {'\n...'} placeholder strings where
                        // the JS escape is intentional and cannot be expressed as a plain attribute.
                        'svelte/no-useless-mustaches': 'warn',
                        // ClerkMount.svelte uses direct DOM access to mount Clerk's vanilla widget
                        // into a Svelte target — Clerk owns the children after mount. Downgrading
                        // matches the baseline pattern for other Svelte rules above.
                        'svelte/no-dom-manipulating': 'warn'
                }
        },
        {
                ignores: [
                        '.svelte-kit/**',
                        '.local/**',
                        '.planning/**',
                        '.claude/**',
                        'build/**',
                        'dist/**',
                        'node_modules/**',
                        '*.config.js',
                        '*.config.ts',
                        '*.config.mjs'
                ]
        }
);
