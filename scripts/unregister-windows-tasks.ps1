$ErrorActionPreference = "SilentlyContinue"

$taskNames = @(
  "FireRisk-Web",
  "FireRisk-WorkerService",
  "FireRisk-DailyRun"
)

foreach ($taskName in $taskNames) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Write-Host "Scheduled tasks removed."
