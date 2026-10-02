param(
    [Parameter(Mandatory = $true)]
    [string]$WorkbookPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not (Test-Path -LiteralPath $WorkbookPath -PathType Leaf)) {
    throw "Workbook not found: $WorkbookPath"
}
$workbookFile = Get-Item -LiteralPath $WorkbookPath

$outputPath = Join-Path $PSScriptRoot '..\tmp\source-analysis\workbook-inventory.json'
$outputDir = Split-Path -Parent $outputPath
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function Read-ZipEntryText {
    param(
        [System.IO.Compression.ZipArchive]$Zip,
        [string]$Name
    )
    $entry = $Zip.GetEntry($Name)
    if ($null -eq $entry) { throw "Missing XLSX entry: $Name" }
    $stream = $entry.Open()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8, $true)
    try { return $reader.ReadToEnd() }
    finally { $reader.Dispose(); $stream.Dispose() }
}

function Get-SharedStrings {
    param([System.IO.Compression.ZipArchive]$Zip)
    $entry = $Zip.GetEntry('xl/sharedStrings.xml')
    if ($null -eq $entry) { return @() }
    $strings = [System.Collections.Generic.List[string]]::new()
    $stream = $entry.Open()
    $reader = [System.Xml.XmlReader]::Create($stream)
    try {
        while ($reader.Read()) {
            if ($reader.NodeType -eq [System.Xml.XmlNodeType]::Element -and $reader.LocalName -eq 'si') {
                $subtree = $reader.ReadSubtree()
                $parts = [System.Collections.Generic.List[string]]::new()
                try {
                    while ($subtree.Read()) {
                        if ($subtree.NodeType -eq [System.Xml.XmlNodeType]::Element -and $subtree.LocalName -eq 't') {
                            [void]$parts.Add($subtree.ReadElementContentAsString())
                        }
                    }
                }
                finally { $subtree.Dispose() }
                [void]$strings.Add(($parts -join ''))
            }
        }
    }
    finally { $reader.Dispose(); $stream.Dispose() }
    return $strings.ToArray()
}

function Get-SheetCells {
    param(
        [System.IO.Compression.ZipArchive]$Zip,
        [string]$EntryName,
        [string[]]$SharedStrings,
        [int]$Limit = 20000
    )
    $entry = $Zip.GetEntry($EntryName)
    if ($null -eq $entry) { throw "Missing sheet entry: $EntryName" }
    $stream = $entry.Open()
    $reader = [System.Xml.XmlReader]::Create($stream, [System.Xml.XmlReaderSettings]@{
        IgnoreWhitespace = $true
        DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    })
    $cells = [System.Collections.Generic.List[object]]::new()
    $dimension = $null
    $formulaCount = 0
    $valuedCellCount = 0
    try {
        while ($reader.Read()) {
            if ($reader.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
            if ($reader.LocalName -eq 'dimension') {
                $dimension = $reader.GetAttribute('ref')
                continue
            }
            if ($reader.LocalName -ne 'c') { continue }

            $address = $reader.GetAttribute('r')
            $type = $reader.GetAttribute('t')
            $style = $reader.GetAttribute('s')
            $formula = $null
            $value = $null
            $inlineText = $null

            $cell = $reader.ReadSubtree()
            try {
                while ($cell.Read()) {
                    if ($cell.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
                    switch ($cell.LocalName) {
                        'f' { $formula = $cell.ReadElementContentAsString() }
                        'v' { $value = $cell.ReadElementContentAsString() }
                        't' { if ($type -eq 'inlineStr') { $inlineText = $cell.ReadElementContentAsString() } }
                    }
                }
            }
            finally { $cell.Dispose() }

            if ($null -ne $formula) { $formulaCount++ }
            if ($null -eq $formula -and $null -eq $value -and $null -eq $inlineText) { continue }
            $valuedCellCount++

            $displayValue = $value
            if ($type -eq 's' -and $null -ne $value) {
                $index = 0
                if ([int]::TryParse($value, [ref]$index) -and $index -ge 0 -and $index -lt $SharedStrings.Count) {
                    $displayValue = $SharedStrings[$index]
                }
            }
            elseif ($type -eq 'inlineStr') {
                $displayValue = $inlineText
            }

            if ($cells.Count -lt $Limit) {
                [void]$cells.Add([ordered]@{
                    address = $address
                    type = $type
                    style = $style
                    value = $displayValue
                    rawValue = $value
                    formula = $formula
                })
            }
        }
    }
    finally { $reader.Dispose(); $stream.Dispose() }

    return [ordered]@{
        entry = $EntryName
        dimension = $dimension
        valuedCellCount = $valuedCellCount
        formulaCount = $formulaCount
        truncated = ($valuedCellCount -gt $Limit)
        cells = $cells.ToArray()
    }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($workbookFile.FullName)
try {
    $sharedStrings = @(Get-SharedStrings -Zip $zip)

    [xml]$workbookXml = Read-ZipEntryText -Zip $zip -Name 'xl/workbook.xml'
    [xml]$relationshipsXml = Read-ZipEntryText -Zip $zip -Name 'xl/_rels/workbook.xml.rels'
    $relationshipMap = @{}
    foreach ($relationship in $relationshipsXml.Relationships.Relationship) {
        $relationshipMap[$relationship.Id] = $relationship.Target
    }

    $sheets = [System.Collections.Generic.List[object]]::new()
    foreach ($sheet in $workbookXml.workbook.sheets.sheet) {
        $relationshipId = $sheet.GetAttribute('r:id')
        $target = [string]$relationshipMap[$relationshipId]
        $entryName = if ($target.StartsWith('/')) {
            $target.TrimStart('/')
        } elseif ($target.StartsWith('xl/')) {
            $target
        } else {
            'xl/' + $target.TrimStart('./')
        }
        $analysis = Get-SheetCells -Zip $zip -EntryName $entryName -SharedStrings $sharedStrings
        [void]$sheets.Add([ordered]@{
            name = [string]$sheet.name
            sheetId = [string]$sheet.sheetId
            relationshipId = $relationshipId
            analysis = $analysis
        })
    }

    $result = [ordered]@{
        workbook = $workbookFile.FullName
        bytes = $workbookFile.Length
        sharedStringCount = $sharedStrings.Count
        sheetCount = $sheets.Count
        sheets = $sheets.ToArray()
    }
    $json = $result | ConvertTo-Json -Depth 12
    [System.IO.File]::WriteAllText($outputPath, $json, [System.Text.UTF8Encoding]::new($false))
    Write-Output $json
}
finally {
    $zip.Dispose()
}
