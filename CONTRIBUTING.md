# Team Git workflow (BrainBattle)

One shared repository: **https://github.com/miti1305/brainbattle** (owner: Moontaha).
Nobody forks it and nobody creates a separate repo. Everyone is a collaborator and pushes branches here.

## Golden rules

1. **Never commit directly to `main`.** Work on a feature branch, then open a Pull Request (PR).
2. **One branch per feature:** `feature/F16-admin-dashboard`, `feature/F1-quiz-battle`, `fix/F8-csv-import`.
3. **Commit messages start with the feature ID:** `F16: add user search endpoint`.
4. **Pull `main` before you start working each day.**
5. **Never commit `.env` or `node_modules/`.** They are in `.gitignore`. Check `git status` before committing.
6. **Only edit your own files** (see `docs/FEATURES.md`). For shared files, tell the team first.

## One-time setup

```bash
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
git clone https://github.com/miti1305/brainbattle.git
cd brainbattle
```
Then follow "First-time setup" in `README.md`.

## Daily workflow

```bash
# 1. Start from the latest main
git checkout main
git pull

# 2. Create your feature branch (first time only)
git checkout -b feature/F16-admin-dashboard
#    ...or switch back to it on later days
git checkout feature/F16-admin-dashboard
git merge main                # bring in teammates' latest work

# 3. Code, then save your work in small commits
git status                    # see what changed (make sure no .env!)
git add .
git commit -m "F16: add user search and role change endpoints"

# 4. Upload your branch
git push -u origin feature/F16-admin-dashboard   # first push
git push                                         # later pushes
```

## Merging into main (Pull Request)

1. On GitHub, click **Compare & pull request** (appears after you push).
2. **Base:** `main` ← **Compare:** your branch. Title: `F16: Admin dashboard - user management`.
3. Description: what you built, how to test it, screenshots if UI.
4. Add **one teammate as reviewer**. They check it runs and leave comments or approve.
5. Click **Merge pull request** → **Confirm** → **Delete branch**.
6. Everyone else: `git checkout main` then `git pull`.

If someone added npm packages, run `npm install` in `server/` or `client/` after pulling.

## Merge conflicts

They happen when two people changed the same lines.

```bash
git checkout feature/your-branch
git merge main
```
VS Code highlights conflicts with **Accept Current / Accept Incoming / Accept Both**. Choose the right one,
make sure the code still runs, then:
```bash
git add .
git commit -m "F16: merge main and resolve conflicts"
git push
```
If unsure, ask the person who wrote the other change.

## Sprint tags (evidence for sprint reviews)

At the end of each sprint, the repo owner tags `main`:
```bash
git checkout main
git pull
git tag sprint-1
git push origin sprint-1
```

## Protecting main (optional)

GitHub only allows branch protection on **private** repos with GitHub Pro. Students get Pro free through
the **GitHub Student Developer Pack** (education.github.com/pack). With it: **Settings → Branches →
Add rule → `main` → Require a pull request before merging**. Without it, follow rule 1 as a team agreement.

## Useful commands

| Command | Meaning |
|---|---|
| `git status` | What changed |
| `git branch` | Which branch you're on |
| `git log --oneline -10` | Last 10 commits |
| `git diff` | Exact changes not yet committed |
| `git restore <file>` | Throw away uncommitted changes to a file |
| `git stash` / `git stash pop` | Put changes aside / bring them back |
