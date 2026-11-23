$ErrorActionPreference = 'Stop'
$rootDir = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $rootDir 'data'
$outFile = Join-Path $dataDir 'missing-images.json'

$catalogFiles = @(
    'belgiumbeer.json', 'frenchbeer.json', 'deutchbeer.json', 'nlbeer.json',
    'usbeer.json', 'newbeer.json', 'saison.json', 'cobeer.json',
    'krbeer.json', 'jpbeer.json', 'cnbeer.json'
)

$missingList = New-Object System.Collections.Generic.List[string]
$byFile = [ordered]@{}

foreach ($fileName in $catalogFiles) {
    $jsonPath = Join-Path $dataDir $fileName
    if (-not (Test-Path -LiteralPath $jsonPath)) { continue }
    $items = Get-Content -LiteralPath $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $fileMissing = 0
    foreach ($beer in $items) {
        if ($beer.image -and $beer.image -notmatch '^data:' -and $beer.image -notmatch '^https?://') {
            $rel = ($beer.image -replace '/', '\')
            $full = Join-Path $rootDir $rel
            if (-not (Test-Path -LiteralPath $full)) {
                $normPath = ($beer.image -replace '\\', '/')
                if (-not $missingList.Contains($normPath)) {
                    $missingList.Add($normPath)
                }
                $fileMissing++
            }
        }
    }
    if ($fileMissing -gt 0) {
        $byFile[$fileName] = $fileMissing
    }
}

$report = [ordered]@{
    generatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    count = $missingList.Count
    byFile = $byFile
    missing = $missingList
}

$jsonOut = $report | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($outFile, $jsonOut, (New-Object System.Text.UTF8Encoding($false)))

Write-Output "Total missing local images: $($missingList.Count)"
foreach ($k in $byFile.Keys) {
    Write-Output "  ${k}: $($byFile[$k])"
}
