param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,
    [string]$LanguageTag = 'ar-SA'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

function Await-Operation {
    param(
        [Parameter(Mandatory = $true)]$Operation,
        [Parameter(Mandatory = $true)][Type]$ResultType
    )
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq 'AsTask' -and
            $_.IsGenericMethod -and
            $_.GetParameters().Count -eq 1 -and
            $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
        } |
        Select-Object -First 1
    $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$storageFile = Await-Operation (
    [Windows.Storage.StorageFile]::GetFileFromPathAsync($resolvedInput)
) ([Windows.Storage.StorageFile])
$stream = Await-Operation (
    $storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)
) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await-Operation (
    [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await-Operation (
    $decoder.GetSoftwareBitmapAsync()
) ([Windows.Graphics.Imaging.SoftwareBitmap])

$language = [Windows.Globalization.Language]::new($LanguageTag)
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if ($null -eq $engine) { throw "OCR language is unavailable: $LanguageTag" }
$result = Await-Operation (
    $engine.RecognizeAsync($bitmap)
) ([Windows.Media.Ocr.OcrResult])

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
[System.IO.File]::WriteAllText(
    $resolvedOutput,
    $result.Text,
    [System.Text.UTF8Encoding]::new($false)
)
Write-Output $resolvedOutput
