@echo off
rem Runs the nightly snapshot from Windows Task Scheduler.
rem
rem Two things the scheduler cannot do on its own. The backup script finds
rem wrangler at a path relative to the repository, so it has to start in this
rem folder rather than wherever the scheduler happens to be. And a run with
rem nobody watching needs somewhere to leave its reasons: Task Scheduler keeps
rem an exit code and nothing else, so a backup that stopped working a month ago
rem looks exactly like one that is fine until the day it is needed.
rem
rem The log sits beside the snapshots so that whoever goes looking for a dump
rem finds the record of the attempts in the same folder.
rem
rem Registering it on a machine, in PowerShell, with the path to that checkout:
rem
rem   $cmd = "C:\path\to\if\scripts\backup-db.cmd"
rem   Register-ScheduledTask -TaskName "MBL database snapshot" -Force `
rem     -Action (New-ScheduledTaskAction -Execute $cmd) `
rem     -Trigger (New-ScheduledTaskTrigger -Daily -At 6pm) `
rem     -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable `
rem        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
rem        -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew)
rem
rem StartWhenAvailable is the setting that matters on a laptop: a day it was
rem shut at six is caught up when it next starts rather than skipped.
setlocal
cd /d "%~dp0.."
set BACKUPS=%USERPROFILE%\OneDrive\MBL-backups
if not exist "%BACKUPS%" mkdir "%BACKUPS%"
echo ====== %DATE% %TIME% >> "%BACKUPS%\backup-log.txt"
node scripts/backup-db.mjs >> "%BACKUPS%\backup-log.txt" 2>&1
set OUTCOME=%ERRORLEVEL%
echo ====== finished with exit code %OUTCOME% >> "%BACKUPS%\backup-log.txt"
exit /b %OUTCOME%
