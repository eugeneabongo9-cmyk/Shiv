# Aaron Notes - 2026-06-09

Purpose: track Aaron's notes, decisions, and implementation scope for the June 2026 cleanup pass.

## Aaron Decisions

Aaron answered A for all 13 questions. The approved defaults are:

1. Remove all visible "Free User" / "Free Access" wording while keeping internal `free` tier code where needed.
2. Admins keep preview access to unfinished pages; normal members see Coming Soon.
3. Treat VIP Lounge as the current `/vip-calls` page for now.
4. Keep the Dashboard Live and Community cards, but make them clearly Coming Soon.
5. Dashboard resume uses best available course/module artwork now, with exact current title and progress.
6. Draft July 2026 Updates copy for Course 4, Course 5, Leaderboard, and ShivWorks Spotlight Episode 1.
7. Use "The Roadshow."
8. Use "ShivWorks Spotlights."
9. Treat The Roadshow and ShivWorks Spotlights as video series using the existing episode/progress/upload system.
10. Library first screen shows top-level cards: Training, The Roadshow, and ShivWorks Spotlights.
11. Show Roadshow and Spotlights before content is fully uploaded. The first Roadshow episode is ready, but the source can be resent if needed.
12. Admin upload dropdown includes planned/unreleased destinations so Aaron can stage videos ahead of release.
13. Restyle upload form dropdowns first.

## Implementation Scope

Already completed in the first fast pass:

- Removed visible free-access language.
- Gated unfinished member pages behind Coming Soon for non-admins.
- Changed Dashboard Live/Community cards to Coming Soon.
- Added draft July roadmap cards to Updates.
- Restyled admin upload form dropdowns.

Unlocked by Aaron's answers:

- Add ShivWorks Spotlight Episode 1 to July Updates.
- Add Roadshow and Spotlights as series records in the existing course/module/episode model.
- Include those series in admin upload destinations.
- Rework Library entry into Training, The Roadshow, and ShivWorks Spotlights lanes.
- Improve Dashboard resume so it reflects the actual current item and best available artwork.
