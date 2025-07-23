Write-Host "=== Arrêt du backend et du frontend (processus npm run dev) ==="

# Arrête tous les processus npm (attention : cela arrêtera aussi d'autres npm run dev éventuels)
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*\\node.exe" } | Stop-Process -Force

Write-Host "=== Tous les serveurs LuxField sont arrêtés ==="