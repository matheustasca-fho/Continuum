#!/usr/bin/env sh
# Gera backend/src/database/schema.sql a partir do banco Oracle.
# Uso: ./backend/scripts/gerar-schema.sh
# Requisitos: Docker em execução e a imagem da API construída (docker compose build).
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IMAGE="${API_IMAGE:-continuum-main-api}"

docker run --rm \
  --env-file "$ROOT/.env" \
  -e TNS_ADMIN=/var/www/wallet \
  -v "$ROOT/backend/src:/var/www/html" \
  -v "$ROOT/backend/wallet:/var/www/wallet" \
  -w /var/www/html \
  "$IMAGE" php scripts/gerar_schema.php
