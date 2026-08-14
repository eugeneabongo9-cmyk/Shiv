#!/usr/bin/env bash
# scripts/snapshot-main.sh
# Tag origin/main as backup/main-YYYYMMDD-HHMM before any potentially destructive
# operation. See snapshot-main.ps1 for full rationale.
#
# Recover with:  git reset --hard backup/main-<timestamp>

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "Not inside a git repository." >&2
    exit 1
}
cd "$repo_root"

echo "→ Fetching origin..."
git fetch origin --quiet

timestamp="$(date +%Y%m%d-%H%M)"
tag_name="backup/main-${timestamp}"

main_sha="$(git rev-parse origin/main)"
echo "→ Tagging ${tag_name} at ${main_sha:0:7}..."
git tag -a "$tag_name" "$main_sha" -m "Snapshot of origin/main before sync at ${timestamp}"

echo "→ Pushing tag to origin..."
git push origin "$tag_name" --quiet

echo ""
echo "✓ Snapshot saved: ${tag_name} -> ${main_sha:0:7}"
echo "  Recover with:   git reset --hard ${tag_name}"
echo "  List snapshots: git tag -l 'backup/main-*'"
