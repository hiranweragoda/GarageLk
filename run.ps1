# run.ps1
# This script ensures Maven is set up, then runs Maven commands (defaults to spring-boot:run)

$ErrorActionPreference = "Stop"

$MavenCmd = Join-Path $PSScriptRoot ".maven\bin\mvn.cmd"

if (-not (Test-Path $MavenCmd)) {
    Write-Host "Portable Maven not found. Initializing setup..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "setup-maven.ps1")
}

# Default argument is spring-boot:run if none provided
$ArgsList = $args
if ($ArgsList.Count -eq 0) {
    $ArgsList = @("spring-boot:run")
}

Write-Host "Running Maven command: mvn $ArgsList" -ForegroundColor Cyan
& $MavenCmd $ArgsList
