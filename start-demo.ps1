$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
& "$PSScriptRoot\scripts\start-database.ps1"
$runtime = "$PSScriptRoot\.runtime"
$processes = @{}
if (Test-Path "$runtime\processes.json") {
    $previous = Get-Content "$runtime\processes.json" -Raw | ConvertFrom-Json
    foreach ($property in $previous.PSObject.Properties) { $processes[$property.Name] = $property.Value }
}
foreach ($part in @('backend','frontend')) {
    $port = if ($part -eq 'backend') { 8080 } else { 5173 }
    $running = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($running) { Write-Host "Port $port already in use; leaving its process untouched."; continue }
    $script = "$PSScriptRoot\scripts\start-$part.ps1"
    $process = Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $script + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput "$runtime\$part.log" -RedirectStandardError "$runtime\$part-error.log"
    $processes[$part] = $process.Id
}
$processes | ConvertTo-Json | Set-Content "$runtime\processes.json"
Write-Host 'Starting the installable NEXUS India app. The frontend builds before starting; allow up to a minute.'
Write-Host 'Website: http://localhost:5173 | API: http://localhost:8080/api/health'
Write-Host 'Logs: .runtime/backend.log and .runtime/frontend.log'

Write-Host 'Install: open localhost:5173 in Chrome/Edge and choose Install NEXUS. Phone installation needs a reachable HTTPS address.'
