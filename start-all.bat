@echo off
echo ============================================================
echo   INICIANDO SISTEMA COMPLETO - GESTAO DE ESPACOS
echo ============================================================

echo [1/3] Iniciando MongoDB...
start "MongoDB - Gestao de Espacos" "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "%~dp0mongo-data" --port 27017
timeout /t 3 /nobreak >nul

echo [2/3] Iniciando Backend API (Porta 3001)...
start "Backend API - Gestao de Espacos" cmd /k "cd /d %~dp0api && npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Iniciando Frontend Next.js (Porta 3000)...
start "Frontend Next.js - Gestao de Espacos" cmd /k "cd /d %~dp0frontend && npm start"
timeout /t 2 /nobreak >nul

echo ============================================================
echo   SISTEMA INICIADO COM SUCESSO!
echo   Frontend:  http://localhost:3000
echo   API REST:  http://localhost:3001
echo   Swagger:   http://localhost:3001/api-docs
echo   Login:     joao@email.com / Senha: 123456
echo ============================================================
pause

