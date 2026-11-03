param(
  [ValidateSet('Start','Dev','Stop','Status','Share','ShareStop','Backup','Restore','DbStart','DbSetup','DbStatus','Jobs')]
  [string]$Action = 'Start',
  [string]$BackupFile,
  [string]$RestoreName = ('drp_restore_' + (Get-Date -Format 'yyyyMMdd_HHmmss')),
  [switch]$Rebuild,
  [switch]$Lan
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
$node = Join-Path $root 'runtime/node/node.exe'
$pgBin = Join-Path $root 'runtime/pgsql/bin'
$pgData = Join-Path $root 'database/postgres'
$env:PATH = "$(Split-Path $node);$pgBin;$env:PATH"
foreach ($folder in 'database','backups','logs') { New-Item -ItemType Directory -Path (Join-Path $root $folder) -Force | Out-Null }
if (!(Test-Path -LiteralPath "$root/.env")) { throw 'Die lokale .env fehlt.' }
foreach ($line in Get-Content -LiteralPath "$root/.env") {
  if ($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim().Trim('"').Trim("'"), 'Process')
  }
}
# Never allow inherited hosting variables to redirect local database operations.
Remove-Item Env:NETLIFY_DB_URL -ErrorAction SilentlyContinue
$dbUri = [uri]$env:DATABASE_URL
if ($dbUri.Host -notin @('127.0.0.1','localhost') -or $dbUri.Scheme -notin @('postgres','postgresql')) { throw 'DATABASE_URL muss auf lokales PostgreSQL zeigen.' }
$credentials = $dbUri.UserInfo.Split(':',2)
$env:PGUSER = [uri]::UnescapeDataString($credentials[0])
$env:PGPASSWORD = [uri]::UnescapeDataString($credentials[1])
$env:PGHOST = $dbUri.Host
$env:PGPORT = [string]$dbUri.Port
$env:PGDATABASE = $dbUri.AbsolutePath.TrimStart('/')
function Invoke-Pg([string]$Command, [string[]]$Arguments) {
  & (Join-Path $pgBin "$Command.exe") @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Command fehlgeschlagen (Exit $LASTEXITCODE)." }
}
function Start-Database {
  if (!(Test-Path -LiteralPath "$pgData/PG_VERSION")) {
    $passwordFile = Join-Path $root 'database/.init-password'
    try {
      [IO.File]::WriteAllText($passwordFile, $env:PGPASSWORD)
      Invoke-Pg 'initdb' @('-D',$pgData,'-U',$env:PGUSER,'-A','scram-sha-256','--pwfile',$passwordFile,'--encoding=UTF8','--locale=C')
      Add-Content -LiteralPath "$pgData/postgresql.conf" -Value "`nlisten_addresses = '127.0.0.1'`nport = $env:PGPORT`ntimezone = 'Europe/Berlin'"
    } finally { if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile } }
  }
  & "$pgBin/pg_ctl.exe" status -D $pgData *> $null
  if ($LASTEXITCODE -ne 0) { Invoke-Pg 'pg_ctl' @('start','-D',$pgData,'-l',"$root/logs/postgres.log",'-w','-t','30') }
}
function Read-Managed([string]$Name) {
  $file = "$root/runtime/$Name.process.json"
  if (!(Test-Path -LiteralPath $file)) { return $null }
  $saved = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
  $process = Get-Process -Id $saved.Id -ErrorAction SilentlyContinue
  if ($process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.StartTicks) { return $process }
  return $null
}
function Stop-Managed([string]$Name) {
  $process = Read-Managed $Name
  if ($process) { & taskkill.exe /PID $process.Id /T /F | Out-Null }
  $file="$root/runtime/$Name.process.json"
  if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file }
}
function Start-Managed([string]$Name,[string]$Executable,[string[]]$Arguments,[string]$Mode = '') {
  if (Read-Managed $Name) { return }
  $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput "$root/logs/$Name.log" -RedirectStandardError "$root/logs/$Name.error.log" -PassThru
  @{ Id=$process.Id; StartTicks=$process.StartTime.ToUniversalTime().Ticks.ToString(); Mode=$Mode } | ConvertTo-Json | Set-Content -LiteralPath "$root/runtime/$Name.process.json"
}
function Stop-SharedServices {
  foreach ($name in 'share-tunnel','share-proxy') { Stop-Managed $name }
}
function Start-Website([bool]$Development, [string]$SharedOrigin = '') {
  $sharing = ![string]::IsNullOrWhiteSpace($SharedOrigin)
  if ($sharing -and $SharedOrigin -notmatch '^https://[a-z0-9]+(-[a-z0-9]+)*\.trycloudflare\.com$') { throw 'Ungueltiger HTTPS-Vorschauursprung.' }
  if ($sharing -and ($Development -or $Lan)) { throw 'Freigabe verwendet ausschliesslich die optimierte Loopback-Vorschau.' }
  if (!$sharing) { Stop-SharedServices }
  if ($Lan -and $Development) { throw 'Handy-Vorschau bitte mit -Action Start -Lan starten.' }
  $lanAddress = if ($Lan) { . "$PSScriptRoot/lan-address.ps1"; Get-DrpLanAddress } else { $null }
  $origin = if ($sharing) { $SharedOrigin } elseif ($Lan) { 'http://' + $lanAddress.Address + ':3000' } else { 'http://localhost:3000' }
  Start-Database
  # LAN preview never exposes the passwordless owner demo.
  $env:DRP_LOCAL_PREVIEW = if ($Development -or $Lan -or $sharing) { 'false' } else { 'true' }
  $env:DRP_LAN_PREVIEW = if ($Lan) { 'true' } else { 'false' }
  $env:DRP_SHARED_PREVIEW = if ($sharing) { 'true' } else { 'false' }
  $env:DRP_HOSTED_PREVIEW = 'false'
  $env:TRUST_PROXY_HTTPS = if ($sharing) { 'true' } else { 'false' }
  if ($Lan -or $sharing) { $env:AUTH_DEMO_MODE = 'false' }
  $env:SITE_URL = $origin
  $env:AUTH_URL = $origin
  $env:PUBLIC_SITE_INDEXING = 'false'
  $env:NODE_ENV = if ($Development) { 'development' } else { 'production' }
  $mode = if ($sharing) { 'preview-shared' } elseif ($Development) { 'development' } elseif ($Lan) { 'preview-lan' } else { 'preview' }
  $current = Read-Managed 'website'
  if ($current) {
    $saved = Get-Content -LiteralPath "$root/runtime/website.process.json" -Raw | ConvertFrom-Json
    if ($saved.Mode -ne $mode -or (($Lan -or $sharing) -and $saved.Origin -ne $origin) -or $Rebuild) { Stop-Managed 'website' }
  }
  if (!(Read-Managed 'website') -and (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue)) { throw 'Port 3000 ist bereits belegt. Es wurde kein fremder Prozess beendet.' }
  if (!$Development) {
    & $node 'scripts/local-build.mjs' '--check'
    if ($LASTEXITCODE -ne 0 -or $Rebuild) {
      Stop-Managed 'website'
      & $node 'scripts/local-build.mjs' '--force'
      if ($LASTEXITCODE -ne 0) { throw 'Website-Build fehlgeschlagen. Siehe logs/local-build.log.' }
    }
  }
  if ($Lan) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/local-network.ps1" -Action Enable
    if ($LASTEXITCODE -ne 0) { throw 'Lokale Netzwerkfreigabe fehlgeschlagen.' }
  }
  if (!(Read-Managed 'website')) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($listener) { throw 'Port 3000 ist bereits belegt. Es wurde kein fremder Prozess beendet.' }
    $command = if ($Development) { 'dev' } else { 'start' }
    $bindAddress = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
    Start-Managed 'website' $node @('node_modules/next/dist/bin/next',$command,'--hostname',$bindAddress,'--port','3000') $mode
    $settings = Get-Content -LiteralPath "$root/runtime/website.process.json" -Raw | ConvertFrom-Json
    $settings | Add-Member -NotePropertyName Origin -NotePropertyValue $origin -Force
    $settings | ConvertTo-Json | Set-Content -LiteralPath "$root/runtime/website.process.json"
  }
  $ready = $false
  for ($attempt=0; $attempt -lt 45; $attempt++) {
    if (!(Read-Managed 'website')) { throw 'Website beendet. Siehe logs/website.error.log.' }
    try { $response = Invoke-WebRequest 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { $ready=$true; break } } catch { Start-Sleep -Seconds 1 }
  }
  if (!$ready) { throw 'Website nicht erreichbar. Siehe logs/website.error.log.' }
  # A mode switch updates recurring jobs; repeated starts keep the same process.
  if (Read-Managed 'jobs') {
    $jobSettings = Get-Content -LiteralPath "$root/runtime/jobs.process.json" -Raw | ConvertFrom-Json
    if ($jobSettings.Mode -ne $mode) { Stop-Managed 'jobs' }
  }
  Start-Managed 'jobs' 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/local.ps1','-Action','Jobs') $mode
  Write-Output "DRP laeuft unter $origin ($mode). Logs: logs/. Discord-Bot separat mit discord-bot/start_bot.bat starten."
  if ($Lan) { Write-Output "Auf dem Handy im selben WLAN oeffnen: $origin (PC muss eingeschaltet bleiben)." }
}
function Write-SharedAccess {
  $access = Get-Content -LiteralPath "$root/runtime/share.config.json" -Raw | ConvertFrom-Json
  Write-Output "Vorschaulink: $($access.origin)"
  Write-Output "Benutzername: $($access.username)"
  Write-Output "Vorschau-Passwort: $($access.password)"
  Write-Output 'Nur fuer diese Vorschau. PC und Internet muessen an bleiben. Stop-DRP-Freigabe.bat beendet den externen Zugriff.'
}
function Start-SharedPreview {
  if ($Lan) { throw 'Freigabe bitte ohne -Lan starten.' }
  $configFile = "$root/runtime/share.config.json"
  if ((Read-Managed 'share-tunnel') -and (Read-Managed 'share-proxy') -and (Read-Managed 'website') -and (Test-Path -LiteralPath $configFile)) {
    $access = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
    Start-Website $false $access.origin
    Write-SharedAccess
    return
  }
  $previousMode = 'preview'
  if (Read-Managed 'website') { $previousMode = (Get-Content -LiteralPath "$root/runtime/website.process.json" -Raw | ConvertFrom-Json).Mode }
  if ($previousMode -eq 'preview-shared' -and (Test-Path -LiteralPath $configFile)) { $previousMode = (Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json).previousMode }
  Stop-SharedServices
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/install-cloudflared.ps1"
  if ($LASTEXITCODE -ne 0) { throw 'Cloudflare-Laufzeit konnte nicht vorbereitet werden.' }
  if (Get-NetTCPConnection -State Listen -LocalPort 3418 -ErrorAction SilentlyContinue) { throw 'Port 3418 ist belegt. Es wurde kein fremder Prozess beendet.' }
  $cloudflared = Join-Path $root 'runtime/cloudflared/cloudflared.exe'
  try {
    Start-Managed 'share-tunnel' $cloudflared @('tunnel','--no-autoupdate','--protocol','http2','--url','http://127.0.0.1:3418') 'protected-preview'
    $publicUrl = $null
    for ($attempt=0; $attempt -lt 60; $attempt++) {
      if (!(Read-Managed 'share-tunnel')) { throw 'Vorschau-Tunnel beendet. Siehe logs/share-tunnel.error.log.' }
      $output = (Get-Content -LiteralPath "$root/logs/share-tunnel.error.log" -Raw -ErrorAction SilentlyContinue) + (Get-Content -LiteralPath "$root/logs/share-tunnel.log" -Raw -ErrorAction SilentlyContinue)
      $match = [regex]::Match($output, 'https://[a-z0-9]+(-[a-z0-9]+)*\.trycloudflare\.com')
      if ($match.Success) { $publicUrl = $match.Value; break }
      Start-Sleep -Seconds 1
    }
    if (!$publicUrl) { throw 'Cloudflare hat keine Vorschau-Adresse bereitgestellt. Siehe logs/share-tunnel.error.log.' }
    $bytes = New-Object byte[] 18
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    $password = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
    @{ origin=$publicUrl; username='drp'; password=$password; previousMode=$previousMode; createdAt=(Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $configFile
    # The tunnel points only to the password gateway, which starts after the
    # website has disabled demo access and adopted its public HTTPS origin.
    Start-Website $false $publicUrl
    Start-Managed 'share-proxy' $node @('scripts/shared-preview.mjs','runtime/share.config.json') 'protected-preview'
    $gatewayReady = $false
    for ($attempt=0; $attempt -lt 15; $attempt++) {
      if (!(Read-Managed 'share-proxy')) { throw 'Vorschau-Passwortschutz beendet. Siehe logs/share-proxy.error.log.' }
      try { Invoke-WebRequest 'http://127.0.0.1:3418/' -UseBasicParsing -TimeoutSec 2 | Out-Null } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401 -and $_.Exception.Response.Headers['WWW-Authenticate'] -like '*DRP Vorschau*') { $gatewayReady=$true; break }
      }
      Start-Sleep -Seconds 1
    }
    if (!$gatewayReady) { throw 'Vorschau-Passwortschutz nicht erreichbar. Siehe logs/share-proxy.error.log.' }
    Write-SharedAccess
  } catch {
    $failure = $_
    Stop-SharedServices
    throw $failure
  }
}
switch ($Action) {
  'DbStart' { Start-Database }
  'DbStatus' { Start-Database; Invoke-Pg 'psql' @('-X','-v','ON_ERROR_STOP=1','-c','SELECT name, applied_at FROM local_admin._drp_local_migrations ORDER BY name;') }
  'DbSetup' {
    Start-Database
    $exists = & "$pgBin/psql.exe" -X -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$($env:PGDATABASE)'"
    if ($LASTEXITCODE -ne 0) { throw 'Datenbankstatus konnte nicht gelesen werden.' }
    if ($exists -ne '1') { Invoke-Pg 'createdb' @($env:PGDATABASE) }
    Invoke-Pg 'psql' @('-X','-v','ON_ERROR_STOP=1','-c','CREATE SCHEMA IF NOT EXISTS local_admin; CREATE TABLE IF NOT EXISTS local_admin._drp_local_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());')
    foreach ($migration in Get-ChildItem "$root/netlify/database/migrations/*.sql" | Sort-Object Name) {
      $hash = (Get-FileHash -LiteralPath $migration.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      $migrationText = [IO.File]::ReadAllText($migration.FullName).Replace("`r`n", "`n")
      $digest = [Security.Cryptography.SHA256]::Create()
      try {
        $canonicalHash = ([BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes($migrationText)))).Replace('-','').ToLowerInvariant()
        $windowsHash = ([BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes($migrationText.Replace("`n", "`r`n"))))).Replace('-','').ToLowerInvariant()
      } finally { $digest.Dispose() }
      $applied = & "$pgBin/psql.exe" -X -tAc "SELECT checksum FROM local_admin._drp_local_migrations WHERE name = '$($migration.Name)'"
      if ($LASTEXITCODE -ne 0) { throw 'Migrationsstatus konnte nicht gelesen werden.' }
      if ($applied) { if ($applied -notin @($hash,$canonicalHash,$windowsHash)) { throw "Migration wurde nach Anwendung geaendert: $($migration.Name)" }; continue }
      $tables = & "$pgBin/psql.exe" -X -tAc 'SELECT count(*) FROM information_schema.tables WHERE table_schema=''public'' AND table_name=''User'''
      if ($migration.Name -like '*initial_schema*' -and [int]$tables -gt 0) { throw 'Vorhandene Datenbank ohne Migrationshistorie: erst Bestand pruefen und Migrationen abgleichen.' }
      $mark = "INSERT INTO local_admin._drp_local_migrations(name,checksum) VALUES ('$($migration.Name)','$hash');"
      Invoke-Pg 'psql' @('-X','-v','ON_ERROR_STOP=1','--single-transaction','-f',$migration.FullName,'-c',$mark)
    }
  }
  'Backup' {
    Start-Database
    $destination = Join-Path $root ('backups/drp_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.dump')
    Invoke-Pg 'pg_dump' @('--format=custom','--no-owner','--no-acl','--file',$destination)
    Write-Output "Sicherung: $destination"
  }
  'Restore' {
    if (!$BackupFile -or !(Test-Path -LiteralPath $BackupFile)) { throw '-BackupFile muss auf eine vorhandene Sicherung zeigen.' }
    if ($RestoreName -notmatch '^drp_restore_[a-zA-Z0-9_]+$') { throw 'Wiederherstellung nur in neue Datenbank drp_restore_* erlaubt.' }
    Start-Database
    Invoke-Pg 'createdb' @($RestoreName)
    Invoke-Pg 'pg_restore' @('--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',$RestoreName,(Resolve-Path -LiteralPath $BackupFile).Path)
    Write-Output "Wiederhergestellt in: $RestoreName"
  }
  'Start' { Start-Website $false }
  'Dev' { Start-Website $true }
  'Share' { Start-SharedPreview }
  'ShareStop' {
    $previousMode = 'preview'
    if (Test-Path -LiteralPath "$root/runtime/share.config.json") { $previousMode = (Get-Content -LiteralPath "$root/runtime/share.config.json" -Raw | ConvertFrom-Json).previousMode }
    Stop-SharedServices
    $Lan = $previousMode -eq 'preview-lan'
    Start-Website $false
    Write-Output 'Externe Vorschau beendet.'
  }
  'Jobs' {
    while ($true) {
      & $node 'node_modules/tsx/dist/cli.mjs' '--env-file=.env' 'scripts/railway-jobs.ts'
      if ($LASTEXITCODE -ne 0) { Write-Warning "Hintergrundjob fehlgeschlagen (Exit $LASTEXITCODE); erneuter Versuch in 5 Minuten." }
      Start-Sleep -Seconds 300
    }
  }
  'Status' {
    foreach ($name in 'website','jobs','share-tunnel','share-proxy') {
      Write-Output "$name aktiv: $([bool](Read-Managed $name))"
      if ($name -eq 'website' -and (Read-Managed $name)) { $saved = Get-Content -LiteralPath "$root/runtime/$name.process.json" -Raw | ConvertFrom-Json; Write-Output "Website-Modus: $($saved.Mode)" }
    }
    & "$pgBin/pg_ctl.exe" status -D $pgData
  }
  'Stop' {
    foreach ($name in 'share-tunnel','share-proxy','jobs','website') {
      Stop-Managed $name
    }
    & "$pgBin/pg_ctl.exe" status -D $pgData *> $null
    if ($LASTEXITCODE -eq 0) { Invoke-Pg 'pg_ctl' @('stop','-D',$pgData,'-m','fast','-w','-t','30') }
  }
}
