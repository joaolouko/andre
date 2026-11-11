$ErrorActionPreference = 'Stop'
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $baseDir 'mongo-data'

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  INICIANDO SISTEMA - GESTAO DE ESPACOS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

$apiEnv = Join-Path $baseDir 'api\.env'
if (-not (Test-Path $apiEnv)) {
    Write-Error 'Configure api\.env a partir de api\.env.example e defina JWT_SECRET.'
    exit 1
}

$mongoIsRunning = Test-NetConnection -ComputerName '127.0.0.1' -Port 27017 -InformationLevel Quiet
if (-not $mongoIsRunning) {
    $mongod = Get-Command mongod -ErrorAction SilentlyContinue
    if (-not $mongod) {
        Write-Error 'MongoDB não está ativo e mongod não foi encontrado no PATH. Inicie o serviço local ou instale o MongoDB Community Server.'
        exit 1
    }
    New-Item -ItemType Directory -Force -Path $dbPath | Out-Null
    $quotedDbPath = '"' + $dbPath + '"'
    Start-Process -FilePath $mongod.Source -ArgumentList @('--dbpath', $quotedDbPath, '--port', '27017') -WorkingDirectory $baseDir
    Start-Sleep -Seconds 3
} else {
    Write-Host 'MongoDB local já está ativo na porta 27017.' -ForegroundColor Green
}

Write-Host 'Iniciando API e frontend em modo de desenvolvimento...' -ForegroundColor Yellow
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-Command', 'npm run dev') -WorkingDirectory (Join-Path $baseDir 'api')
Start-Sleep -Seconds 2
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoExit', '-Command', 'npm run dev') -WorkingDirectory (Join-Path $baseDir 'frontend')

Write-Host ''
Write-Host 'Frontend:  http://localhost:3000' -ForegroundColor White
Write-Host 'API REST:  http://localhost:3001' -ForegroundColor White
Write-Host 'Swagger:   http://localhost:3001/api-docs' -ForegroundColor White
Write-Host 'Em base nova, execute npm run import-json na pasta api.' -ForegroundColor White
