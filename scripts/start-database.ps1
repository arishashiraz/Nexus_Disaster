param([string]$PgBin = 'C:\Program Files\PostgreSQL\15\bin')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataDir = "$root\.runtime\postgres"
if (-not (Test-Path "$PgBin\pg_ctl.exe")) { throw 'PostgreSQL not found. Supply -PgBin with the installed PostgreSQL bin directory.' }
New-Item -ItemType Directory -Force "$root\.runtime" | Out-Null
if (-not (Test-Path "$dataDir\PG_VERSION")) {
    & "$PgBin\initdb.exe" -D $dataDir -U nexus -A trust --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
}
& "$PgBin\pg_ctl.exe" -D $dataDir status *> $null
if ($LASTEXITCODE -ne 0) {
    & "$PgBin\pg_ctl.exe" -D $dataDir -l "$root\.runtime\postgres.log" -o '-p 55432 -h 127.0.0.1' start
    if ($LASTEXITCODE -ne 0) { throw 'Database startup failed. See .runtime/postgres.log.' }
}
$exists = & "$PgBin\psql.exe" -h 127.0.0.1 -p 55432 -U nexus -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='nexus'"
if ($exists -ne '1') { & "$PgBin\createdb.exe" -h 127.0.0.1 -p 55432 -U nexus nexus; if ($LASTEXITCODE -ne 0) { throw 'Could not create nexus database.' } }
Write-Host 'NEXUS demo database ready at 127.0.0.1:55432. Data is retained in .runtime/postgres.'
