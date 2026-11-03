function Get-DrpLanAddress {
  $addresses = @(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | ForEach-Object {
    $configuration = $_
    foreach ($address in $configuration.IPv4Address) {
      $parts = $address.IPAddress.Split('.')
      if ($parts.Count -ne 4) { continue }
      $private = [int]$parts[0] -eq 10 -or ([int]$parts[0] -eq 172 -and [int]$parts[1] -ge 16 -and [int]$parts[1] -le 31) -or ([int]$parts[0] -eq 192 -and [int]$parts[1] -eq 168)
      if ($private) {
        [pscustomobject]@{ Address=$address.IPAddress; InterfaceAlias=$configuration.InterfaceAlias; Metric=$configuration.NetIPv4Interface.InterfaceMetric }
      }
    }
  } | Sort-Object Metric)
  if (!$addresses.Count) { throw 'Keine private IPv4-Adresse mit Netzwerkverbindung gefunden. PC mit dem Heimnetz verbinden.' }
  return $addresses[0]
}
