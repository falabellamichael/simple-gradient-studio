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

$verification = & (Join-Path $PSScriptRoot 'scripts\verify-installed.ps1') `
    -VsixPath $vsix `
    -ExtensionId $extensionId `
    -ExpectedVersion $version `
    -CodeCommand $CodeCommand
if ($LASTEXITCODE -ne 0) {
    throw 'Installed payload verification failed.'
}

Write-Host $verification
Write-Host 'SimpleGradient Studio installed with exact VSIX-to-installed payload parity.' -ForegroundColor Green
Write-Host 'Open it from the Command Palette: SimpleGradient: Open Gradient Studio.' -ForegroundColor Yellow
