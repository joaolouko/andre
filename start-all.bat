@echo off
setlocal
set "BASE_DIR=%~dp0"

echo ============================================================
echo   INICIANDO SISTEMA - GESTAO DE ESPACOS
echo ============================================================

if not exist "%BASE_DIR%api\.env" (
  echo ERRO: Configure api\.env a partir de api\.env.example e defina JWT_SECRET.
  pause
  exit /b 1
)

powershell -NoProfile -Command "if (Test-NetConnection 127.0.0.1 -Port 27017 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
if errorlevel 1 (
  where mongod >nul 2>&1
  if errorlevel 1 (
    echo ERRO: MongoDB nao esta ativo e mongod nao foi encontrado no PATH.
    echo Instale o MongoDB Community Server ou inicie o servico local.
    pause
    exit /b 1
  )
  if not exist "%BASE_DIR%mongo-data" mkdir "%BASE_DIR%mongo-data"
  echo Iniciando MongoDB local...
  start "MongoDB - Gestao de Espacos" cmd /k "mongod --dbpath ""%BASE_DIR%mongo-data"" --port 27017"
  timeout /t 3 /nobreak >nul
) else (
  echo MongoDB local ja esta ativo na porta 27017.
)

start "Backend API - Gestao de Espacos" cmd /k "cd /d ""%BASE_DIR%api"" && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend Next.js - Gestao de Espacos" cmd /k "cd /d ""%BASE_DIR%frontend"" && npm run dev"

echo ============================================================
echo   Frontend:  http://localhost:3000
echo   API REST:  http://localhost:3001
echo   Swagger:   http://localhost:3001/api-docs
echo   O banco deve conter dados via npm run import-json.
echo ============================================================
pause
