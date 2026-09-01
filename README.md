# SimpleGradient Studio

SimpleGradient Studio has two coordinated parts:

- A standalone VS Code editor for designing and previewing gradients.
- A native SimpleRAG local extension that applies the selected profile inside both the Comfy and Advanced SimpleRAG surfaces.

Inside SimpleRAG, open the editor from **Advanced → Settings → Appearance**, or from Comfy's corresponding **Settings → Themes** appearance area. The native entry is intentionally absent from every other page. It opens the complete Gradient Studio as a large in-app editor; the VS Code editor remains an optional companion.

Gradients can be assigned at three levels:

- App default
- Individual pages
- Individual panels

Each target can inherit its parent, use a specific gradient, or explicitly use no gradient. The editor includes a live targetable preview, assignment matrix, reusable gradient library, stop editor, contrast feedback, JSON import/export, CSS export, and synchronized companion panels for Preview and Assignments.

The SimpleRAG catalog includes Home, Journal, Tasks, Email, Calendar, PDF, Knowledge Graph, Plug-ins, and Settings. Every page has independent Navigation, Workspace, Cards, Assistant, Toolbar, and Composer targets. Supported modal and pop-out surfaces inherit their corresponding panel, page, and app assignments without overwriting SimpleRAG's native theme or wallpaper settings.

## Open the Studio

After installation, use any of these commands from the Command Palette:

- `SimpleGradient: Open Gradient Studio`
- `SimpleGradient: Open Gradient Assignments`
- `SimpleGradient: Open Gradient Preview`
- `SimpleGradient: Install or Update SimpleRAG Extension`

Preview and Assignments open as independent VS Code editor panels. Move either editor tab into another VS Code window with **Move into New Window** when you want an OS-level floating window. VS Code owns that window and its placement; the extension keeps the panel data synchronized.

## Apply a profile to SimpleRAG

1. Open Gradient Studio.
2. Set **Target application** to **SimpleRAG**.
3. Assign gradients to the app, any page, or any individual panel.
4. Select **Apply to SimpleRAG**, or run `SimpleGradient: Install or Update SimpleRAG Extension` from the Command Palette.
5. Reload any SimpleRAG window that was already open.

This installs the current profile into SimpleRAG's persistent, hash-verified local-extension registry at `%LOCALAPPDATA%\RAGWorkspace\extensions`. Existing extensions, including MiniLMX, are preserved.

## Install the exact packaged build

1. Download both `simple-gradient-studio-0.3.0.vsix` and `install.ps1` from the GitHub release into the same folder.
2. Run:

```powershell
.\install.ps1
```

The installer is self-contained: it does not depend on the repository's `scripts/` directory and never chooses the newest matching file. It installs the exact `0.3.0` artifact and then compares every file inside the VSIX with every file in the installed extension directory. Any missing, extra, or hash-mismatched file fails the installation check.

Manual installation is also supported:

```powershell
code.cmd --install-extension .\simple-gradient-studio-0.3.0.vsix --force
```

## Install only the SimpleRAG extension

Download `simple-gradient-studio-simplerag-0.3.0.zip` from the release, extract it, and run:

```powershell
.\install-simplerag.ps1
```

The bundle installs the same runtime used by the VS Code **Apply to SimpleRAG** action. To install an exported profile instead of the included default:

```powershell
.\install-simplerag.ps1 -ProfilePath .\my-gradient-profile.json
```

Check its installed state with:

```powershell
.\install-simplerag.ps1 -Action Status
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

The SimpleRAG runtime validates the profile again and maps semantic targets through a fixed selector allowlist. It layers `background-image` values over existing surfaces, leaves native theme colors and saved wallpapers intact, and does not write to SimpleRAG's own theme storage.

## License

SimpleGradient Studio is MIT licensed. The bundled Codicons font and CSS retain their upstream Microsoft licenses and attribution; see `THIRD_PARTY_NOTICES.md` and `licenses/`.
