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

if [ -z "$1" ]; then
  echo "Error: Please specify the backup filename."
  echo "Usage: ./restore-db.sh <backup_filename_in_backups_folder>"
  exit 1
fi

BACKUP_FILE=$1

echo "Restoring database ${POSTGRES_DB} in container ${DB_CONTAINER} from ${BACKUP_FILE}..."

# Drop and recreate schema or restore directly
docker exec -t ${DB_CONTAINER} psql -U ${POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
docker exec -t ${DB_CONTAINER} psql -U ${POSTGRES_USER} -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec -t ${DB_CONTAINER} psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

# Restore database
docker exec -t ${DB_CONTAINER} pg_restore -U ${POSTGRES_USER} -d ${POSTGRES_DB} -v "/backups/${BACKUP_FILE}"

echo "Database restore completed successfully!"
