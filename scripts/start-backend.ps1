$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location "$root\backend"
if (-not $env:DB_URL) { $env:DB_URL = 'jdbc:postgresql://127.0.0.1:55432/nexus' }
$maven = Get-Command mvn.cmd -ErrorAction SilentlyContinue
if ($maven) { $mavenPath = $maven.Source } else { $mavenPath = "$env:USERPROFILE\Tools\apache-maven-3.9.16\bin\mvn.cmd" }
if (-not (Test-Path $mavenPath)) { throw 'Install Maven 3.9+ and add its bin directory to PATH.' }
& $mavenPath '-B' 'spring-boot:run' '-Dspring-boot.run.arguments=--debug=false --logging.level.root=INFO'
exit $LASTEXITCODE
