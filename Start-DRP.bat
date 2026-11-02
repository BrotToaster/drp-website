@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\local.ps1 -Action Start
if errorlevel 1 (pause & exit /b 1)
start "" http://localhost:3000
