@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\local.ps1 -Action Share
if errorlevel 1 (pause & exit /b 1)
pause
