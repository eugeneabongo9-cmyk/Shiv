"""
Seed system41.db with the 2026-05-31 hyper-focused launch plan + Phase 2
connect-real-pages plan.

Two what_items + linked how_items per phase. Idempotent on the title prefix
'[LAUNCH-2026-06-01]'.

Phase 1 = WHAT #470 — hyper-focused launch (12 sub-tasks as how_items)
Phase 2 = WHAT #471 — connect real member pages (7 sub-tasks as how_items)

Both go against project_id=6 (shivworks). Other future phases (3-5) live
in AARON-RECONCILE.md and stay there until phase 2 is shipped.
"""

import json
import os
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

DB = r"C:/Users/maxrs/.claude/skills/project/data/system41.db"
PROJECT_ID = 6
PHASE_TAG = "launch-2026-06-01"


def tag_json(*tags: str) -> str:
    return json.dumps(list(tags))


PHASE1 = {
    "title": "[LAUNCH-2026-06-01] Phase 1 · Hyper-focused launch — brand shell + ComingSoon gating",
    "description": (
        "Minimum-viable visible launch. Pull Aaron's brand shell (app.html, "
        "app.css, landing, Nav, Footer) and replace every member-only route "
        "with a ComingSoon placeholder. Outcome: a member can land, see Aaron's "
        "brand, click Bronze/VIP, complete checkout on shivworkspg.com, get "
        "provisioned via webhook, sign in, and see a coherent 'you're in, more "
        "coming soon' experience. Estimated 2 hrs 20 min focused work."
    ),
    "priority": "high",
    "tags": tag_json(
        "lane:app",
        "craft:engineering",
        "phase:00",
        "owner:max",
        PHASE_TAG,
        "scope:hyper-focused",
    ),
    "hows": [
        {"q": "Clone Aaron's repo locally + diff app.html/app.css/landing", "a": "Clone aaron-outerfields/shivworks-demo to E:/dev/clients/outerfields/shivworks-demo. Diff shell files. ~10 min."},
        {"q": "Pull src/app.html from Aaron's repo", "a": "Copy file as-is; verify vite still boots. ~5 min."},
        {"q": "Pull src/app.css from Aaron's repo", "a": "Resolve token name collisions by keeping his version. Verify landing reflects new palette. ~15 min."},
        {"q": "Pull src/routes/+page.svelte (landing) from Aaron's repo", "a": "Keep our +page.server.ts (cache headers harmless). ~10 min."},
        {"q": "Pull Nav.svelte + Footer.svelte from Aaron's repo", "a": "Drop into src/lib/components/; reconcile +layout.svelte. ~25 min."},
        {"q": "Verify /checkout still works", "a": "Click Bronze → redirect to shivworkspg.com/checkout/?add-to-cart=31517. ~5 min."},
        {"q": "Replace 13 member-only routes with ComingSoon", "a": "/account /dashboard /library /community /people /find-partners /leaderboard /messages /profile /live /vip-calls /updates /settings → use existing ComingSoon component. Keep server-side auth gates. ~25 min."},
        {"q": "Style /login and /signup", "a": "Inherit new app.css; verify Clerk widgets pick up parent shell. ~10 min."},
        {"q": "Update /welcome to ComingSoon for 'next steps' section", "a": "Provisioning + welcome message stays; collapse 'click here to do X' to 'more coming this week'. ~10 min."},
        {"q": "Local smoke pass", "a": "Hard-refresh / → click Bronze (verify redirect URL) → visit /welcome → /dashboard → see ComingSoon. ~10 min."},
        {"q": "PR + merge to main", "a": "Single PR titled feat(launch): hyper-focused brand-shell + coming-soon gating. ~10 min."},
        {"q": "Update AARON-UNBLOCKERS.md + GO-LIVE-RUNBOOK.md", "a": "Note Phase 2 reconcile follows; link to AARON-RECONCILE.md phases. ~5 min."},
    ],
}


PHASE2 = {
    "title": "[LAUNCH-2026-06-01] Phase 2 · Connect real member pages (account, dashboard, finder, library)",
    "description": (
        "Post-launch immediate upgrade. Swap the ComingSoon placeholders on "
        "the highest-impact post-signin routes with Aaron's real implementations. "
        "Order is optimized for first-login UX: /account first (it's where /welcome "
        "routes), then /dashboard, then /find-partners, then /library. Validates "
        "the full revenue path end-to-end. Estimated ~5 hrs focused work."
    ),
    "priority": "high",
    "tags": tag_json(
        "lane:app",
        "craft:engineering",
        "phase:01",
        "owner:max",
        PHASE_TAG,
        "scope:connect-real-pages",
    ),
    "hows": [
        {"q": "Replace /account ComingSoon with Aaron's training-profile form", "a": "Server load + form actions + writes to member_profiles via migration 0013. ~60 min."},
        {"q": "Replace /dashboard ComingSoon with Aaron's real dashboard shell", "a": "Member summary, tier-gated content cards, gamification widget hook. ~75 min."},
        {"q": "Wire GamificationWidget.svelte into dashboard", "a": "Use existing getGamificationForMember export; data already in member_gamification table from migration 0011. ~20 min."},
        {"q": "Replace /find-partners ComingSoon with Aaron's real finder", "a": "Server load + filter UI + member_profiles query. ~75 min."},
        {"q": "Replace /library ComingSoon with course catalog", "a": "Remove ComingSoon wrapper; re-attach to courses + course_modules + course_module_episodes tables (migration 0008). ~45 min."},
        {"q": "End-to-end revenue path validation against staging", "a": "WC test order → webhook → imported_member_provisions row → user signs in → ensureMemberIdentity claims provision → tier active → dashboard shows tier-correct content. ~30 min."},
        {"q": "Update AARON-UNBLOCKERS.md + GO-LIVE-RUNBOOK.md", "a": "Mark Phase 2 routes as real; surface Phases 3-5 from AARON-RECONCILE.md for the post-Phase-2 backlog. ~10 min."},
    ],
}


def main():
    if not os.path.exists(DB):
        print(f"DB not found: {DB}")
        sys.exit(1)
    db = sqlite3.connect(DB)
    db.execute("PRAGMA foreign_keys = ON")

    existing = db.execute(
        "SELECT COUNT(*) FROM what_items WHERE project_id=? AND title LIKE ?",
        (PROJECT_ID, "[LAUNCH-2026-06-01]%"),
    ).fetchone()[0]
    if existing > 0:
        print(f"SKIP — {existing} launch-2026-06-01 what_items already exist.")
        db.close()
        return

    for phase in (PHASE1, PHASE2):
        cur = db.execute(
            """INSERT INTO what_items (project_id, title, description, status, priority, tags)
               VALUES (?, ?, ?, 'planned', ?, ?)""",
            (PROJECT_ID, phase["title"], phase["description"], phase["priority"], phase["tags"]),
        )
        what_id = cur.lastrowid
        print(f"WHAT #{what_id}  {phase['title'][:80]}")
        for h in phase["hows"]:
            db.execute(
                """INSERT INTO how_items (what_id, project_id, question, answer, status, tags)
                   VALUES (?, ?, ?, ?, 'open', ?)""",
                (what_id, PROJECT_ID, h["q"], h["a"], phase["tags"]),
            )
            print(f"  HOW  {h['q'][:80]}")

    db.commit()
    db.close()
    print()
    print("Done. 2 phases + 19 linked how_items inserted.")


if __name__ == "__main__":
    main()
