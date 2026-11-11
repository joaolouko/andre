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
)

echo Aguardando MongoDB local ficar pronto...
powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { if (Test-NetConnection 127.0.0.1 -Port 27017 -InformationLevel Quiet) { exit 0 }; Start-Sleep -Seconds 1 }; exit 1" >nul 2>&1
if errorlevel 1 (
  echo ERRO: MongoDB nao ficou pronto na porta 27017 em 30 segundos.
  pause
  exit /b 1
)

echo Importando dados de demonstracao e criando o usuario de login se ainda nao existir...
pushd "%BASE_DIR%api"
call npm run import-json
if errorlevel 1 (
  popd
  echo ERRO: A importacao falhou. Confira MongoDB, api\.env e os dados JSON.
  pause
  exit /b 1
)
popd

start "Backend API - Gestao de Espacos" cmd /k "cd /d ""%BASE_DIR%api"" && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend Next.js - Gestao de Espacos" cmd /k "cd /d ""%BASE_DIR%frontend"" && npm run dev"

echo ============================================================
echo   Frontend:  http://localhost:3000
echo   API REST:  http://localhost:3001
echo   Swagger:   http://localhost:3001/api-docs
echo   Login local: joao@email.com / 123456
echo   Troque a senha antes de qualquer uso real.
echo ============================================================
pause
