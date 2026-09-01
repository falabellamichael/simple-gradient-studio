'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'media', 'studio.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'media', 'studio.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'media', 'studio.js'), 'utf8');
const modelSource = fs.readFileSync(path.join(root, 'src', 'model.ts'), 'utf8');
const installer = fs.readFileSync(path.join(root, 'install.ps1'), 'utf8');
const simpleRagInstaller = fs.readFileSync(path.join(root, 'install-simplerag.ps1'), 'utf8');
const installedVerifier = fs.readFileSync(path.join(root, 'scripts', 'verify-installed.ps1'), 'utf8');
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
const vscodeIgnore = fs.readFileSync(path.join(root, '.vscodeignore'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('webview has a restrictive CSP and nonce-backed external script', () => {
  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'nonce-\{\{nonce\}\}'/);
  assert.match(html, /<script nonce="\{\{nonce\}\}" src="\{\{scriptUri\}\}\?v=14"><\/script>/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
});

test('selected concept structure and core interactions are present', () => {
  for (const id of [
    'assignmentPopout', 'stopModal', 'presetList', 'stopRail', 'targetModeButton',
    'applyTargetButton', 'applyGlobalButton', 'pageSelect', 'exportButton',
    'selectedContextName', 'useParentButton', 'revertDefaultButton', 'scopeDrawerButton',
    'targetCatalogSelect', 'installSimpleRagButton', 'scopeTree', 'samplePageNav'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /data-gradient-target="panel:workbench\.inspector"/);
  assert.match(script, /host\.postMessage\(\{ type: 'openView'/);
  assert.match(script, /function openModal/);
  assert.match(script, /openModal\(handle\)/);
  assert.match(script, /classList\.add\('open'\)/);
  assert.match(script, /scopeDrawerOpen/);
  assert.match(script, /function renderAssignments/);
});

test('standalone preview remains neutral while SimpleRAG is an explicit optional target', () => {
  const combined = `${html}\n${css}\n${script}\n${modelSource}\n${JSON.stringify(pkg)}`;
  const legacyBrandPattern = new RegExp([
    ['Her', 'mes'].join(''),
    ['Ol', 'lama'].join(''),
    ['LM', ' Studio'].join('')
  ].join('|'), 'i');
  const blockedCopyPattern = new RegExp([
    ['ready', 'when you are'].join(' '),
    ['one place', 'to ask'].join(' '),
    ['talk', 'to document'].join(' '),
    ['plan', 'my day'].join(' '),
    ['draft', 'an email'].join(' '),
    ['explore', 'knowledge'].join(' '),
    ['chat', 'history'].join(' '),
    ['assistant', 'settings'].join(' '),
    ['pro', 'vider'].join(''),
    ['model', 'small'].join('-'),
    ['11', '434'].join('')
  ].join('|'), 'i');
  assert.doesNotMatch(combined, legacyBrandPattern);
  assert.doesNotMatch(combined, blockedCopyPattern);
  assert.doesNotMatch(combined, /page:(overview|mail|documents|knowledge)|panel:[^'"\s]+\.(composer|history|actions|canvas)/i);
  assert.match(combined, /DESIGN SYSTEM WORKBENCH/);
  assert.match(combined, /panel:workbench\.inspector/);
  assert.match(combined, /SimpleGradient Studio/);
  assert.match(combined, /targetCatalogSelect/);
  assert.match(script, /simplerag:/);
  assert.match(script, /id: 'calendar', label: 'Calendar'/);
  assert.match(script, /id: 'composer', label: 'Composer'/);
  assert.match(script, /composer: 'composer'/);
  assert.match(script, /panel:\$\{page\.id\}\.\$\{surface\.id\}/);
  assert.match(script, /type: 'installSimpleRag'/);
});

test('extension identity and commands cannot collide with SimpleTheme', () => {
  assert.equal(`${pkg.publisher}.${pkg.name}`, 'falabella.simple-gradient-studio');
  assert.ok(pkg.activationEvents.every((event) => !event.includes('simpletheme')));
  assert.ok(pkg.contributes.commands.every((command) => command.command.startsWith('simpleGradient.')));
});

test('release installer is self-contained and packaged assets retain third-party notices', () => {
  assert.doesNotMatch(installer, /verify-installed\.ps1/i);
  assert.doesNotMatch(installer, /Convert\]::ToHexString|Path\]::GetRelativePath/i);
  assert.match(installer, /BitConverter\]::ToString/);
  assert.match(installer, new RegExp(`\\$version = '${pkg.version.replaceAll('.', '\\.')}'`));
  assert.ok(pkg.scripts.package.includes(`vsce package --out simple-gradient-studio-${pkg.version}.vsix`));
  assert.match(installer, /ExactPayloadMatch = \$true/);
  assert.match(notices, /Codicons/i);
  assert.match(notices, /Creative Commons Attribution 4\.0/i);
  assert.match(vscodeIgnore, /scripts\/\*\*/);
  assert.match(vscodeIgnore, /\*\.zip/);
  assert.match(simpleRagInstaller, /\$maxRegistryEntries = 128/);
  assert.match(simpleRagInstaller, /\$maxRegistryBytes = 64KB/);
  assert.match(simpleRagInstaller, /\$maxAssetBytes = 8MB/);
  assert.match(simpleRagInstaller, /\$maxPackageBytes = 16MB/);
  assert.match(simpleRagInstaller, /Installed SimpleRAG asset failed size\/hash verification/);
  assert.match(installedVerifier, new RegExp(`simple-gradient-studio-${pkg.version.replaceAll('.', '\\.')}\\.vsix`));
  assert.match(installedVerifier, new RegExp(`ExpectedVersion = '${pkg.version.replaceAll('.', '\\.')}'`));
  assert.match(vscodeIgnore, /install\.ps1/);
  for (const license of ['codicons-CC-BY-4.0.txt', 'codicons-MIT.txt']) {
    assert.equal(fs.existsSync(path.join(root, 'licenses', license)), true);
  }
});

test('webview JavaScript parses as a standalone script', () => {
  assert.doesNotThrow(() => new Function(script));
});

test('responsive states cover wide, medium, compact, narrow, and very narrow widths', () => {
  for (const breakpoint of ['1319px', '979px', '759px', '479px']) {
    assert.match(css, new RegExp(`max-width: ${breakpoint.replace('.', '\\.').replace('(', '\\(').replace(')', '\\)')}`));
  }
});

