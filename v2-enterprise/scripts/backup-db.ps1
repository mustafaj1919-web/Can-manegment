# backup-db.ps1
# Load environment variables from .env
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split('=', 2)
            if ($parts.Count -eq 2) {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
            }
        }
    }
}

$dbContainer = [System.Environment]::GetEnvironmentVariable("DB_CONTAINER")
if (-not $dbContainer) { $dbContainer = "v2-postgres-db" }

$postgresUser = [System.Environment]::GetEnvironmentVariable("POSTGRES_USER")
if (-not $postgresUser) { $postgresUser = "postgres" }

$postgresDb = [System.Environment]::GetEnvironmentVariable("POSTGRES_DB")
if (-not $postgresDb) { $postgresDb = "CarShowroomV2" }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFilename = "backup_${postgresDb}_${timestamp}.dump"

Write-Host "Starting PostgreSQL backup for container: ${dbContainer}..." -ForegroundColor Green
docker exec -t $dbContainer pg_dump -U $postgresUser -F c -b -v -f "/backups/$backupFilename" $postgresDb

Write-Host "Backup completed successfully! File saved: backups/$backupFilename" -ForegroundColor Green
