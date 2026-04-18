$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $repoRoot "logs"
$stdoutLog = Join-Path $logsDir "worker.out.log"
$stderrLog = Join-Path $logsDir "worker.err.log"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
Set-Location $repoRoot
$env:NODE_ENV = "production"

while ($true) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $stdoutLog -Value "[$timestamp] Starting worker service..."
  & $npm run start:worker 1>> $stdoutLog 2>> $stderrLog
  $exitTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $stderrLog -Value "[$exitTimestamp] Worker service exited. Restarting in 5 seconds."
  Start-Sleep -Seconds 5
}
