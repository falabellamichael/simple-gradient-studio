param(
    [ValidateSet('Install', 'Status')]
    [string]$Action = 'Install',
    [string]$ProfilePath = ''
)

$ErrorActionPreference = 'Stop'
$extensionId = 'simple-gradient-studio'
$version = '0.2.0'
$schemaVersion = 1
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$maxRegistryBytes = 64KB
$maxRegistryEntries = 128
$maxManifestBytes = 64KB
$maxAssetBytes = 8MB
$maxPackageBytes = 16MB

function Assert-WithinRoot {
    param([string]$Root, [string]$Candidate, [string]$Label)
    $resolvedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $resolvedCandidate = [System.IO.Path]::GetFullPath($Candidate)
    if (-not ($resolvedCandidate + [System.IO.Path]::DirectorySeparatorChar).StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label resolved outside the SimpleRAG extension root: $resolvedCandidate"
    }
    return $resolvedCandidate
}

function Assert-PlainPath {
    param([string]$Path, [string]$Label, [switch]$Directory)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "$Label cannot be a symlink, junction, or other reparse point: $Path"
    }
    if ($Directory -and -not $item.PSIsContainer) {
        throw "$Label must be a directory: $Path"
    }
    if (-not $Directory -and $item.PSIsContainer) {
        throw "$Label must be a regular file: $Path"
    }
}

function Get-LowerSha256 {
    param([string]$Path)
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Write-Utf8File {
    param([string]$Path, [string]$Text)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}

function Write-AtomicUtf8File {
    param([string]$Root, [string]$Path, [string]$Text)
    $target = Assert-WithinRoot -Root $Root -Candidate $Path -Label 'Atomic file target'
    $directory = Split-Path -Parent $target
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    Assert-PlainPath -Path $directory -Label 'Atomic file directory' -Directory
    $temporary = Join-Path $directory ".$([System.IO.Path]::GetFileName($target)).$PID.$([guid]::NewGuid().ToString('N')).tmp"
    $temporary = Assert-WithinRoot -Root $Root -Candidate $temporary -Label 'Atomic temporary file'
    try {
        Write-Utf8File -Path $temporary -Text $Text
        Move-Item -LiteralPath $temporary -Destination $target -Force
    } finally {
        if (Test-Path -LiteralPath $temporary -PathType Leaf) {
            Remove-Item -LiteralPath $temporary -Force
        }
    }
}

function Remove-GeneratedDirectory {
    param([string]$Root, [string]$Path, [string]$ExpectedPrefix)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $resolved = Assert-WithinRoot -Root $Root -Candidate $Path -Label 'Generated cleanup directory'
    if (-not [System.IO.Path]::GetFileName($resolved).StartsWith($ExpectedPrefix, [System.StringComparison]::Ordinal)) {
        throw "Refusing to remove an unexpected directory: $resolved"
    }
    Assert-PlainPath -Path $resolved -Label 'Generated cleanup directory' -Directory
    Remove-Item -LiteralPath $resolved -Recurse -Force
}

if ($env:PYMU_RAG_EXTENSION_HOME) {
    $registryRoot = [System.IO.Path]::GetFullPath($env:PYMU_RAG_EXTENSION_HOME)
} elseif ($env:PYMU_RAG_HOME) {
    $registryRoot = Join-Path (Split-Path -Parent ([System.IO.Path]::GetFullPath($env:PYMU_RAG_HOME))) 'extensions'
} else {
    $localAppData = [Environment]::GetFolderPath('LocalApplicationData')
    if (-not $localAppData) { throw 'LOCALAPPDATA is unavailable.' }
    $registryRoot = Join-Path $localAppData 'RAGWorkspace\extensions'
}
$registryRoot = [System.IO.Path]::GetFullPath($registryRoot)
$registryPath = Join-Path $registryRoot 'registry.json'
$packageParent = Join-Path $registryRoot "packages\$extensionId"
$packagePath = Join-Path $packageParent $version
Assert-WithinRoot -Root $registryRoot -Candidate $registryPath -Label 'Registry path' | Out-Null
Assert-WithinRoot -Root $registryRoot -Candidate $packagePath -Label 'Package path' | Out-Null

if ($Action -eq 'Status') {
    $installed = $false
    $entry = $null
    if (Test-Path -LiteralPath $registryPath -PathType Leaf) {
        Assert-PlainPath -Path $registryPath -Label 'SimpleRAG registry'
        $registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
        $entry = @($registry.extensions | Where-Object { $_.id -eq $extensionId } | Select-Object -First 1)[0]
        $installed = $null -ne $entry -and (Test-Path -LiteralPath $packagePath -PathType Container)
    }
    [PSCustomObject]@{
        Extension = "$extensionId@$version"
        Installed = $installed
        Enabled = $entry.enabled -eq $true
        RegistryPath = $registryPath
        PackagePath = $packagePath
        ManifestSha256 = $entry.manifest_sha256
    } | ConvertTo-Json -Depth 4
    return
}

$assetRoot = Join-Path $PSScriptRoot 'simplerag-extension'
$runtimeScript = Join-Path $assetRoot 'simple-gradient-runtime.js'
$runtimeStyle = Join-Path $assetRoot 'simple-gradient-runtime.css'
if (-not $ProfilePath) { $ProfilePath = Join-Path $assetRoot 'default-profile.json' }
foreach ($required in @($runtimeScript, $runtimeStyle, $ProfilePath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Required SimpleRAG extension source file not found: $required"
    }
    Assert-PlainPath -Path $required -Label 'SimpleRAG extension source file'
}
if ((Get-Item -LiteralPath $ProfilePath).Length -gt $maxAssetBytes) {
    throw "The profile exceeds SimpleRAG's 8 MiB per-asset limit."
}

$profile = Get-Content -LiteralPath $ProfilePath -Raw | ConvertFrom-Json
if ($profile.schema -ne 'simple-gradient-profile' -or [int]$profile.version -ne 1) {
    throw 'The profile must use simple-gradient-profile schema version 1.'
}
$profileJson = $profile | ConvertTo-Json -Depth 100 -Compress
$profileScript = "window.__SIMPLE_GRADIENT_PROFILE__ = $profileJson;`n"

New-Item -ItemType Directory -Path $registryRoot -Force | Out-Null
New-Item -ItemType Directory -Path $packageParent -Force | Out-Null
Assert-PlainPath -Path $registryRoot -Label 'SimpleRAG extension registry root' -Directory
Assert-PlainPath -Path $packageParent -Label 'SimpleGradient package root' -Directory

$stagingPath = Join-Path $packageParent ".install-$([guid]::NewGuid().ToString('N'))"
$backupPath = Join-Path $packageParent ".backup-$([guid]::NewGuid().ToString('N'))"
$failedPath = Join-Path $packageParent ".failed-$([guid]::NewGuid().ToString('N'))"
foreach ($candidate in @($stagingPath, $backupPath, $failedPath)) {
    Assert-WithinRoot -Root $packageParent -Candidate $candidate -Label 'Generated package path' | Out-Null
}

$hadExistingPackage = Test-Path -LiteralPath $packagePath -PathType Container
$packagePromoted = $false
try {
    New-Item -ItemType Directory -Path $stagingPath | Out-Null
    Write-Utf8File -Path (Join-Path $stagingPath 'profile.js') -Text $profileScript
    Copy-Item -LiteralPath $runtimeScript -Destination (Join-Path $stagingPath 'simple-gradient-runtime.js')
    Copy-Item -LiteralPath $runtimeStyle -Destination (Join-Path $stagingPath 'simple-gradient-runtime.css')

    $scriptEntries = @(
        [ordered]@{ path = 'profile.js'; sha256 = Get-LowerSha256 (Join-Path $stagingPath 'profile.js'); size = (Get-Item -LiteralPath (Join-Path $stagingPath 'profile.js')).Length },
        [ordered]@{ path = 'simple-gradient-runtime.js'; sha256 = Get-LowerSha256 (Join-Path $stagingPath 'simple-gradient-runtime.js'); size = (Get-Item -LiteralPath (Join-Path $stagingPath 'simple-gradient-runtime.js')).Length }
    )
    $styleEntries = @(
        [ordered]@{ path = 'simple-gradient-runtime.css'; sha256 = Get-LowerSha256 (Join-Path $stagingPath 'simple-gradient-runtime.css'); size = (Get-Item -LiteralPath (Join-Path $stagingPath 'simple-gradient-runtime.css')).Length }
    )
    foreach ($asset in @($scriptEntries) + @($styleEntries)) {
        if ([long]$asset.size -gt $maxAssetBytes) {
            throw "SimpleRAG extension asset exceeds 8 MiB: $($asset.path)"
        }
    }
    $manifest = [ordered]@{
        schema_version = $schemaVersion
        id = $extensionId
        version = $version
        enabled = $true
        surfaces = @('advanced', 'comfy')
        scripts = $scriptEntries
        styles = $styleEntries
    }
    $manifestText = ($manifest | ConvertTo-Json -Depth 20) + "`n"
    if ($utf8NoBom.GetByteCount($manifestText) -gt $maxManifestBytes) {
        throw "The generated SimpleRAG manifest exceeds 64 KiB."
    }
    Write-Utf8File -Path (Join-Path $stagingPath 'manifest.json') -Text $manifestText
    $manifestSha256 = Get-LowerSha256 (Join-Path $stagingPath 'manifest.json')
    $packageBytes = @(Get-ChildItem -LiteralPath $stagingPath -File | Measure-Object -Property Length -Sum)[0].Sum
    if ([long]$packageBytes -gt $maxPackageBytes) {
        throw "The generated SimpleRAG package exceeds 16 MiB."
    }

    if (Test-Path -LiteralPath $registryPath -PathType Leaf) {
        Assert-PlainPath -Path $registryPath -Label 'SimpleRAG extension registry'
        if ((Get-Item -LiteralPath $registryPath).Length -gt $maxRegistryBytes) {
            throw "The existing SimpleRAG extension registry exceeds 64 KiB."
        }
        $registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
        if ([int]$registry.schema_version -ne $schemaVersion -or $null -eq $registry.extensions) {
            throw 'The existing SimpleRAG extension registry is not schema version 1.'
        }
    } else {
        $registry = [PSCustomObject]@{ schema_version = $schemaVersion; extensions = @() }
    }
    $otherEntries = @($registry.extensions | Where-Object { $_.id -ne $extensionId })
    $gradientEntry = [ordered]@{ id = $extensionId; version = $version; enabled = $true; manifest_sha256 = $manifestSha256 }
    $registry.extensions = @($otherEntries) + @($gradientEntry)
    if (@($registry.extensions).Count -gt $maxRegistryEntries) {
        throw "The updated SimpleRAG extension registry would exceed 128 entries."
    }
    $registryText = ($registry | ConvertTo-Json -Depth 100) + "`n"
    if ($utf8NoBom.GetByteCount($registryText) -gt $maxRegistryBytes) {
        throw "The updated SimpleRAG extension registry would exceed 64 KiB."
    }

    if ($hadExistingPackage) {
        Assert-PlainPath -Path $packagePath -Label 'Existing SimpleGradient package' -Directory
        Move-Item -LiteralPath $packagePath -Destination $backupPath
    }
    Move-Item -LiteralPath $stagingPath -Destination $packagePath
    $packagePromoted = $true
    try {
        Write-AtomicUtf8File -Root $registryRoot -Path $registryPath -Text $registryText
    } catch {
        if (Test-Path -LiteralPath $packagePath -PathType Container) {
            Move-Item -LiteralPath $packagePath -Destination $failedPath
        }
        if (Test-Path -LiteralPath $backupPath -PathType Container) {
            Move-Item -LiteralPath $backupPath -Destination $packagePath
        }
        Remove-GeneratedDirectory -Root $packageParent -Path $failedPath -ExpectedPrefix '.failed-'
        throw
    }

    $verifiedRegistry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
    $verifiedEntry = @($verifiedRegistry.extensions | Where-Object { $_.id -eq $extensionId })
    if ($verifiedEntry.Count -ne 1 -or $verifiedEntry[0].version -ne $version -or $verifiedEntry[0].enabled -ne $true -or $verifiedEntry[0].manifest_sha256 -ne $manifestSha256) {
        throw 'SimpleRAG extension registry verification failed after installation.'
    }
    if ((Get-LowerSha256 (Join-Path $packagePath 'manifest.json')) -ne $manifestSha256) {
        throw 'Installed SimpleRAG extension manifest hash does not match the registry.'
    }
    $verifiedManifest = Get-Content -LiteralPath (Join-Path $packagePath 'manifest.json') -Raw | ConvertFrom-Json
    $declaredAssets = @($verifiedManifest.scripts) + @($verifiedManifest.styles)
    foreach ($asset in $declaredAssets) {
        $assetPath = Join-Path $packagePath $asset.path
        if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
            throw "Installed SimpleRAG asset is missing: $($asset.path)"
        }
        if ((Get-Item -LiteralPath $assetPath).Length -ne [long]$asset.size -or (Get-LowerSha256 $assetPath) -ne $asset.sha256) {
            throw "Installed SimpleRAG asset failed size/hash verification: $($asset.path)"
        }
    }
    $expectedFiles = @('manifest.json', 'profile.js', 'simple-gradient-runtime.css', 'simple-gradient-runtime.js')
    $actualFiles = @(Get-ChildItem -LiteralPath $packagePath -File | ForEach-Object Name | Sort-Object)
    if (($actualFiles -join "`n") -ne (($expectedFiles | Sort-Object) -join "`n")) {
        throw 'Installed SimpleRAG package contains missing or unexpected files.'
    }

    Remove-GeneratedDirectory -Root $packageParent -Path $backupPath -ExpectedPrefix '.backup-'
    [PSCustomObject]@{
        Extension = "$extensionId@$version"
        RegistryPath = $registryPath
        PackagePath = $packagePath
        ManifestSha256 = $manifestSha256
        ProfileSha256 = Get-LowerSha256 (Join-Path $packagePath 'profile.js')
        PreservedOtherExtensions = $otherEntries.Count
        ExactPackageVerified = $true
    } | ConvertTo-Json -Depth 5
} finally {
    Remove-GeneratedDirectory -Root $packageParent -Path $stagingPath -ExpectedPrefix '.install-'
    if (-not $packagePromoted -and (Test-Path -LiteralPath $backupPath -PathType Container) -and -not (Test-Path -LiteralPath $packagePath)) {
        Move-Item -LiteralPath $backupPath -Destination $packagePath
    }
}
