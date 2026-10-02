$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$runDirectory = Join-Path $projectRoot ".codex-run"
$outputLog = Join-Path $runDirectory "server-output.log"
$errorLog = Join-Path $runDirectory "server-error.log"
$pidFile = Join-Path $runDirectory "server.pid"
$healthUrl = "http://127.0.0.1:4174/api/health"
$systemUrl = "http://127.0.0.1:4174/"

function Test-SystemHealth {
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $health.status -eq "ok" -and $health.service -eq "judicial-fees-api"
  }
  catch {
    return $false
  }
}

function Open-SystemBrowser {
  try {
    Start-Process $systemUrl
  }
  catch {
    Write-Host "Open this address in a browser: $systemUrl"
  }
}

Set-Location $projectRoot
New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null

if (Test-SystemHealth) {
  Open-SystemBrowser
  Write-Host "The system is running: $systemUrl"
  exit 0
}

$pnpmCommand = Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
if (-not $pnpmCommand) {
  $fallbackPnpm = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
  if (Test-Path -LiteralPath $fallbackPnpm) {
    $pnpmCommand = $fallbackPnpm
  }
}

if (-not $pnpmCommand) {
  Write-Error "pnpm was not found. Install Node.js 24 and pnpm, then try again."
  exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules"))) {
  Write-Host "Installing dependencies..."
  & $pnpmCommand install
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Dependency installation failed."
    exit 1
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "dist\web\index.html"))) {
  Write-Host "Building the system..."
  & $pnpmCommand run build
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Production build failed."
    exit 1
  }
}

Remove-Item -LiteralPath $outputLog -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $errorLog -Force -ErrorAction SilentlyContinue

$env:NODE_ENV = "production"
$env:PORT = "4174"
$env:JUDICIAL_FEES_ENABLE_DEMO_LOGIN = "true"
$env:JUDICIAL_FEES_JWT_SECRET = "judicial-fees-demo-only-secret-2026-change-before-live"
$env:JUDICIAL_FEES_PROJECT_MANAGER_ID = "demo-project-manager"

$serverCommand = '"{0}" start' -f $pnpmCommand
$serverProcess = Start-Process `
  -FilePath $env:ComSpec `
  -ArgumentList @("/d", "/c", $serverCommand) `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outputLog `
  -RedirectStandardError $errorLog `
  -PassThru

Set-Content -LiteralPath $pidFile -Value $serverProcess.Id -Encoding ASCII

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  if (Test-SystemHealth) {
    Open-SystemBrowser
    Write-Host "The system is running: $systemUrl"
    exit 0
  }

  if ($serverProcess.HasExited) {
    break
  }

  Start-Sleep -Milliseconds 500
}

Write-Error "The server did not become ready. Review $errorLog"
exit 1
