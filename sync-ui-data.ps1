$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$source = Join-Path $projectRoot "data\ui\phase2_ui_dataset.csv"
$destinationDir = Join-Path $projectRoot "app\frontend\public\data\ui"
$destination = Join-Path $destinationDir "phase2_ui_dataset.csv"

if (-not (Test-Path $source)) {
    throw "Real UI dataset not found at $source"
}

New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null

Copy-Item -Path $source -Destination $destination -Force

Write-Host "Copied real UI dataset to $destination"
