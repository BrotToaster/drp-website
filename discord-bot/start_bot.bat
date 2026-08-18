@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Der Bot wurde noch nicht installiert. Starte zuerst install.bat.
  pause
  exit /b 1
)

:restart
echo [%date% %time%] Starte DRP Discord-Bot...
".venv\Scripts\python.exe" main.py
set exit_code=%errorlevel%
echo [%date% %time%] Bot wurde mit Code %exit_code% beendet.
echo Neustart in 10 Sekunden. Mit Strg+C dauerhaft beenden.
timeout /t 10 /nobreak >nul
goto restart
