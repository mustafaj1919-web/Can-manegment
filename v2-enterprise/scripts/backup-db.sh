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
