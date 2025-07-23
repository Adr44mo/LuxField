Write-Host "=== Installation des dépendances backend ==="
cd server
npm install

Write-Host "=== Lancement du backend (nouvelle fenêtre) ==="
Start-Process powershell -ArgumentList 'npm run dev' -WorkingDirectory $PWD

Write-Host "=== Installation des dépendances frontend ==="
cd ../client
npm install

Write-Host "=== Lancement du frontend (nouvelle fenêtre) ==="
Start-Process powershell -ArgumentList '-NoExit', 'npm run dev' -WorkingDirectory $PWD

cd ..

Write-Host "=== Tout est lancé ! ==="