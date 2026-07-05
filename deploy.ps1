# JobSync Deployment Script (Windows / PowerShell)
# Usage: .\deploy.ps1 [branch-name]
# Example: .\deploy.ps1 main
# Example: .\deploy.ps1 develop
#
# PowerShell equivalent of deploy.sh, for Windows hosts without WSL/Git Bash.
# Requires: Docker Desktop and Git for Windows.

param([string]$Branch = "main")

$ErrorActionPreference = "Stop"
# We check $LASTEXITCODE for native commands, so don't let them auto-throw
# (PowerShell 7.3+ would otherwise abort the reachability retry loop).
$PSNativeCommandUseErrorActionPreference = $false

function Assert-LastExit($msg) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host $msg -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "JobSync Deployment Script" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Set-Location -Path $PSScriptRoot
Write-Host "[1/5] Current directory: $PSScriptRoot" -ForegroundColor Green
Write-Host ""

# Detect Docker Compose (v2 plugin or v1 standalone)
docker compose version *> $null
$UseV2 = ($LASTEXITCODE -eq 0)
if (-not $UseV2) {
    docker-compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Docker Compose not found" -ForegroundColor Red
        exit 1
    }
}

function Compose {
    if ($UseV2) { & docker compose @args } else { & docker-compose @args }
}

Write-Host "Using: $(if ($UseV2) { 'docker compose' } else { 'docker-compose' })" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository" -ForegroundColor Red
    exit 1
}

Write-Host "[2/5] Fetching latest changes from GitHub..." -ForegroundColor Green
git fetch origin
Assert-LastExit "git fetch failed"

Write-Host "[3/5] Checking out branch: $Branch" -ForegroundColor Green
git checkout $Branch
Assert-LastExit "git checkout failed"
git pull origin $Branch
Assert-LastExit "git pull failed"

Write-Host "[4/5] Stopping existing containers..." -ForegroundColor Green
Compose down
Assert-LastExit "docker compose down failed"

Write-Host "[5/5] Pulling latest images and starting containers..." -ForegroundColor Green
Compose pull
Assert-LastExit "docker compose pull failed"
Compose up -d --force-recreate
Assert-LastExit "docker compose up failed"

# Poll the app until it actually responds, so the success message below only
# prints once the app is reachable in a browser — not just "container started".
# The probe runs inside the container (busybox wget is always in the image),
# so the only host dependency is Docker itself. The loop exits the instant the
# app answers; the 5-minute deadline is only a ceiling for a boot that never
# comes up.
Write-Host "Waiting for app to become reachable..." -ForegroundColor Yellow
$deadline = (Get-Date).AddMinutes(5)
while ($true) {
    Compose exec -T app wget --spider -q http://127.0.0.1:3737 *> $null
    if ($LASTEXITCODE -eq 0) { break }
    if ((Get-Date) -ge $deadline) {
        Write-Host "App did not become reachable within 5 minutes." -ForegroundColor Red
        Compose logs --tail=40
        exit 1
    }
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Branch: $Branch" -ForegroundColor Yellow
Write-Host ""
Compose ps
