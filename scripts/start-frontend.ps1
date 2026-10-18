$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$portable = "$root\.tools\node-v22.16.0-win-x64"
if (Test-Path "$portable\node.exe") { $env:PATH = "$portable;$env:PATH" }
Set-Location "$root\frontend"
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22+ and reopen the terminal.' }
if (-not (Test-Path 'node_modules')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed; see the log.' }
& npm.cmd run preview -- --port 5173 --strictPort
exit $LASTEXITCODE
