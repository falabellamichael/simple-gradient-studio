# SimpleGradient Studio

SimpleGradient Studio is a standalone VS Code extension for designing reusable linear gradients and assigning them at three levels:

- App default
- Individual pages
- Individual panels

Each target can inherit its parent, use a specific gradient, or explicitly use no gradient. The editor includes a live targetable preview, assignment matrix, reusable gradient library, stop editor, contrast feedback, JSON import/export, CSS export, and synchronized companion panels for Preview and Assignments.

## Open the Studio

After installation, use any of these commands from the Command Palette:

- `SimpleGradient: Open Gradient Studio`
- `SimpleGradient: Open Gradient Assignments`
- `SimpleGradient: Open Gradient Preview`

Preview and Assignments open as independent VS Code editor panels. Move either editor tab into another VS Code window with **Move into New Window** when you want an OS-level floating window. VS Code owns that window and its placement; the extension keeps the panel data synchronized.

## Install the exact packaged build

1. Download both `simple-gradient-studio-0.1.1.vsix` and `install.ps1` from the GitHub release into the same folder.
2. Run:

```powershell
.\install.ps1
```

The installer is self-contained: it does not depend on the repository's `scripts/` directory and never chooses the newest matching file. It installs the exact `0.1.1` artifact and then compares every file inside the VSIX with every file in the installed extension directory. Any missing, extra, or hash-mismatched file fails the installation check.

Manual installation is also supported:

```powershell
code.cmd --install-extension .\simple-gradient-studio-0.1.1.vsix --force
```

## Development

```powershell
npm.cmd install
npm.cmd test
npm.cmd run preview
npm.cmd run package
```

The local visual preview is served at `http://127.0.0.1:4177`. The packaged extension uses the same `media/studio.html`, `media/studio.css`, and `media/studio.js` payload.

## Profile safety

Imported profiles are normalized by the extension host:

- Linear gradients only
- Angles clamped to 0–359 degrees
- Two to eight stops
- Hex colors only
- Positions and opacity clamped to 0–100
- Stable app/page/panel target identifiers only
- No arbitrary selectors, URLs, or raw CSS imports

## License

SimpleGradient Studio is MIT licensed. The bundled Codicons font and CSS retain their upstream Microsoft licenses and attribution; see `THIRD_PARTY_NOTICES.md` and `licenses/`.
