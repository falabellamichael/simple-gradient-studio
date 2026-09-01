param(
    [string]$CodeCommand = 'code.cmd'
)

$ErrorActionPreference = 'Stop'
$version = '0.1.0'
$extensionId = 'falabella.simple-gradient-studio'
$vsix = Join-Path $PSScriptRoot "simple-gradient-studio-$version.vsix"

if (-not (Test-Path -LiteralPath $vsix -PathType Leaf)) {
    throw "Exact installer artifact not found: $vsix"
}

Write-Host "Installing exact artifact: $(Split-Path -Leaf $vsix)" -ForegroundColor Cyan
& $CodeCommand --install-extension $vsix --force
if ($LASTEXITCODE -ne 0) {
    throw "VS Code extension installation failed with exit code $LASTEXITCODE."
}

$expectedIdentity = "$extensionId@$version"
$listed = & $CodeCommand --list-extensions --show-versions
if ($LASTEXITCODE -ne 0 -or -not ($listed | Where-Object { $_.Trim() -eq $expectedIdentity })) {
    throw "Expected installed extension $expectedIdentity was not listed."
}

$installedPath = ((& $CodeCommand --locate-extension $extensionId) | Select-Object -Last 1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $installedPath -or -not (Test-Path -LiteralPath $installedPath -PathType Container)) {
    $extensionRoot = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.vscode\extensions'
    $candidate = Join-Path $extensionRoot "$extensionId-$version"
    if (-not (Test-Path -LiteralPath $candidate -PathType Container)) {
        throw "Could not locate installed extension directory for $expectedIdentity."
    }
    $installedPath = (Resolve-Path -LiteralPath $candidate).Path
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$resolvedVsix = (Resolve-Path -LiteralPath $vsix).Path
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
    if ($package.publisher -ne 'falabella' -or $package.name -ne 'simple-gradient-studio' -or $package.version -ne $version) {
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
                $archiveMap[$relative] = [Convert]::ToHexString($sha.ComputeHash($stream))
            } finally {
                $stream.Dispose()
            }
        } finally {
            $sha.Dispose()
        }
    }

    $installedMap = @{}
    $installedFiles = @(Get-ChildItem -LiteralPath $installedPath -File -Recurse | Where-Object {
        [System.IO.Path]::GetRelativePath($installedPath, $_.FullName) -ne '.vsixmanifest'
    })
    foreach ($file in $installedFiles) {
        $relative = [System.IO.Path]::GetRelativePath($installedPath, $file.FullName)
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

    $verification = [PSCustomObject]@{
        Extension = $expectedIdentity
        Artifact = (Split-Path -Leaf $resolvedVsix)
        VsixSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedVsix).Hash
        InstalledPath = $installedPath
        ArchiveFileCount = $archiveMap.Count
        InstalledFileCount = $installedMap.Count
        CanonicalPackageMatch = $canonicalPackageMatch
        InstallerMetadataNormalized = @('.vsixmanifest', 'package.json::__metadata')
        ExactPayloadMatch = $true
    }
} finally {
    $archive.Dispose()
}

Write-Host ($verification | ConvertTo-Json -Depth 3)
Write-Host 'SimpleGradient Studio installed with exact VSIX-to-installed payload parity.' -ForegroundColor Green
Write-Host 'Open it from the Command Palette: SimpleGradient: Open Gradient Studio.' -ForegroundColor Yellow
