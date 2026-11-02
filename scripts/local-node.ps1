param([Parameter(ValueFromRemainingArguments=$true)][string[]]$NodeArguments)
$ErrorActionPreference='Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
$env:PATH = "$root/runtime/node;$env:PATH"
& "$root/runtime/node/node.exe" @NodeArguments
exit $LASTEXITCODE
