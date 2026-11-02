param([ValidateSet('Enable','Disable','Status')][string]$Action='Status')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$ruleName='DRP-Local-Website-3000'
. "$PSScriptRoot/lan-address.ps1"

if ($Action -eq 'Status') {
  Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Select-Object Name,Enabled,Direction,Action
  exit 0
}
if ($Action -eq 'Enable') {
  $lan=Get-DrpLanAddress
  $node=(Resolve-Path -LiteralPath (Join-Path $projectRoot 'runtime/node/node.exe')).Path
  $existing=Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
  if ($existing -and [string]$existing.Enabled -eq 'True' -and [string]$existing.Direction -eq 'Inbound' -and [string]$existing.Action -eq 'Allow' -and [string]$existing.Profile -eq 'Any' -and [string]$existing.EdgeTraversalPolicy -eq 'Block') {
    $application=$existing | Get-NetFirewallApplicationFilter
    $port=$existing | Get-NetFirewallPortFilter
    $address=$existing | Get-NetFirewallAddressFilter
    $network=$existing | Get-NetFirewallInterfaceFilter
    if ($application.Program -eq $node -and [string]$port.Protocol -eq 'TCP' -and [string]$port.LocalPort -eq '3000' -and [string]$address.LocalAddress -eq $lan.Address -and [string]$address.RemoteAddress -eq 'LocalSubnet' -and [string]$network.InterfaceAlias -eq $lan.InterfaceAlias) {
      Write-Output 'DRP-Firewallfreigabe fuer das aktuelle Heimnetz ist bereits eingerichtet.'
      exit 0
    }
  }
}
$administrator=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (!$administrator) {
  Write-Output 'Windows fragt nach Administratorrechten fuer die auf das lokale Netzwerk begrenzte DRP-Firewallregel.'
  try {
    $helper=Start-Process -FilePath powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$PSCommandPath+'"'),'-Action',$Action) -Verb RunAs -WindowStyle Hidden -PassThru -Wait
    if ($helper.ExitCode -ne 0) { throw 'Die Firewallregel konnte nicht eingerichtet werden.' }
  } catch { throw 'Windows-Freigabe nicht abgeschlossen. Start-DRP-Handy.bat erneut starten und die Administratorabfrage bestaetigen.' }
  exit 0
}
try {
  if ($Action -eq 'Disable') {
    Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  } else {
    $lan=Get-DrpLanAddress
    $node=(Resolve-Path -LiteralPath (Join-Path $projectRoot 'runtime/node/node.exe')).Path
    if (!(Test-Path -LiteralPath $node)) { throw 'Projektlokales Node.js fehlt.' }
    Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -Name $ruleName -DisplayName 'DRP Website im lokalen WLAN (TCP 3000)' -Description 'Nur DRP Node.js, Port 3000, aktuelle Heimnetz-Adresse und lokales Subnetz. Keine Datenbankfreigabe.' -Direction Inbound -Action Allow -Enabled True -Profile Any -Protocol TCP -LocalPort 3000 -Program $node -LocalAddress $lan.Address -RemoteAddress LocalSubnet -InterfaceAlias $lan.InterfaceAlias -EdgeTraversalPolicy Block | Out-Null
  }
  exit 0
} catch {
  Write-Error $_
  exit 1
}
