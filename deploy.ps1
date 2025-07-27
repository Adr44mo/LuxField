# deploy.ps1

Write-Host "=== Switching to deploy branch and merging main ==="
git checkout deploy
git merge -s ours main
git checkout main -- .

Write-Host "=== Building frontend ==="
cd client
npm install
npm run build

Write-Host "=== Copying frontend build to server/public ==="
cd ..
if (!(Test-Path "server/public")) { mkdir "server/public" }
Remove-Item -Recurse -Force server/public/*
Copy-Item -Recurse -Force client/dist/* server/public/

Write-Host "=== Adding and committing built files ==="
git add -f server/public
git commit -m "Deploy: update built frontend and merge main"
git push origin deploy

Write-Host "=== Deploy branch is up to date and ready for Render! ==="