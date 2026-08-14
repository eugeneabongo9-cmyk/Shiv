# ShivWorks 4.1 — SvelteKit preview harness

A faithful 1:1 preview harness for the static `Shivworks (4.1)` design package.
Every mockup page is a route; the shared design system and engines are preserved as-is.

This is not the production import path. Use `../Shivworks (4.1)/UI-IMPORT-CONTRACT.md`
and `../Shivworks (4.1)/import-package/` when converting design work into the live app.
For video placeholders, use `../Shivworks (4.1)/VIDEO-PLACEHOLDER-MAP.md` and
`../Shivworks (4.1)/video-placeholders.json`; this preview harness only renders the placeholders.

## Run

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # static build -> ./build  (adapter-static, SPA fallback)
```

## How the port works

- **Routes** — one `+page.svelte` per page (`/`, `/dashboard`, `/login`, …). `.html`
  links from the mockups (`dashboard.html`) are mapped onto the dot-free routes by the
  universal `reroute` hook in `src/hooks.js`, so no markup was rewritten.
- **Markup** — each page body is stored verbatim in `src/lib/pages/<name>.html` and
  rendered with `{@html}`, so the browser-tolerant mockup HTML is never re-parsed by the
  Svelte compiler (no nesting/escaping drift).
- **CSS** — each page's `<style>` blocks → `static/pagecss/<name>.css`, linked globally
  (unscoped) so selectors match exactly. Shared `shivworks.css` / `prefs.css` load in
  `src/app.html`.
- **JS** — shared param-free engines (`prefs.js`, `session.js`, `pageflow.js`) load in
  `src/app.html`. Per-page scripts (`gsap`, `sidebar.js`, `catalog.js`, `docs.js`, and the
  page's own inline script → `static/pagejs/<name>.js`, served at `/pagejs/<name>.js`) are injected in order at runtime by
  `src/lib/loadPageScripts.js`, preserving classic-script global scope.
- **Navigation** — `<body data-sveltekit-reload>` forces a full document load per
  navigation, so the vanilla engines re-run exactly as they did standalone (matches how
  `pageflow.js` already navigated).

## Regenerate

The routes are generated from the source package:

```bash
npm run gen      # reads ../Shivworks (4.1)/*.html -> regenerates routes/css/js/html
```

Edit `scripts/gen.mjs` to change the transform. `static/assets/sidebar.js` carries one
local patch (reads `window.__SW_ACTIVE` as a fallback for the active nav item when injected
dynamically); everything else in `static/assets/` is copied verbatim.
