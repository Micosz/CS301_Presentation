#!/bin/sh
set -eu
cd "$(dirname "$0")"
command -v gh >/dev/null 2>&1 || { echo 'Install GitHub CLI, then run: gh auth login'; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'Run gh auth login before publishing.'; exit 1; }
if [ ! -d .git ]; then
  [ -f history.bundle ] || { echo 'Git history is missing.'; exit 1; }
  git init -b main
  git fetch history.bundle main
  git reset --mixed FETCH_HEAD
fi
if git remote get-url origin >/dev/null 2>&1; then
  echo 'Origin already exists; inspect the repository before publishing again.'
  exit 1
fi
gh repo create CS301_Presentation --public --source=. --remote=origin --description 'Interactive CS301 presentation: curriculum RAG methodology and evaluation plan'
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api --method POST "repos/$repo/pages" -f build_type=workflow
git push --set-upstream origin main
echo "https://github.com/$repo"
echo 'GitHub Actions will publish the slides after its workflow finishes.'
