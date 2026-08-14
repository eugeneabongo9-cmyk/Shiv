# Port Audit — Member Surfaces (scoping pass)

**Canonical:** `shivworks-design/` — the self-contained standalone handoff, "ShivWorks 3".
All 15 pages present as of 2026-08-13. Verified against the shipped design system:
`--color-accent: #bc1313` and the full token set are identical to `src/app.css`.
**Audited by:** suzuki · 2026-08-13
**Purpose:** decide whether the member UI needs a port round, and how large.

---

## Method, and a correction

Class-inventory diff, design against shipped, resolving local `$lib/**/*.svelte` imports
recursively so pages that compose components are not undercounted.

**Two extraction mistakes were made before these numbers were trusted. Both are recorded
because either one alone produces a confidently wrong answer.**

1. **Comparing a design page against its route file alone.** `/library` and the course
   player delegate markup to `LibraryCatalog`, `CoursePlayerSidebar`, `CourseStreamPlayer`.
   Reading only the route file made `/library` look like 4 classes against 15.
2. **Reading only `<main>` in the handoff.** The handoff builds most of its markup from
   JavaScript string concatenation, so `<main>` is close to an empty shell. This
   _undercounted the design side_ on six of seven pages — `admin.html` measured 2 classes
   when it actually has 122 — and produced the false conclusion that the shipped app was
   already ahead of the designs everywhere.

The figures below join the JS string concatenation, unescape quoting, and scan the whole
document. Shared shell classes (sidebar, footer, nav, user card) are excluded from the gap
so each number reflects page-level work only.

---

## Result

| Surface   | design | shipped | page-level gap |
| --------- | -----: | ------: | -------------: |
| dashboard |     91 |      57 |          **5** |
| landing   |     73 |      94 |          **8** |
| community |     74 |      56 |         **18** |
| course    |     88 |      70 |         **22** |
| updates   |     77 |      31 |         **23** |
| library   |     92 |      52 |         **30** |
| admin     |    122 |      86 |         **61** |

Dashboard and landing are effectively at parity. The rest have real gaps.

---

## What the gaps are

### Do not port — mockup stand-ins

`media-ph`, `media-ph-inner`, `media-ph-label` appear in five of seven gaps. In the handoff
they render a grey box captioned `[ Course thumbnail — Managing Unknown Contacts ]` — the
designer marking where an image belongs. Shipped pages already render real artwork through
`CourseThumbnail` / `TrailerTile` with a proper coming-soon state. Porting these would
replace working images with placeholder text. `hero-tape` on the landing page is the same.

### Nothing to write — already present

`play-badge`, `live-dot` and `brass` are missing from some pages but used correctly on
`/live`, and **all three rules already exist in `app.css`**. Generic utility classes in the
gap lists (`accent`, `tag`, `muted`, `count`, `active`, `btn`, `row-header`) are likewise
defined already and simply applied differently.

### Real work, by surface

- **updates — the whole feed.** `upd-rail`, `upd-list`, `upd-group`, `upd-group-label`,
  `upd-item`, `upd-thumb`, `upd-icon`, `upd-body`, `upd-text`, `upd-meta`, `upd-time`,
  `upd-cta`, plus a `upd-tabs` / `upd-tab` filter strip. Shipped has 31 classes against 77.
  This is a genuine build, not a restyle.
- **library — grouped catalog.** `lib-group`, `lib-group-head`, `lgh-*`, `lib-grid`,
  `lib-jump`, `lib-empty`, `lib-admin-cta`, course cards `cc-top` / `cc-body` / `cc-status` /
  `cc-new`, status pills `ready` / `soon` / `scheduled`, and `resume-panel`.
- **course — module list and instructor.** `mi-title` / `mi-body` / `mi-meta` / `mi-state`
  with `current` / `done` / `locked` states, plus an instructor byline (`avatar`,
  `instructor`, `role`, `who`) that has no data source — `courses` carries no instructor
  field today.
- **community — in-app messaging.** `msg-*`, member list `member` / `m-name` / `m-rank`,
  `composer*`, `pinned`, `lock`. `/community` currently links out to Circle, so this is a
  product decision before it is a port.
- **admin — 61 classes.** Tab shell (`adm-*`), content management (`cm-*`), member table
  (`mbr-*`, `col-*`), roadshow grid (`road-*`), kebab menus, a document library (`doc-ext`)
  and a support ticket surface (`ticket`, `tk-*`). Note the drag-and-drop upload
  (`dropzone`, `dz-*`) is **already shipped** — that is Denis's work.

### One architectural decision, not a port

`player-bar` with `pb-btn` / `pb-fill` / `pb-knob` / `pb-time` / `pb-track` is a custom video
scrubber. The shipped player embeds Cloudflare Stream's iframe, which supplies its own
controls and cannot be overlaid. Reproducing the design here means replacing the Stream embed
outright and forfeiting signed-URL playback — the mechanism that protects paid content and
was only just proven working. Recommend against; needs an explicit owner decision either way.

---

## Conclusion

There is a real port round here — larger than the previous revision of this document claimed,
and concentrated in Updates, Library and the admin console rather than spread evenly.

Ranked by genuine page-level gap: **admin (61) → library (30) → updates (23) → course (22) →
community (18) → landing (8) → dashboard (5)**.

Dashboard and landing need almost nothing. Community is mostly a product question. The
course page's number is inflated by the player decision above.
