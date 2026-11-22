# Gera backend/src/database/schema.sql a partir do banco Oracle.
# Uso (na raiz do projeto ou de qualquer lugar):
#   powershell -ExecutionPolicy Bypass -File backend\scripts\gerar-schema.ps1
# Requisitos: Docker em execução e a imagem da API construída (docker compose build).

$ErrorActionPreference = 'Stop'

$root   = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$src    = Join-Path $root 'backend\src'
$wallet = Join-Path $root 'backend\wallet'
$envFile = Join-Path $root '.env'
$image  = if ($env:API_IMAGE) { $env:API_IMAGE } else { 'continuum-main-api' }

if (-not (Test-Path $envFile)) { throw "Arquivo .env não encontrado em $root" }

docker run --rm `
    --env-file "$envFile" `
    -e TNS_ADMIN=/var/www/wallet `
    -v "${src}:/var/www/html" `
    -v "${wallet}:/var/www/wallet" `
    -w /var/www/html `
    $image php scripts/gerar_schema.php

exit $LASTEXITCODE

