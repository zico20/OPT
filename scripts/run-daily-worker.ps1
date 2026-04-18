param(
  [string]$Date = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logsDir = Join-Path $repoRoot "logs"
$stdoutLog = Join-Path $logsDir "daily-run.out.log"
$stderrLog = Join-Path $logsDir "daily-run.err.log"
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
Set-Location $repoRoot
$env:NODE_ENV = "production"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $stdoutLog -Value "[$timestamp] Triggering daily worker run..."

if ([string]::IsNullOrWhiteSpace($Date)) {
  & $npm run run:worker 1>> $stdoutLog 2>> $stderrLog
} else {
  & $npm run run:worker -- --date=$Date 1>> $stdoutLog 2>> $stderrLog
}

$doneTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $stdoutLog -Value "[$doneTimestamp] Daily worker run completed."
