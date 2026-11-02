@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\local.ps1 -Action Start -Lan
if errorlevel 1 (pause & exit /b 1)
echo.
echo Die oben angezeigte Adresse auf dem Handy im selben WLAN oeffnen.
pause
