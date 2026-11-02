$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$folder=Join-Path $projectRoot 'runtime/cloudflared'
$binary=Join-Path $folder 'cloudflared.exe'
$version='2026.10.1'
$expected='4d2490e74082c5d48dbfedaf92576fa5bd1702379ab88eb7faa0cfbe8dc891b6'
$source="https://github.com/cloudflare/cloudflared/releases/download/$version/cloudflared-windows-amd64.exe"
if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'Diese gepruefte Laufzeit ist fuer Windows x64 vorgesehen.' }
New-Item -ItemType Directory -Path $folder -Force | Out-Null
if (!(Test-Path -LiteralPath $binary) -or (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
  $temporary=Join-Path $folder 'cloudflared.exe.download'
  try {
    Invoke-WebRequest -Uri $source -OutFile $temporary -UseBasicParsing
    if ((Get-FileHash -LiteralPath $temporary -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'SHA256 der Cloudflare-Laufzeit stimmt nicht mit der offiziellen Veroeffentlichung ueberein.' }
    Move-Item -LiteralPath $temporary -Destination $binary -Force
  } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary } }
}
@{ version=$version; sha256=$expected; source=$source } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $folder 'version.json')
& $binary --version
if ($LASTEXITCODE -ne 0) { throw 'Cloudflare-Laufzeit konnte nicht gestartet werden.' }
