# restore-db.ps1
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

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

Write-Host "Restoring database ${postgresDb} in container ${dbContainer} from ${BackupFile}..." -ForegroundColor Green

# Drop and recreate database after terminating active sessions
docker exec -t $dbContainer psql -U $postgresUser -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${postgresDb}' AND pid <> pg_backend_pid();"
docker exec -t $dbContainer psql -U $postgresUser -d postgres -c "DROP DATABASE IF EXISTS $postgresDb;"
docker exec -t $dbContainer psql -U $postgresUser -d postgres -c "CREATE DATABASE $postgresDb;"

# Restore using pg_restore
docker exec -t $dbContainer pg_restore -U $postgresUser -d $postgresDb -v "/backups/$BackupFile"

Write-Host "Database restore completed successfully!" -ForegroundColor Green
