# Port Audit — Sidebar (global)

**Aaron canonical:** `shivworks-demo/src/lib/components/Sidebar.svelte` (558 lines)
**Target:** `src/lib/components/Sidebar.svelte` (new)
**Audited by:** claude-launch-day · 2026-06-01
**Status when audited:** STUB (didn't exist in our repo)

## What this port unlocks

Every authed member surface (`/dashboard`, `/library`, `/community`, `/live`, `/updates`, `/messages`, `/vip-calls`, `/admin`) renders inside the Sidebar shell. Without Sidebar, those pages either render with the wrong (top-Nav) chrome or look broken.

## Aaron's pattern

- Sidebar is **conditional**: only shown when `data.user.accessStatus === 'active'` AND on a member surface
- Public/auth surfaces (`/`, `/login`, `/signup`, `/welcome`, `/checkout`) keep the top `<Nav>`
- The two never render simultaneously

## Dependencies

| Dep | Status in our repo | Action |
|---|---|---|
| `lucide-svelte` icons | ✅ Have | use as-is |
| `$app/stores` (page) | ✅ SvelteKit built-in | use as-is |
| `MembershipBadge` | ✅ Have (47 lines) | use as-is |
| `SignOutButton` | ✅ Have | use as-is — verify signature matches |
| `SITE_NAME` constant | ✅ Have | use as-is |
| `$lib/stores/dm-unread` | ❌ Missing | **port: 8-line stub from Aaron** |
| `/cobra-logo.png` asset | ❌ Missing | **copy from Aaron's `static/`** |

## Layout integration

Our current `src/routes/+layout.svelte` always renders `<Nav>` + `<Footer>` around `<main>`. Need to make Sidebar conditional matching Aaron's `isSidebarPage` logic.

**Diff plan:**
```svelte
<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { page } from '$app/stores';

  const currentPath = $derived($page.url.pathname);
  const isSidebarPage = $derived(
    data.user?.accessStatus === 'active' &&
    (currentPath.startsWith('/dashboard') || /library/ || /community/ || ...)
  );
</script>

{#if isSidebarPage}
  <Sidebar user={data.user} clerkPublishableKey={...} />
  <main class="page-main page-main--sidebar">{@render children()}</main>
{:else}
  <Nav user={data.user} clerkPublishableKey={...} />
  <main class="page-main">{@render children()}</main>
  <Footer />
{/if}
```

Note: when Sidebar is shown, **no Footer** (Aaron's pattern). The Sidebar's own footer panel carries sign-out + progress.

## Brand fidelity check (against engine Brand Reference)

Aaron's Sidebar CSS uses:
- `var(--color-fg-primary)`, `var(--color-fg-secondary)`, `var(--color-fg-muted)`, `var(--color-accent)` ✅ all match v2.2
- `var(--font-mono)` ✅
- Hardcoded `#bc1313` in `.sidebar-nav-badge` (red DM badge) — acceptable
- Hardcoded `#8b0e0e` in progress-bar gradient — acceptable
- Solid surfaces with linear-gradient `rgba(10,10,11,0.98) → rgba(7,7,8,0.99)` — close to `--surface` but slightly tighter

These will work correctly once Aaron's app.css globals land (final swap PR). Until then, the Sidebar's `var(--color-*)` references resolve to our **old** warm-gold tokens — which will look WRONG. **This is expected during the transition.**

## Risks + open questions

1. **Old app.css collision** — Sidebar uses brand tokens. Until app.css swap, `--color-accent` resolves to gold (#d1b27a) not red (#bc1313). The DM badge `#bc1313` will still be red (hardcoded), but the active-nav-item background `rgba(188, 19, 19, 0.1)` and other accent uses will look mismatched. **Acceptable transitional state per launch plan Option C.** Better: explicitly add `--color-accent` overrides in Sidebar's `<style>` block to scope-force the red here only. Decided against — keep faithful to Aaron's code so the final brand swap is mechanical.
2. **DM badge logic** — store stays at `0` until we port DmListener. Badge will never render at launch. Acceptable.
3. **`/profile` link** — only shown if paid member; the route is currently a 307 redirect to `/account` per PR #31. Sidebar shows both "Profile" → `/profile` AND "Training Profile" → `/account`. Both visible to paid members. That's an Aaron-canonical choice; preserve.
4. **`/admin/analytics` route** — Sidebar links to it but our repo may not have that subroute yet. Need to verify (or accept dead link for non-instructors).
5. **`SignOutButton` signature** — Aaron's takes `publishableKey` prop. Need to verify ours matches.

## Files touched in this port

- `src/lib/stores/dm-unread.ts` — new (8 lines)
- `static/cobra-logo.png` — copied from Aaron
- `src/lib/components/Sidebar.svelte` — new (~558 lines, ported)
- `src/routes/+layout.svelte` — modified (conditional Sidebar vs Nav)

## Verification plan

1. `pnpm check` — clean (zero new errors)
2. Visit `http://localhost:5173/dashboard` after signing in → Sidebar renders, Nav hidden
3. Visit `/` → Nav renders, Sidebar hidden
4. Visit `/login` → Nav renders, Sidebar hidden
5. Resize to <1024px → Sidebar collapses to 64px icon rail
6. Resize to <768px → Sidebar becomes bottom tab bar
