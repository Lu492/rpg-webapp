 # Initializes the local Git repository and optionally pushes its first commit.
param(
  [string]$Remote = ''
)
Set-Location -Path $PSScriptRoot
if (Test-Path .git) {
  Write-Host ".git already exists in $PWD"
  exit 0
}
git init
git add --all
git commit -m "chore: initial commit for rpg-webapp"
Write-Host "Repository initialized and initial commit created."
if ($Remote) {
  git remote add origin $Remote
  git branch -M main
  git push -u origin main
}
