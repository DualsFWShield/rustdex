param(
    [int]$MaxWidth = 400,
    [int]$MaxHeight = 600,
    [int]$JpegQuality = 82,
    [int]$MinSizeKB = 120,
    [switch]$UseWebP
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$rootDir = Split-Path -Parent $PSScriptRoot
$beerImgDir = Join-Path $rootDir 'images\beer'

if (-not (Test-Path -LiteralPath $beerImgDir)) {
    Write-Error "Directory not found: $beerImgDir"
    exit 1
}

$hasCwebp = $false
if ($UseWebP -and (Get-Command 'cwebp' -ErrorAction SilentlyContinue)) {
    $hasCwebp = $true
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$JpegQuality)

$files = Get-ChildItem -LiteralPath $beerImgDir -Recurse -File | Where-Object {
    $_.Extension -match '^\.(png|jpe?g)$' -and
    $_.Name -notin @('default.png', 'FUT.jpg')
}

$totalBefore = ($files | Measure-Object -Property Length -Sum).Sum
$optimizedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($file in $files) {
    $sizeKB = [math]::Round($file.Length / 1024, 1)
    try {
        # Load image without locking the file
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        $msIn = New-Object System.IO.MemoryStream(,$bytes)
        $img = [System.Drawing.Image]::FromStream($msIn)

        $w = $img.Width
        $h = $img.Height
        $needsResize = ($w -gt $MaxWidth -or $h -gt $MaxHeight)
        $needsRecompress = ($sizeKB -gt $MinSizeKB)

        if (-not $needsResize -and -not $needsRecompress) {
            $img.Dispose()
            $msIn.Dispose()
            $skippedCount++
            continue
        }

        $ratioW = $MaxWidth / [double]$w
        $ratioH = $MaxHeight / [double]$h
        $ratio = [math]::Min(1.0, [math]::Min($ratioW, $ratioH))
        $newW = [math]::Max(1, [int][math]::Round($w * $ratio))
        $newH = [math]::Max(1, [int][math]::Round($h * $ratio))

        $isPng = ($file.Extension -ieq '.png')
        $pixelFormat = if ($isPng) {
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        } else {
            [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
        }

        $bmp = New-Object System.Drawing.Bitmap($newW, $newH, $pixelFormat)
        $bmp.SetResolution($img.HorizontalResolution, $img.VerticalResolution)
        $gfx = [System.Drawing.Graphics]::FromImage($bmp)
        $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        if ($isPng) {
            $gfx.Clear([System.Drawing.Color]::Transparent)
        }
        $gfx.DrawImage($img, 0, 0, $newW, $newH)
        $gfx.Dispose()
        $img.Dispose()
        $msIn.Dispose()

        $msOut = New-Object System.IO.MemoryStream
        if ($isPng) {
            $bmp.Save($msOut, [System.Drawing.Imaging.ImageFormat]::Png)
        } else {
            $bmp.Save($msOut, $jpegCodec, $encoderParams)
        }
        $bmp.Dispose()

        $outBytes = $msOut.ToArray()
        $msOut.Dispose()

        if ($outBytes.Length -lt $file.Length) {
            [System.IO.File]::WriteAllBytes($file.FullName, $outBytes)
            $optimizedCount++
            if ($hasCwebp) {
                $webpPath = [System.IO.Path]::ChangeExtension($file.FullName, '.webp')
                & cwebp -quiet -q $JpegQuality $file.FullName -o $webpPath
            }
        } else {
            $skippedCount++
        }
    } catch {
        $errorCount++
        Write-Warning "Failed on $($file.FullName): $_"
    }
}

$filesAfter = Get-ChildItem -LiteralPath $beerImgDir -Recurse -File | Where-Object {
    $_.Extension -match '^\.(png|jpe?g)$' -and
    $_.Name -notin @('default.png', 'FUT.jpg')
}
$totalAfter = ($filesAfter | Measure-Object -Property Length -Sum).Sum

$beforeMB = [math]::Round($totalBefore / 1MB, 2)
$afterMB = [math]::Round($totalAfter / 1MB, 2)
$savedMB = [math]::Round(($totalBefore - $totalAfter) / 1MB, 2)

Write-Output "Optimized: $optimizedCount | Skipped: $skippedCount | Errors: $errorCount"
Write-Output "Before: ${beforeMB} MB -> After: ${afterMB} MB (Saved: ${savedMB} MB)"
