#!/bin/sh
# Fix volume ownership on every container start (volumes are root-owned by default)
mkdir -p /app/backups/archive
chown -R appuser:appgroup /app/storage /app/logs /app/backups 2>/dev/null || true
# Drop privileges and run the app
exec su-exec appuser dotnet CarShowroomManagementV2.API.dll
