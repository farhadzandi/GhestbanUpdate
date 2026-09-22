#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then echo "Usage: $0 backups/ghestban-YYYYMMDDTHHMMSSZ.dump"; exit 2; fi
FILE="$1"
[ -f "$FILE" ] || { echo "Backup not found: $FILE"; exit 3; }
cd "$(dirname "$0")/.."
set -a
source ./.env
set +a
read -r -p "This replaces the Ghestban database contents. Type RESTORE: " CONFIRM
[ "$CONFIRM" = "RESTORE" ] || { echo "Cancelled"; exit 4; }
docker compose exec -T db dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
docker compose exec -T db createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$FILE"
echo "Restore completed."
