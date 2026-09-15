# Stops the portable PostgreSQL instance started by start-local.ps1.
# The app server itself just needs Ctrl+C in whichever window is running it (or close that window).

$toolsDir = "$HOME\tools"
& "$toolsDir\pgsql\bin\pg_ctl.exe" -D "$toolsDir\pgsql-data" stop -m fast
