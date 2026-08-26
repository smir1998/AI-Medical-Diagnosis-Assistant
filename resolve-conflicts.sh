#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# resolve-conflicts.sh
#
# Resolves EVERY merge conflict by keeping THIS branch's version of each
# conflicting file. Use this while a merge is in progress on your branch:
#
#     git fetch origin
#     git merge origin/main          # produces the conflicts
#     bash resolve-conflicts.sh      # branch content wins everywhere
#     git push
#
# Rationale for this repo: the working branch always carries the newest,
# complete console state; main only ever received earlier partial pushes.
# ---------------------------------------------------------------------------
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "✗ Not a git repository — run this from the project root." >&2
  exit 1
fi

if [ -z "$(git ls-files -u)" ]; then
  echo "No unmerged paths. Nothing to resolve — you're clean."
  exit 0
fi

count=0
while IFS= read -r -d '' f; do
  echo "  ← keeping this branch's version: $f"
  if [ -f "$f" ]; then
    git checkout --ours -- "$f"
    git add -- "$f"
  else
    # We deleted it on this branch — accept the deletion.
    git rm -q -- "$f" 2>/dev/null || git add -- "$f"
  fi
  count=$((count + 1))
done < <(git diff --name-only --diff-filter=U -z)

echo "Resolved $count conflicting file(s)."

if git commit --no-edit; then
  echo "✓ Merge committed."
  echo ""
  echo "Next:  git push"
else
  echo "✗ Commit failed — inspect with: git status" >&2
  exit 1
fi
