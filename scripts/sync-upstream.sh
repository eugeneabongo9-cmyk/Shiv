#!/usr/bin/env bash
# scripts/sync-upstream.sh
# Keep the fork's main in lockstep with upstream so wave branches stay mergeable.
# Ledger entry: 2026-05-26 · scripts/sync-upstream.{ps1,sh} — Upstream sync helper
# See .planning/LEDGER.md for why this exists and how it's invoked.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Not inside a git repository." >&2
  exit 1
fi
cd "$repo_root"

# Refuse to run on a dirty working tree.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash first." >&2
  git status --short >&2
  exit 1
fi

# Verify upstream remote exists.
if ! git remote | grep -qx upstream; then
  echo "No 'upstream' remote. Run:" >&2
  echo "  git remote add upstream https://github.com/createsomethingtoday/shivworks-network.git" >&2
  exit 1
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"

echo "→ Fetching upstream..."
git fetch upstream --quiet

echo "→ Checking out main..."
git checkout main --quiet

echo "→ Fast-forwarding main to upstream/main..."
git merge --ff-only upstream/main

echo "→ Pushing to origin..."
git push origin main --quiet

new_sha="$(git rev-parse --short HEAD)"
echo
echo "✓ Fork main is now at $new_sha (matches upstream/main)."

if [[ "$current_branch" != "main" ]]; then
  echo
  echo "Returning you to '$current_branch'."
  git checkout "$current_branch" --quiet
  echo "  Rebase onto the new main with:  git rebase main"
fi
