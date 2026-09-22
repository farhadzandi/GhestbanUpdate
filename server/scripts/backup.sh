#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
set -a
source ./.env
set +a
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "backups/ghestban-${STAMP}.dump"
find backups -type f -name 'ghestban-*.dump' -mtime +14 -delete
printf 'Created %s\n' "backups/ghestban-${STAMP}.dump"
