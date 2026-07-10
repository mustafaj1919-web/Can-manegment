#!/bin/bash
# Exit on error
set -e

# Load environment variables if .env exists
if [ -f ../.env ]; then
  export $(cat ../.env | grep -v '^#' | xargs)
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DB_CONTAINER=${DB_CONTAINER:-v2-postgres-db}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-CarShowroomV2}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="backup_${POSTGRES_DB}_${TIMESTAMP}.dump"

echo "Starting PostgreSQL backup for container: ${DB_CONTAINER}..."
docker exec -t ${DB_CONTAINER} pg_dump -U ${POSTGRES_USER} -F c -b -v -f "/backups/${BACKUP_FILENAME}" ${POSTGRES_DB}

echo "Backup completed successfully! File saved: backups/${BACKUP_FILENAME}"

# Automatically delete backups older than 7 days to conserve disk space
BACKUPS_DIR="$(cd "$(dirname "$0")/../backups" && pwd 2>/dev/null || echo "/home/mustafa/can-management/backups")"
if [ -d "$BACKUPS_DIR" ]; then
  echo "Pruning backups older than 7 days in $BACKUPS_DIR..."
  find "$BACKUPS_DIR" -type f -name "backup_*.dump" -mtime +7 -delete
fi
