param([string]$ApiUrl = 'http://localhost:8080/api', [switch]$IncludeDataTests)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location $root
$portable="$root\.tools\node-v22.16.0-win-x64"
if(Test-Path "$portable\node.exe"){$env:PATH="$portable;$env:PATH"}
$maven=Get-Command mvn.cmd -ErrorAction SilentlyContinue
$mavenPath=if($maven){$maven.Source}else{"$env:USERPROFILE\Tools\apache-maven-3.9.16\bin\mvn.cmd"}
if(-not(Test-Path $mavenPath)){throw 'Maven is not installed or cannot be found.'}
& $mavenPath -f backend/pom.xml -B test '-Ddebug=false'
if($LASTEXITCODE -ne 0){throw 'Backend tests failed.'}
& npm.cmd --prefix frontend run build
if($LASTEXITCODE -ne 0){throw 'Frontend build failed.'}
& npm.cmd --prefix frontend run check:pwa
if($LASTEXITCODE -ne 0){throw 'PWA artifact checks failed.'}
$env:API_URL=$ApiUrl
& node scripts/check-live.mjs
if($LASTEXITCODE -eq 2){Write-Warning 'Some live sources are currently unavailable. See the feed output.'}
elseif($LASTEXITCODE -ne 0){throw 'Live feed API check failed.'}
if($IncludeDataTests){
    Write-Host 'Running mutation tests against the selected API. Fictional QA records will be retained.'
    & node scripts/smoke-test.mjs
    if($LASTEXITCODE -ne 0){throw 'Live workflow check failed.'}
}
Write-Host 'Checks complete. Review any provider warnings. Browser installation and device interaction require a browser check.'
