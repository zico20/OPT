$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Installing dependencies..."
npm install

Write-Host "Building production web app..."
npm run build:prod

Write-Host "Production preparation completed."
