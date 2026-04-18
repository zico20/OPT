$ErrorActionPreference = "Stop"

$scriptsDir = $PSScriptRoot
$webScript = Join-Path $scriptsDir "start-web-prod.ps1"
$workerScript = Join-Path $scriptsDir "start-worker-prod.ps1"
$dailyScript = Join-Path $scriptsDir "run-daily-worker.ps1"
$powershellExe = (Get-Command powershell.exe -ErrorAction Stop).Source
$currentUser = "$env:USERDOMAIN\$env:USERNAME"

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

$webArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $webScript
$workerArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $workerScript
$dailyArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $dailyScript
$webAction = New-ScheduledTaskAction -Execute $powershellExe -Argument $webArgs
$workerAction = New-ScheduledTaskAction -Execute $powershellExe -Argument $workerArgs
$dailyAction = New-ScheduledTaskAction -Execute $powershellExe -Argument $dailyArgs

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At 8:00AM

Register-ScheduledTask -TaskName "FireRisk-Web" -Action $webAction -Trigger $logonTrigger -Settings $settings -Description "Starts the Fire Risk Next.js web server at logon." -User $currentUser -Force | Out-Null
Register-ScheduledTask -TaskName "FireRisk-WorkerService" -Action $workerAction -Trigger $logonTrigger -Settings $settings -Description "Starts the Fire Risk worker service at logon." -User $currentUser -Force | Out-Null
Register-ScheduledTask -TaskName "FireRisk-DailyRun" -Action $dailyAction -Trigger $dailyTrigger -Settings $settings -Description "Triggers the Fire Risk daily inference run at 08:00." -User $currentUser -Force | Out-Null
Write-Host "Scheduled tasks created:"
Write-Host "- FireRisk-Web"
Write-Host "- FireRisk-WorkerService"
Write-Host "- FireRisk-DailyRun"
