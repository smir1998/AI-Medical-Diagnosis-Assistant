# Resolving the branch merge conflict

GitHub shows *"Merge cannot be cleanly created"* because the branch and `main`
both changed the same files (README.md, `package-lock.json`, the Pages workflow,
and parts of `src/`). The web conflict editor struggles with generated files
like `package-lock.json` — use one of the three options below instead.

## First: see exactly what conflicts

On the PR page GitHub lists **"Conflicting files: N"** under the merge box.
Locally:

```bash
git fetch origin
git checkout <your-branch>
git merge origin/main
git diff --name-only --diff-filter=U   # every conflicting path
```

## Option A — keep the branch (recommended)

Your branch carries the newest, complete console state, so let **every
conflicting file take the branch version**:

```bash
bash resolve-conflicts.sh   # resolves all conflicts, commits the merge
git push
```

The PR flips to mergeable immediately.

## Option B — nuclear, fastest (personal repo)

If `main` has nothing you need beyond what the branch already contains,
point `main` at the branch and close the PR as merged-in-spirit:

```bash
git fetch origin
git checkout main
git reset --hard origin/<your-branch>
git push --force-with-lease origin main
```

Force-pushing `main` on a personal portfolio repo is fine.

## Option C — regenerate the lockfile only

If `package-lock.json` is the stubborn file, don't hand-merge its markers:

```bash
git checkout --ours package-lock.json   # or --theirs
rm package-lock.json
npm install                             # regenerate it cleanly
git add package-lock.json
git commit --no-edit
git push
```

## After resolving

The **Deploy to GitHub Pages** workflow runs automatically on the push.
If it fails with a Pages 404, enable Pages once:
**Settings → Pages → Source → "GitHub Actions"**.
