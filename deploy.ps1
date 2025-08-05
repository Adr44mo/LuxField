# deploy.ps1

# don't forget to change the .env.render file before deploying!

Write-Host "=== Checking current scene configuration ==="
$mainTsContent = Get-Content "client\src\main.ts" -Raw
if ($mainTsContent -match "MenuSceneRefactored") {
    Write-Host "✓ Using MenuSceneRefactored"
} elseif ($mainTsContent -match "MenuScene") {
    Write-Host "✓ Using MenuScene"
} else {
    Write-Host "⚠ WARNING: No menu scene detected in main.ts"
}

Write-Host "=== Switching to deploy branch and syncing with main ==="
git checkout deploy
# Reset deploy branch to exactly match main
git reset --hard main

Write-Host "=== Building frontend for production ==="
cd client
npm install
# Build with production environment
npm run build

Write-Host "=== Copying frontend build to server/public ==="
cd ..
if (!(Test-Path "server/public")) { mkdir "server/public" }
Remove-Item -Recurse -Force server/public/*
Copy-Item -Recurse -Force client/dist/* server/public/

Write-Host "=== Adding and committing built files ==="
git add -f server/public
git commit -m "Deploy: update built frontend and sync with main"
# Force push to override remote deploy branch
git push --force-with-lease origin deploy

Write-Host "=== Deploy branch is up to date and ready for Render! ==="