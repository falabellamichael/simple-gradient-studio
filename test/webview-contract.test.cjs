'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'media', 'studio.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'media', 'studio.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'media', 'studio.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('webview has a restrictive CSP and nonce-backed external script', () => {
  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'nonce-\{\{nonce\}\}'/);
  assert.match(html, /<script nonce="\{\{nonce\}\}" src="\{\{scriptUri\}\}\?v=10"><\/script>/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
});

test('selected concept structure and core interactions are present', () => {
  for (const id of [
    'assignmentPopout', 'stopModal', 'presetList', 'stopRail', 'targetModeButton',
    'applyTargetButton', 'applyGlobalButton', 'pageSelect', 'exportButton',
    'selectedContextName', 'useParentButton', 'revertDefaultButton', 'scopeDrawerButton'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /data-gradient-target="panel:overview\.assistant"/);
  assert.match(script, /host\.postMessage\(\{ type: 'openView'/);
  assert.match(script, /function openModal/);
  assert.match(script, /openModal\(handle\)/);
  assert.match(script, /classList\.add\('open'\)/);
  assert.match(script, /scopeDrawerOpen/);
  assert.match(script, /function renderAssignments/);
});

test('standalone product does not retain SimpleRAG or Hermes branding', () => {
  const combined = `${html}\n${css}\n${script}\n${JSON.stringify(pkg)}`;
  assert.doesNotMatch(combined, /SimpleRAG|Hermes|Comfy|Ollama|LM Studio/i);
  assert.match(combined, /SimpleGradient Studio/);
});

test('extension identity and commands cannot collide with SimpleTheme', () => {
  assert.equal(`${pkg.publisher}.${pkg.name}`, 'falabella.simple-gradient-studio');
  assert.ok(pkg.activationEvents.every((event) => !event.includes('simpletheme')));
  assert.ok(pkg.contributes.commands.every((command) => command.command.startsWith('simpleGradient.')));
});

test('webview JavaScript parses as a standalone script', () => {
  assert.doesNotThrow(() => new Function(script));
});

test('responsive states cover wide, medium, compact, narrow, and very narrow widths', () => {
  for (const breakpoint of ['1319px', '979px', '759px', '479px']) {
    assert.match(css, new RegExp(`max-width: ${breakpoint.replace('.', '\\.').replace('(', '\\(').replace(')', '\\)')}`));
  }
});
