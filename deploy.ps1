# Deploys the Arc IT Audit Tool on a new machine, or updates an existing deployment.
#
# What it does:
#   1. Clones the repo (first run) or pulls the latest changes (later runs).
#   2. Installs a portable, no-admin-rights Node.js and PostgreSQL under $HOME\tools,
#      matching the setup documented in README.md - skipped if already present.
#   3. Initialises a PostgreSQL cluster on port 5433 and creates the it_audit database,
#      if they don't already exist.
#   4. Creates server\.env from server\.env.example if missing.
#   5. Runs `npm install` and the database migration.
#   6. Builds the client for production use.
#
# Usage (first time, on a new machine):
#   .\deploy.ps1
#
# Usage (pull latest + reinstall deps + migrate on a machine that already has it):
#   .\deploy.ps1 -ProjectDir "C:\Users\me\arc-it-audit-tool"
#
# Safe to re-run any time - every step is skipped if already done.

param(
    [string]$RepoUrl = "https://github.com/rravenhill/arc-it-audit-tool.git",
    [string]$ProjectDir = "$HOME\arc-it-audit-tool",
    [string]$Branch = "master",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$toolsDir = "$HOME\tools"
$nodeDir = "$toolsDir\node"
$pgDir = "$toolsDir\pgsql"
$pgDataDir = "$toolsDir\pgsql-data"
$pgPort = 5433
$pgSuperPassword = "postgres"
$dbName = "it_audit"

# Pinned portable PostgreSQL build. If this link goes stale, grab the current
# Windows x86-64 "binaries" zip from https://www.enterprisedb.com/download-postgresql-binaries
# and re-pin the URL below.
$pgZipUrl = "https://get.enterprisedb.com/postgresql/postgresql-17.11-3-windows-x64-binaries.zip"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# --- 0. Prerequisite: git must already be installed and on PATH -------------

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git is not installed or not on PATH. Install Git for Windows (https://git-scm.com/download/win) and re-run this script."
}

# --- 1. Clone or pull the repository ----------------------------------------

Write-Step "Getting the latest code"

if (Test-Path "$ProjectDir\.git") {
    Write-Host "Existing checkout found at $ProjectDir - pulling latest changes."
    git -C $ProjectDir fetch origin
    git -C $ProjectDir checkout $Branch
    git -C $ProjectDir pull origin $Branch
} else {
    Write-Host "Cloning $RepoUrl into $ProjectDir"
    git clone --branch $Branch $RepoUrl $ProjectDir
}

# --- 2. Portable Node.js -----------------------------------------------------

if (Test-Path "$nodeDir\node.exe") {
    $nodeVersion = & "$nodeDir\node.exe" --version
    Write-Step "Node.js already installed ($nodeVersion) - skipping"
} else {
    Write-Step "Installing portable Node.js"

    $listing = Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/latest-v24.x/"
    $zipName = ($listing.Links.href | Where-Object { $_ -match '^node-v[\d.]+-win-x64\.zip$' } | Select-Object -First 1)
    if (-not $zipName) {
        throw "Could not determine the latest Node.js win-x64 zip filename from nodejs.org. Check https://nodejs.org/dist/latest-v24.x/ manually."
    }

    $nodeZipUrl = "https://nodejs.org/dist/latest-v24.x/$zipName"
    $nodeZipPath = "$env:TEMP\$zipName"
    Write-Host "Downloading $nodeZipUrl"
    Invoke-WebRequest -UseBasicParsing -Uri $nodeZipUrl -OutFile $nodeZipPath

    $extractDir = "$env:TEMP\node-extract"
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    Expand-Archive -Path $nodeZipPath -DestinationPath $extractDir

    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $extractedNodeFolder = Get-ChildItem $extractDir | Select-Object -First 1
    Move-Item $extractedNodeFolder.FullName $nodeDir

    Remove-Item -Force $nodeZipPath
    Remove-Item -Recurse -Force $extractDir

    Write-Host "Node.js installed: $(& "$nodeDir\node.exe" --version)"
}

$env:PATH = "$nodeDir;" + $env:PATH

# --- 3. Portable PostgreSQL --------------------------------------------------

if (Test-Path "$pgDir\bin\pg_ctl.exe") {
    Write-Step "PostgreSQL already installed - skipping"
} else {
    Write-Step "Installing portable PostgreSQL"

    $pgZipPath = "$env:TEMP\postgresql-binaries.zip"
    Write-Host "Downloading $pgZipUrl (this is a large file, may take a while)"
    Invoke-WebRequest -UseBasicParsing -Uri $pgZipUrl -OutFile $pgZipPath

    $extractDir = "$env:TEMP\pgsql-extract"
    if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
    Expand-Archive -Path $pgZipPath -DestinationPath $extractDir

    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $pgCtlMatch = Get-ChildItem -Recurse -Path $extractDir -Filter "pg_ctl.exe" | Select-Object -First 1
    if (-not $pgCtlMatch) {
        throw "Downloaded PostgreSQL zip did not contain pg_ctl.exe - check $pgZipUrl is still valid."
    }
    $extractedPgFolder = $pgCtlMatch.Directory.Parent.FullName
    Move-Item $extractedPgFolder $pgDir

    Remove-Item -Force $pgZipPath
    Remove-Item -Recurse -Force $extractDir

    Write-Host "PostgreSQL installed: $(& "$pgDir\bin\pg_ctl.exe" --version)"
}

# --- 4. Initialise the database cluster (first run only) --------------------

if (Test-Path "$pgDataDir\PG_VERSION") {
    Write-Step "PostgreSQL data directory already initialised - skipping"
} else {
    Write-Step "Initialising PostgreSQL data directory on port $pgPort"

    $pwFile = New-TemporaryFile
    Set-Content -Path $pwFile -Value $pgSuperPassword -NoNewline
    try {
        & "$pgDir\bin\initdb.exe" -D $pgDataDir -U postgres "--pwfile=$pwFile"
    } finally {
        Remove-Item -Force $pwFile
    }
}

# --- 5. Start PostgreSQL if it isn't already running -------------------------

Write-Step "Starting PostgreSQL"

& "$pgDir\bin\pg_ctl.exe" -D $pgDataDir status > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    & "$pgDir\bin\pg_ctl.exe" -D $pgDataDir -l "$toolsDir\pgsql.log" -o "-p $pgPort" start
    Start-Sleep -Seconds 2
} else {
    Write-Host "Already running."
}

# --- 6. Create the database if it doesn't exist ------------------------------

Write-Step "Ensuring database '$dbName' exists"

$env:PGPASSWORD = $pgSuperPassword
$exists = & "$pgDir\bin\psql.exe" -h 127.0.0.1 -p $pgPort -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$dbName'"
if ($exists -eq "1") {
    Write-Host "Database already exists."
} else {
    & "$pgDir\bin\createdb.exe" -h 127.0.0.1 -p $pgPort -U postgres $dbName
    Write-Host "Database created."
}
Remove-Item Env:\PGPASSWORD

# --- 7. server\.env -----------------------------------------------------------

$envPath = "$ProjectDir\server\.env"
if (Test-Path $envPath) {
    Write-Step "server\.env already present - skipping"
} else {
    Write-Step "Creating server\.env"
    @(
        "PORT=4000"
        "DATABASE_URL=postgres://postgres:$pgSuperPassword@localhost:$pgPort/$dbName"
        "UPLOADS_DIR=./uploads"
    ) | Set-Content -Path $envPath
}

# --- 8. Install dependencies --------------------------------------------------

Write-Step "Installing npm dependencies"
Set-Location $ProjectDir
& "$nodeDir\npm.cmd" install

# --- 9. Run database migrations ------------------------------------------------

Write-Step "Running database migrations"
& "$nodeDir\npm.cmd" run db:migrate

# --- 10. Build the client for production --------------------------------------

if ($SkipBuild) {
    Write-Step "Skipping client build (-SkipBuild passed)"
} else {
    Write-Step "Building client"
    & "$nodeDir\npm.cmd" run build
}

Write-Host ""
Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "Project directory: $ProjectDir"
Write-Host ""
Write-Host "To start the app day-to-day:"
Write-Host "  cd `"$ProjectDir`""
Write-Host "  .\start-local.ps1"
Write-Host "Then open http://localhost:4000"
