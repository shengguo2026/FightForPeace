# Fight For Peace: downloads the portable Node.js runtime pinned in runtime.json into
# runtime\node, after checking its SHA-256. Called by start.bat; needs no admin rights.
param([Parameter(Mandatory = $true)][string]$Root)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $spec = Get-Content -Raw -Path (Join-Path $Root 'runtime.json') | ConvertFrom-Json
  $key = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'win-arm64' } else { 'win-x64' }
  $file = $spec.files.$key
  $runtime = Join-Path $Root 'runtime'
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  $zip = Join-Path $runtime 'node-download.zip'
  Write-Host "Downloading Node.js $($spec.node) ($key)..."
  Invoke-WebRequest -UseBasicParsing -Uri $file.url -OutFile $zip
  $hash = (Get-FileHash -Algorithm SHA256 -Path $zip).Hash.ToLowerInvariant()
  if ($hash -ne $file.sha256) {
    Remove-Item -Force $zip
    throw "Checksum mismatch: expected $($file.sha256), got $hash"
  }
  $tmp = Join-Path $runtime 'unpack'
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  Expand-Archive -Path $zip -DestinationPath $tmp
  $node = Join-Path $runtime 'node'
  if (Test-Path $node) { Remove-Item -Recurse -Force $node }
  Move-Item -Path (Join-Path $tmp $file.dir) -Destination $node
  Remove-Item -Recurse -Force $tmp
  Remove-Item -Force $zip
  Write-Host 'Node.js is ready.'
  exit 0
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  exit 1
}
