@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if errorlevel 1 (
  echo Python wurde nicht gefunden.
  echo Installiere Python 3.11 oder 3.12 von https://www.python.org/downloads/windows/
  echo Aktiviere bei der Installation "Add python.exe to PATH".
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Erstelle virtuelle Python-Umgebung...
  py -3 -m venv .venv
  if errorlevel 1 goto :error
)

echo Aktualisiere pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :error

echo Installiere Bot-Abhaengigkeiten...
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :error

if not exist "config.json" copy /Y "config.example.json" "config.json" >nul

echo.
echo Installation abgeschlossen.
echo Trage jetzt Discord-Token, Guild-ID und BOT_INGEST_TOKEN in config.json ein.
echo Danach start_bot.bat ausfuehren.
pause
exit /b 0

:error
echo.
echo Installation fehlgeschlagen. Pruefe die Ausgabe oberhalb dieser Zeile.
pause
exit /b 1
