'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const runtimePath = path.join(__dirname, '..', 'simplerag-extension', 'simple-gradient-runtime.js');
const cssPath = path.join(__dirname, '..', 'simplerag-extension', 'simple-gradient-runtime.css');
const runtimeSource = fs.readFileSync(runtimePath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');
const runtime = require(runtimePath);

test('manifest pins the ordered native runtime payload to the package version', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'simplerag-extension', 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.id, 'simple-gradient-studio');
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.enabled, true);
  assert.deepEqual(manifest.surfaces, ['advanced', 'comfy']);
  assert.deepEqual(manifest.scripts.map((asset) => asset.path), ['profile.js', 'simple-gradient-runtime.js']);
  assert.deepEqual(manifest.styles.map((asset) => asset.path), ['simple-gradient-runtime.css']);

  for (const asset of [...manifest.scripts, ...manifest.styles]) {
    const bytes = fs.readFileSync(path.join(__dirname, '..', 'simplerag-extension', asset.path));
    assert.equal(bytes.length, asset.size, `${asset.path} size`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${asset.path} sha256`);
  }
});

test('placeholder profile script exposes the checked-in native default profile', () => {
  const defaultProfile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'simplerag-extension', 'default-profile.json'), 'utf8'));
  const profileSource = fs.readFileSync(path.join(__dirname, '..', 'simplerag-extension', 'profile.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(profileSource, sandbox, { filename: 'profile.js' });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.__SIMPLE_GRADIENT_PROFILE__)), defaultProfile);
});

test('normalizes profile data without accepting selectors or raw CSS', () => {
  const profile = runtime.normalizeProfile({
    name: 'Imported profile',
    gradients: {
      safe: {
        angle: 900,
        stops: [
          { color: '#112233', position: -20, opacity: 150 },
          { color: 'url(https://bad.example)', position: 120, opacity: -1 }
        ]
      },
      'bad > selector': { stops: [] }
    },
    assignments: {
      app: { mode: 'gradient', gradientId: 'safe' },
      'panel:home.assistant': { mode: 'solid' },
      'panel:home.assistant > script': { mode: 'gradient', gradientId: 'safe' }
    }
  });

  assert.deepEqual(Object.keys(profile.gradients), ['safe']);
  assert.equal(profile.gradients.safe.angle, 359);
  assert.deepEqual(profile.gradients.safe.stops, [
    { color: '#112233', position: 0, opacity: 100 },
    { color: '#E86633', position: 100, opacity: 0 }
  ]);
  assert.deepEqual(profile.assignments['panel:home.assistant'], { mode: 'solid' });
  assert.equal(profile.assignments['panel:home.assistant > script'], undefined);
  assert.doesNotMatch(runtime.gradientToCss(profile.gradients.safe), /url\(|bad\.example/i);
});

test('uses the first safe imported gradient when an app assignment is absent', () => {
  const profile = runtime.normalizeProfile({
    gradients: {
      imported: {
        stops: [
          { color: '#010203', position: 0 },
          { color: '#040506', position: 100 }
        ]
      }
    },
    assignments: {}
  });

  assert.deepEqual(profile.assignments.app, { mode: 'gradient', gradientId: 'imported' });
});

test('resolves panel, page, solid, and app inheritance in order', () => {
  const profile = runtime.normalizeProfile({
    gradients: {
      app: { angle: 10, stops: [{ color: '#111111', position: 0 }, { color: '#222222', position: 100 }] },
      panel: { angle: 20, stops: [{ color: '#333333', position: 0 }, { color: '#444444', position: 100 }] }
    },
    assignments: {
      app: { mode: 'gradient', gradientId: 'app' },
      'page:home': { mode: 'solid' },
      'panel:home.assistant': { mode: 'gradient', gradientId: 'panel' }
    }
  });
  const homePages = runtime.pageTargetCandidates('comfy', 'home');

  const assistant = runtime.resolveGradientForTargets(
    profile,
    runtime.panelTargetCandidates('comfy', 'home', 'assistant'),
    homePages
  );
  assert.equal(assistant.target, 'panel:home.assistant');
  assert.equal(assistant.gradient.id, 'panel');

  const workspace = runtime.resolveGradientForTargets(
    profile,
    runtime.panelTargetCandidates('comfy', 'home', 'workspace'),
    homePages
  );
  assert.equal(workspace.target, 'page:home');
  assert.equal(workspace.gradient, null);

  const journal = runtime.resolveGradientForTargets(
    profile,
    runtime.panelTargetCandidates('advanced', 'journal', 'workspace'),
    runtime.pageTargetCandidates('advanced', 'journal')
  );
  assert.equal(journal.target, 'app');
  assert.equal(journal.gradient.id, 'app');
});

test('maps overview profiles to native Comfy home and keeps selectors fixed', () => {
  assert.deepEqual(runtime.pageTargetCandidates('comfy', 'home'), [
    'page:comfy-home',
    'page:home',
    'page:overview'
  ]);
  assert.ok(runtime.panelTargetCandidates('comfy', 'home', 'assistant').includes('panel:overview.assistant'));
  assert.ok(runtime.SURFACE_SELECTORS.comfy.toolbar.includes('.topbar'));
  assert.ok(!runtime.SURFACE_SELECTORS.comfy.navigation.includes('.topbar'));
  assert.ok(runtime.SURFACE_SELECTORS.advanced.navigation.includes('#app-bar'));
  assert.ok(runtime.SURFACE_SELECTORS.advanced.toolbar.includes('.ribbon'));
  assert.ok(!runtime.SURFACE_SELECTORS.advanced.navigation.includes('.ribbon'));
  assert.ok(runtime.SURFACE_SELECTORS.advanced.cards.includes('#list-pane'));
  assert.ok(!runtime.SURFACE_SELECTORS.advanced.navigation.includes('#list-pane'));
  assert.ok(runtime.SURFACE_SELECTORS.comfy.workspace.includes('.modal-backdrop > .editor.workspace-editor'));
  assert.ok(runtime.SURFACE_SELECTORS.comfy.assistant.includes('.expanded-chat-canvas'));
  assert.ok(runtime.SURFACE_SELECTORS.comfy.cards.includes('.pdf-preview-backdrop > .pdf-preview-dialog'));
  assert.ok(runtime.SURFACE_SELECTORS.comfy.toolbar.includes('.view-context-menu-popover'));
  assert.ok(runtime.SURFACE_SELECTORS.advanced.workspace.includes('#pdfFocusOverlay .pdf-focus-shell'));
  assert.ok(runtime.SURFACE_SELECTORS.advanced.cards.includes('.workspace-plugin-backdrop > .workspace-plugin-dialog'));
  assert.ok(runtime.SURFACE_SELECTORS.advanced.toolbar.includes('body > .graph-color-selector[role="dialog"]'));
  assert.doesNotMatch(runtimeSource, /querySelectorAll\s*\(\s*(target|rawTarget|profile|assignment)/);
});

test('a later explicit solid clears an earlier gradient on a shared hierarchy boundary', () => {
  assert.equal(runtime.resolvedSurfaceAction({ target: 'app', gradient: { id: 'app' }, explicit: true }), 'apply');
  assert.equal(runtime.resolvedSurfaceAction({ target: 'page:home', gradient: null, explicit: true }), 'clear');
  assert.equal(runtime.resolvedSurfaceAction({ target: 'page:home', gradient: null, explicit: false }), 'skip');
  assert.match(runtimeSource, /clearElement\(element\);\s*state\.appliedElements\.delete\(element\)/);
  assert.match(runtimeSource, /appliedCount = state\.appliedElements\.size/);
});

test('detects current Comfy and Advanced pages from native page signals', () => {
  const comfyDocument = {
    querySelector(selector) {
      if (selector === '.shell') return {};
      if (selector === '.page-workspace-layout[data-page]') return { dataset: { page: 'tasks' } };
      return null;
    }
  };
  const advancedDocument = {
    querySelector(selector) {
      if (selector === '.outlook-app') return {};
      if (selector === '#app-bar .app-icon.active[data-app]') return { dataset: { app: 'pdf' } };
      return null;
    }
  };
  const expandedHomeDocument = {
    querySelector(selector) {
      if (selector === '.expanded-home-chat') return {};
      return null;
    }
  };

  assert.deepEqual(runtime.detectContext(comfyDocument), { surface: 'comfy', page: 'tasks' });
  assert.deepEqual(runtime.detectContext(advancedDocument), { surface: 'advanced', page: 'pdf' });
  assert.deepEqual(runtime.detectContext(expandedHomeDocument), { surface: 'comfy', page: 'home' });
});

test('surface styling layers background images without changing native text colors', () => {
  assert.match(cssSource, /\[data-simple-gradient-runtime-surface\][\s\S]*background-image:/);
  const surfaceRule = cssSource.match(/\[data-simple-gradient-runtime-surface\]\s*\{([^}]+)\}/)?.[1] || '';
  assert.ok(surfaceRule);
  assert.doesNotMatch(surfaceRule, /(^|[;\s])color\s*:/i);
  assert.match(runtimeSource, /MutationObserver/);
  assert.match(runtimeSource, /simple-gradient-runtime__launcher/);
  assert.match(runtimeSource, /data-runtime-enabled/);
  assert.match(runtimeSource, /data-runtime-reset/);
  assert.match(runtimeSource, /data-runtime-reapply/);
});
