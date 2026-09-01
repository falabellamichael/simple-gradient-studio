param(
    [string]$VsixPath = (Join-Path $PSScriptRoot '..\simple-gradient-studio-0.3.0.vsix'),
    [string]$ExtensionId = 'falabella.simple-gradient-studio',
    [string]$ExpectedVersion = '0.3.0',
    [string]$CodeCommand = 'code.cmd'
)

$ErrorActionPreference = 'Stop'
$resolvedVsix = (Resolve-Path -LiteralPath $VsixPath).Path

$listed = & $CodeCommand --list-extensions --show-versions
if ($LASTEXITCODE -ne 0) {
    throw "VS Code failed to list installed extensions."
}
$expectedIdentity = "$ExtensionId@$ExpectedVersion"
if (-not ($listed | Where-Object { $_.Trim() -eq $expectedIdentity })) {
    throw "Expected installed extension $expectedIdentity was not listed."
}

$installedPath = ((& $CodeCommand --locate-extension $ExtensionId) | Select-Object -Last 1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $installedPath -or -not (Test-Path -LiteralPath $installedPath -PathType Container)) {
    $extensionRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.vscode\extensions'
    $candidate = Join-Path $extensionRoot "$ExtensionId-$ExpectedVersion"
    if (-not (Test-Path -LiteralPath $candidate -PathType Container)) {
        throw "Could not locate installed extension directory for $expectedIdentity."
    }
    $installedPath = (Resolve-Path -LiteralPath $candidate).Path
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedVsix)
try {
    $packageEntry = $archive.GetEntry('extension/package.json')
    if (-not $packageEntry) {
        throw 'VSIX is missing extension/package.json.'
    }
    $reader = [System.IO.StreamReader]::new($packageEntry.Open())
    try {
        $package = $reader.ReadToEnd() | ConvertFrom-Json
    } finally {
        $reader.Dispose()
    }
    if ($package.publisher -ne 'falabella' -or $package.name -ne 'simple-gradient-studio' -or $package.version -ne $ExpectedVersion) {
        throw "VSIX identity mismatch: $($package.publisher).$($package.name)@$($package.version)."
    }

    $archiveEntries = @($archive.Entries | Where-Object {
        $_.FullName.StartsWith('extension/', [System.StringComparison]::Ordinal) -and -not $_.FullName.EndsWith('/')
    })
    $archiveMap = @{}
    foreach ($entry in $archiveEntries) {
        $relative = $entry.FullName.Substring('extension/'.Length).Replace('/', '\')
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
            $stream = $entry.Open()
            try {
                $archiveMap[$relative] = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '')
            } finally {
                $stream.Dispose()
            }
        } finally {
            $sha.Dispose()
        }
    }

    $installedMap = @{}
    $installedPrefix = $installedPath.TrimEnd('\', '/') + '\'
    $installedFiles = @(Get-ChildItem -LiteralPath $installedPath -File -Recurse | Where-Object {
        $rel = $_.FullName.Substring($installedPrefix.Length)
        $rel -ne '.vsixmanifest'
    })
    foreach ($file in $installedFiles) {
        $relative = $file.FullName.Substring($installedPrefix.Length)
        $installedMap[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
    }

    $missing = @($archiveMap.Keys | Where-Object { -not $installedMap.ContainsKey($_) })
    $extra = @($installedMap.Keys | Where-Object { -not $archiveMap.ContainsKey($_) })
    $mismatched = @($archiveMap.Keys | Where-Object {
        $_ -ne 'package.json' -and $installedMap.ContainsKey($_) -and $archiveMap[$_] -ne $installedMap[$_]
    })

    $installedPackage = Get-Content -LiteralPath (Join-Path $installedPath 'package.json') -Raw | ConvertFrom-Json
    $installedPackage.PSObject.Properties.Remove('__metadata')
    $archiveCanonicalPackage = $package | ConvertTo-Json -Depth 100 -Compress
    $installedCanonicalPackage = $installedPackage | ConvertTo-Json -Depth 100 -Compress
    $canonicalPackageMatch = $archiveCanonicalPackage -eq $installedCanonicalPackage
    if (-not $canonicalPackageMatch) {
        $mismatched += 'package.json'
    }
    if ($missing.Count -or $extra.Count -or $mismatched.Count) {
        $missingText = ($missing | Sort-Object) -join ', '
        $extraText = ($extra | Sort-Object) -join ', '
        $mismatchText = ($mismatched | Sort-Object) -join ', '
        throw "Installed payload mismatch. Missing=[$missingText], Extra=[$extraText], HashMismatch=[$mismatchText]."
    }

    [PSCustomObject]@{
        Extension = $expectedIdentity
        VsixPath = $resolvedVsix
        VsixSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedVsix).Hash
        InstalledPath = $installedPath
        ArchiveFileCount = $archiveMap.Count
        InstalledFileCount = $installedMap.Count
        CanonicalPackageMatch = $canonicalPackageMatch
        InstallerMetadataNormalized = @('.vsixmanifest', 'package.json::__metadata')
        ExactPayloadMatch = $true
    } | ConvertTo-Json -Depth 3
} finally {
    $archive.Dispose()
}
