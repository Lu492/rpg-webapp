#!/usr/bin/env bash
# Initialize a git repo for the rpg-webapp folder and make initial commit.
set -e
cd "$(dirname "$0")"
if [ -d .git ]; then
  echo ".git already exists in $(pwd)"
  exit 0
fi
git init
git add --all
git commit -m "chore: initial commit for rpg-webapp"
echo "Repository initialized and initial commit created."
echo "To add a remote and push:"
echo "  git remote add origin <your-remote-url>"
echo "  git branch -M main"
echo "  git push -u origin main"
