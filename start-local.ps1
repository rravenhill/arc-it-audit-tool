# Starts the portable PostgreSQL instance (if not already running) and the app server,
# using the portable Node.js/PostgreSQL installs under $HOME\tools (no admin rights needed).
# Run this from a PowerShell prompt in the project root: .\start-local.ps1

$ErrorActionPreference = "Stop"
$toolsDir = "$HOME\tools"
$env:PATH = "$toolsDir\node;" + $env:PATH

$pgStatus = & "$toolsDir\pgsql\bin\pg_ctl.exe" -D "$toolsDir\pgsql-data" status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting PostgreSQL on port 5433..."
    & "$toolsDir\pgsql\bin\pg_ctl.exe" -D "$toolsDir\pgsql-data" -l "$toolsDir\pgsql.log" -o "-p 5433" start
} else {
    Write-Host "PostgreSQL is already running."
}

Write-Host "Starting the app server on http://localhost:4000 ..."
Set-Location "$PSScriptRoot\server"
node src/index.js
