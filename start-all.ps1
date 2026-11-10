# Script para iniciar todo o ambiente do Gestao de Espacos
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SISTEMA COMPLETO - GESTAO DE ESPACOS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. MongoDB
Write-Host "`n[1/3] Iniciando MongoDB local..." -ForegroundColor Yellow
Start-Process -FilePath "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" -ArgumentList "--dbpath `"$baseDir\mongo-data`" --port 27017" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 2. Backend API
Write-Host "[2/3] Iniciando Backend API (Porta 3001)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$baseDir\api`" && npm start"
Start-Sleep -Seconds 3

# 3. Frontend Next.js
Write-Host "[3/3] Iniciando Frontend (Porta 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$baseDir\frontend`" && npm start"
Start-Sleep -Seconds 2

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API REST:  http://localhost:3001" -ForegroundColor White
Write-Host "  Swagger:   http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "  Login:     joao@email.com / Senha: 123456" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green

