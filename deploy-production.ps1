param(
    [string]$Password = "ZAQwsxCDE@91"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building Angular Frontend (Production)..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot
$env:NODE_OPTIONS = "--max-old-space-size=8192"
npx ng build --configuration production

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Deployment cancelled." -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host " Deploying to IIS Production Server..." -ForegroundColor Green
Write-Host " Site: dmspl91-001-site2" -ForegroundColor Green
Write-Host " URL: http://dmspl91-001-site2.ntempurl.com/" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

$MSDeployPath = "C:\Program Files (x86)\IIS\Microsoft Web Deploy V3\msdeploy.exe"
if (-not (Test-Path $MSDeployPath)) {
    $MSDeployPath = "C:\Program Files\IIS\Microsoft Web Deploy V3\msdeploy.exe"
}

$SourcePath = Join-Path $PSScriptRoot "dist\lims\browser"

& $MSDeployPath -verb:sync `
    -source:contentPath="$SourcePath" `
    -dest:contentPath="dmspl91-001-site2",wmsvc="https://win6046.site4now.net:8172/MsDeploy.axd?site=dmspl91-001-site2",userName="dmspl91-001",password="$Password",authtype="Basic" `
    -enableRule:AppOffline `
    -allowUntrusted

if ($LASTEXITCODE -eq 0) {
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host " SUCCESS! Angular Frontend deployed to Production!" -ForegroundColor Green
    Write-Host " Live URL: http://dmspl91-001-site2.ntempurl.com/" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "Deployment failed with error code $LASTEXITCODE" -ForegroundColor Red
}
