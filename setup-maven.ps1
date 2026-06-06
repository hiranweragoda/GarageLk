# setup-maven.ps1
# This script downloads a portable Maven instance and sets it up in the .maven directory

$ErrorActionPreference = "Stop"

$TargetDir = Join-Path $PSScriptRoot ".maven"
$ZipPath = Join-Path $PSScriptRoot "maven.zip"
$MavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"

if (Test-Path (Join-Path $TargetDir "bin\mvn.cmd")) {
    Write-Host "[OK] Portable Maven is already set up in $TargetDir" -ForegroundColor Green
    exit 0
}

Write-Host "Creating directory: $TargetDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

Write-Host "Downloading portable Maven from $MavenUrl..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $MavenUrl -OutFile $ZipPath

Write-Host "Extracting Maven..." -ForegroundColor Cyan
# Extract to a temp directory first because Expand-Archive puts everything in a subfolder
$TempExtract = Join-Path $PSScriptRoot "maven_temp"
if (Test-Path $TempExtract) {
    Remove-Item -Recurse -Force $TempExtract
}
Expand-Archive -Path $ZipPath -DestinationPath $TempExtract

# Move the contents of the extracted folder to .maven
$ExtractedFolder = Get-ChildItem -Path $TempExtract | Select-Object -First 1
Move-Item -Path (Join-Path $ExtractedFolder.FullName "*") -Destination $TargetDir -Force

# Clean up
Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
Remove-Item -Force $ZipPath
Remove-Item -Recurse -Force $TempExtract

Write-Host "[SUCCESS] Portable Maven setup successfully completed in $TargetDir" -ForegroundColor Green
