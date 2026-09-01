/*
 * SimpleGradient runtime for the native SimpleRAG Comfy and Advanced shells.
 *
 * The host may assign a schema-v1 profile to window.__SIMPLE_GRADIENT_PROFILE__
 * before this script runs. Profile data is normalized here and can never supply
 * selectors or raw CSS; all SimpleRAG surface selectors are fixed below.
 */
(function simpleGradientRuntimeBootstrap(global) {
  'use strict';

  const RUNTIME_VERSION = '0.2.0';
  const ENABLED_STORAGE_KEY = 'simpleGradient.runtime.enabled';
  const ROOT_ID = 'simple-gradient-runtime-root';
  const SURFACE_ATTRIBUTE = 'data-simple-gradient-runtime-surface';
  const TARGET_ATTRIBUTE = 'data-simple-gradient-runtime-target';
  const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
  const SAFE_TARGET = /^(app|page:[a-z0-9-]+|panel:[a-z0-9-]+\.[a-z0-9-]+)$/;
  const SAFE_HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

  const DEFAULT_PROFILE = {
    schema: 'simple-gradient-profile',
    version: 1,
    name: 'SimpleGradient Native Overlay',
    gradients: {
      'native-warmth': {
        id: 'native-warmth',
        name: 'Native Warmth',
        type: 'linear',
        angle: 132,
        stops: [
          { color: '#FFF4E8', position: 0, opacity: 18 },
          { color: '#E86633', position: 100, opacity: 12 }
        ]
      }
    },
    assignments: {
      app: { mode: 'gradient', gradientId: 'native-warmth' }
    },
    editor: {
      activePage: 'home',
      activeTarget: 'app',
      targetMode: false,
      zoom: 100
    }
  };

  const PANEL_ALIASES = Object.freeze({
    navigation: Object.freeze(['navigation', 'nav', 'history', 'left-rail']),
    workspace: Object.freeze(['workspace', 'canvas', 'content']),
    assistant: Object.freeze(['assistant', 'ai']),
    cards: Object.freeze(['cards', 'card']),
    toolbar: Object.freeze(['toolbar', 'actions']),
    composer: Object.freeze(['composer'])
  });

  // These selectors are runtime-owned allowlists. Profile data is never used as
  // a selector, preventing imported theme data from reaching querySelectorAll.
  const SURFACE_SELECTORS = Object.freeze({
    comfy: Object.freeze({
      app: Object.freeze(['.shell', '.expanded-home-chat']),
      page: Object.freeze(['.main-stage', '.page-workspace-layout[data-page]', '.expanded-home-chat']),
      navigation: Object.freeze([
        '.edge-helper.edge-left .helper-panel',
        '.edge-helper.edge-left .chat-rail'
      ]),
      workspace: Object.freeze([
        '.main-stage > .home',
        '.page-workspace-layout > .workspace',
        '.workspace > .page',
        '.modal-backdrop > .editor.workspace-editor',
        '.page-workspace-layout .tasks-menu-panel',
        '.page-workspace-layout .tasks-list-column',
        '.page-workspace-layout .journal-menu-panel',
        '.page-workspace-layout .journal-list-column',
        '.page-workspace-layout .email-menu-panel',
        '.page-workspace-layout .email-list-column',
        '.page-workspace-layout .pdf-file-list',
        '.page-workspace-layout .pdf-preview-inline-wrapper',
        '.page-workspace-layout .knowledge-graph',
        '.page-workspace-layout .settings-center'
      ]),
      assistant: Object.freeze([
        '.assistant',
        '.assistant.assistant-embedded',
        '.expanded-chat-canvas',
        '.assistant-chat-history-popover',
        '.modal-backdrop > .editor.endpoint-editor',
        '.edge-helper.edge-right .helper-panel',
        '.edge-helper.edge-right .endpoint-helper'
      ]),
      cards: Object.freeze([
        '.main-stage .quick',
        '.main-stage .quick > button',
        '.main-stage .dashboard',
        '.main-stage .dashboard > article',
        '.main-stage .answer',
        '.main-stage .list',
        '.main-stage .graph',
        '.page-workspace-layout .list',
        '.page-workspace-layout .settings-tile',
        '.page-workspace-layout .settings-tiles',
        '.page-workspace-layout .settings-detail',
        '.page-workspace-layout .pdf-preview-inline',
        '.pdf-preview-backdrop > .pdf-preview-dialog',
        '.tutorial-intro-backdrop > .tutorial-intro',
        '.page-workspace-layout .kg-inspector'
      ]),
      toolbar: Object.freeze([
        '.topbar',
        '.main-stage .actions',
        '.page-workspace-layout .actions',
        '.page-workspace-layout .kg-toolbar',
        '.page-workspace-layout .pdf-toolbar',
        '.page-workspace-layout .workspace-format-toolbar',
        '[data-tutorial-id="home-display-menu"][role="dialog"]',
        '.view-context-menu-popover'
      ]),
      composer: Object.freeze([
        '.main-stage .ask',
        '.assistant .assistant-composer',
        '.assistant form'
      ])
    }),
    advanced: Object.freeze({
      app: Object.freeze(['.outlook-app']),
      page: Object.freeze(['#main-body']),
      navigation: Object.freeze([
        '#app-bar',
        '#nav-pane'
      ]),
      workspace: Object.freeze([
        '#reading-pane',
        '#reading-pane .reading-content',
        '#reading-pane .pdf-workspace',
        '#reading-pane .knowledge-graph',
        '#pdfFocusOverlay .pdf-focus-shell'
      ]),
      assistant: Object.freeze([
        '#ai-sidebar',
        '#ai-sidebar .ai-chat-surface'
      ]),
      cards: Object.freeze([
        '#list-pane',
        '#reading-pane .settings-card',
        '#reading-pane .settings-section-card',
        '#reading-pane .settings-preview-panel',
        '#reading-pane .plugin-card',
        '#reading-pane .plugin-policy-card',
        '#reading-pane .pdf-card',
        '#reading-pane .graph-details-card',
        '#reading-pane .calendar-provider-card',
        '#reading-pane .calendar-system-card',
        '#reading-pane .memory-card',
        '#reading-pane .rag-ocr-console-card',
        '#reading-pane .llama-cpp-host-card',
        '#reading-pane .llama-cpp-gpu-card',
        '#reading-pane .index-doc-tile',
        '#ai-sidebar .ai-context-panel',
        '.plugin-modal-backdrop > .plugin-install-dialog',
        '.workspace-plugin-backdrop > .workspace-plugin-palette',
        '.workspace-plugin-backdrop > .workspace-plugin-dialog',
        '#memory-plugin-overlay-root .memory-overlay',
        '.calendar-modal-backdrop > .calendar-event-modal',
        '.rag-tutorial-popover[role="dialog"]'
      ]),
      toolbar: Object.freeze([
        '.ribbon',
        '#ribbon-actions',
        '#workspace-format-toolbar',
        '#graph-toolbar',
        '#graph-toolbar-strip',
        'body > .graph-color-selector[role="dialog"]'
      ]),
      composer: Object.freeze([
        '#ai-sidebar .chat-input-area',
        '#ai-sidebar .ai-composer-shell',
        '#ai-sidebar form'
      ])
    })
  });

  const clamp = (value, minimum, maximum) => {
    const number = Number(value);
    return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : minimum));
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function normalizeHex(value, fallback) {
    return typeof value === 'string' && SAFE_HEX.test(value)
      ? value.toUpperCase()
      : fallback;
  }

  function normalizeStop(value, index) {
    const raw = value && typeof value === 'object' ? value : {};
    return {
      color: normalizeHex(raw.color, index === 0 ? '#FFF4E8' : '#E86633'),
      position: Math.round(clamp(raw.position, 0, 100)),
      opacity: Math.round(clamp(raw.opacity == null ? 100 : raw.opacity, 0, 100))
    };
  }

  function normalizeGradient(id, value) {
    const raw = value && typeof value === 'object' ? value : {};
    let stops = Array.isArray(raw.stops)
      ? raw.stops.slice(0, 8).map(normalizeStop)
      : [];
    if (stops.length < 2) {
      stops = [normalizeStop(undefined, 0), normalizeStop(undefined, 1)];
      stops[1].position = 100;
    }
    stops.sort((left, right) => left.position - right.position);
    return {
      id,
      name: typeof raw.name === 'string' && raw.name.trim()
        ? raw.name.trim().slice(0, 80)
        : 'Untitled gradient',
      type: 'linear',
      angle: Math.round(clamp(raw.angle, 0, 359)),
      stops
    };
  }

  function normalizeProfile(value) {
    const fallback = clone(DEFAULT_PROFILE);
    if (!value || typeof value !== 'object') return fallback;

    const gradients = {};
    const rawGradients = value.gradients && typeof value.gradients === 'object'
      ? value.gradients
      : {};
    for (const [rawId, definition] of Object.entries(rawGradients).slice(0, 64)) {
      const id = String(rawId).toLowerCase();
      if (SAFE_ID.test(id)) gradients[id] = normalizeGradient(id, definition);
    }
    if (!Object.keys(gradients).length) Object.assign(gradients, fallback.gradients);

    const assignments = {};
    const rawAssignments = value.assignments && typeof value.assignments === 'object'
      ? value.assignments
      : {};
    for (const [rawTarget, definition] of Object.entries(rawAssignments).slice(0, 256)) {
      const target = String(rawTarget).toLowerCase();
      if (!SAFE_TARGET.test(target) || !definition || typeof definition !== 'object') continue;
      if (definition.mode === 'solid') {
        assignments[target] = { mode: 'solid' };
      } else if (
        definition.mode === 'gradient'
        && typeof definition.gradientId === 'string'
        && gradients[definition.gradientId.toLowerCase()]
      ) {
        assignments[target] = {
          mode: 'gradient',
          gradientId: definition.gradientId.toLowerCase()
        };
      } else {
        assignments[target] = { mode: 'inherit' };
      }
    }
    if (!assignments.app) {
      assignments.app = { mode: 'gradient', gradientId: Object.keys(gradients)[0] };
    }

    const rawEditor = value.editor && typeof value.editor === 'object' ? value.editor : {};
    const activePage = typeof rawEditor.activePage === 'string' && SAFE_ID.test(rawEditor.activePage)
      ? rawEditor.activePage
      : fallback.editor.activePage;
    const activeTarget = typeof rawEditor.activeTarget === 'string' && SAFE_TARGET.test(rawEditor.activeTarget)
      ? rawEditor.activeTarget
      : fallback.editor.activeTarget;

    return {
      schema: 'simple-gradient-profile',
      version: 1,
      name: typeof value.name === 'string' && value.name.trim()
        ? value.name.trim().slice(0, 100)
        : fallback.name,
      gradients,
      assignments,
      editor: {
        activePage,
        activeTarget,
        targetMode: rawEditor.targetMode === true,
        zoom: Math.round(clamp(rawEditor.zoom == null ? 100 : rawEditor.zoom, 70, 140))
      }
    };
  }

  function stopToCss(stop) {
    const red = parseInt(stop.color.slice(1, 3), 16);
    const green = parseInt(stop.color.slice(3, 5), 16);
    const blue = parseInt(stop.color.slice(5, 7), 16);
    const embeddedAlpha = stop.color.length === 9
      ? parseInt(stop.color.slice(7, 9), 16) / 255
      : 1;
    const alpha = embeddedAlpha * clamp(stop.opacity, 0, 100) / 100;
    const color = alpha >= 0.999
      ? stop.color.slice(0, 7)
      : `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`;
    return `${color} ${Math.round(clamp(stop.position, 0, 100))}%`;
  }

  function gradientToCss(gradient) {
    if (!gradient || !Array.isArray(gradient.stops) || gradient.stops.length < 2) return '';
    return `linear-gradient(${Math.round(clamp(gradient.angle, 0, 359))}deg, ${gradient.stops.map(stopToCss).join(', ')})`;
  }

  function resolvedSurfaceAction(resolved) {
    if (resolved?.gradient) return 'apply';
    if (resolved?.explicit) return 'clear';
    return 'skip';
  }

  function pageTargetCandidates(surface, page) {
    const safeSurface = SAFE_ID.test(String(surface || '')) ? String(surface) : '';
    const safePage = SAFE_ID.test(String(page || '')) ? String(page) : '';
    const pageIds = [];
    const push = (id) => {
      if (id && SAFE_ID.test(id) && !pageIds.includes(id)) pageIds.push(id);
    };
    push(safeSurface && safePage ? `${safeSurface}-${safePage}` : '');
    push(safePage);
    if (safePage === 'home') push('overview');
    if (safePage === 'overview') push('home');
    return pageIds.map((id) => `page:${id}`);
  }

  function panelTargetCandidates(surface, page, panel) {
    const aliases = PANEL_ALIASES[panel] || [];
    const targets = [];
    for (const pageTarget of pageTargetCandidates(surface, page)) {
      const pageId = pageTarget.slice('page:'.length);
      for (const alias of aliases) targets.push(`panel:${pageId}.${alias}`);
    }
    return targets;
  }

  function firstAssignment(profile, candidates) {
    for (const target of candidates) {
      if (profile.assignments[target]) return { target, assignment: profile.assignments[target] };
    }
    return undefined;
  }

  function resolveGradientForTargets(profile, targetCandidates, parentPageCandidates) {
    const direct = firstAssignment(profile, targetCandidates);
    if (direct && direct.assignment.mode === 'solid') {
      return { target: direct.target, gradient: null, explicit: true };
    }
    if (direct && direct.assignment.mode === 'gradient') {
      return {
        target: direct.target,
        gradient: profile.gradients[direct.assignment.gradientId] || null,
        explicit: true
      };
    }

    const page = firstAssignment(profile, parentPageCandidates || []);
    if (page && page.assignment.mode === 'solid') {
      return { target: page.target, gradient: null, explicit: true };
    }
    if (page && page.assignment.mode === 'gradient') {
      return {
        target: page.target,
        gradient: profile.gradients[page.assignment.gradientId] || null,
        explicit: true
      };
    }

    const app = profile.assignments.app;
    return {
      target: 'app',
      gradient: app?.mode === 'gradient' ? profile.gradients[app.gradientId] || null : null,
      explicit: app?.mode === 'solid' || app?.mode === 'gradient'
    };
  }

  function detectContext(documentObject) {
    if (!documentObject || typeof documentObject.querySelector !== 'function') return null;
    if (documentObject.querySelector('.expanded-home-chat')) {
      return { surface: 'comfy', page: 'home' };
    }
    if (documentObject.querySelector('.shell')) {
      const pageLayout = documentObject.querySelector('.page-workspace-layout[data-page]');
      let page = pageLayout?.dataset?.page || '';
      if (!SAFE_ID.test(page)) {
        const active = documentObject.querySelector('.topbar nav [aria-current="page"]');
        const tutorialId = active?.getAttribute?.('data-tutorial-id') || '';
        page = tutorialId.startsWith('nav-') ? tutorialId.slice(4) : '';
      }
      if (!SAFE_ID.test(page)) page = 'home';
      return { surface: 'comfy', page };
    }

    if (documentObject.querySelector('.outlook-app')) {
      const active = documentObject.querySelector('#app-bar .app-icon.active[data-app]');
      const assistant = documentObject.querySelector('#ai-sidebar[data-ai-app]');
      let page = active?.dataset?.app || assistant?.dataset?.aiApp || 'journal';
      if (!SAFE_ID.test(page)) page = 'journal';
      return { surface: 'advanced', page };
    }
    return null;
  }

  const testHooks = Object.freeze({
    DEFAULT_PROFILE: clone(DEFAULT_PROFILE),
    PANEL_ALIASES,
    SURFACE_SELECTORS,
    normalizeProfile,
    gradientToCss,
    resolvedSurfaceAction,
    pageTargetCandidates,
    panelTargetCandidates,
    resolveGradientForTargets,
    detectContext
  });

  if (typeof module === 'object' && module.exports) module.exports = testHooks;
  if (!global || !global.document || typeof global.document.querySelector !== 'function') return;

  if (global.SimpleGradientRuntime?.__simpleGradientRuntime) {
    global.SimpleGradientRuntime.reapply?.('script-reloaded');
    return;
  }

  const documentObject = global.document;
  const OBSERVED_ANCHOR_SELECTOR = [
    '.shell',
    '.expanded-home-chat',
    '.outlook-app',
    '.page-workspace-layout[data-page]',
    '.app-icon[data-app]',
    ...Object.values(SURFACE_SELECTORS).flatMap((surface) => Object.values(surface).flat())
  ].join(',');
  const state = {
    enabled: readEnabledPreference(),
    profileOverride: null,
    observer: null,
    applyFrame: 0,
    appliedElements: new Set(),
    originalVariables: new WeakMap(),
    ui: null,
    lastContext: null,
    lastProfile: null,
    destroyed: false
  };

  function readEnabledPreference() {
    try {
      return global.localStorage?.getItem(ENABLED_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  }

  function writeEnabledPreference(enabled) {
    try {
      global.localStorage?.setItem(ENABLED_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
      // Storage can be unavailable in hardened webviews; runtime state still works.
    }
  }

  function activeProfile() {
    return normalizeProfile(state.profileOverride || global.__SIMPLE_GRADIENT_PROFILE__ || DEFAULT_PROFILE);
  }

  function queryElements(selectors) {
    const elements = [];
    const seen = new Set();
    for (const selector of selectors || []) {
      let matches = [];
      try {
        matches = documentObject.querySelectorAll(selector);
      } catch {
        matches = [];
      }
      for (const element of matches) {
        if (!seen.has(element)) {
          seen.add(element);
          elements.push(element);
        }
      }
    }
    return elements;
  }

  function rememberOriginalVariables(element) {
    if (state.originalVariables.has(element)) return;
    state.originalVariables.set(element, {
      layer: element.style.getPropertyValue('--simple-gradient-runtime-layer'),
      layerPriority: element.style.getPropertyPriority('--simple-gradient-runtime-layer'),
      native: element.style.getPropertyValue('--simple-gradient-runtime-native-image'),
      nativePriority: element.style.getPropertyPriority('--simple-gradient-runtime-native-image')
    });
  }

  function restoreVariable(element, name, value, priority) {
    if (value) element.style.setProperty(name, value, priority || '');
    else element.style.removeProperty(name);
  }

  function clearElement(element) {
    element.removeAttribute(SURFACE_ATTRIBUTE);
    element.removeAttribute(TARGET_ATTRIBUTE);
    const original = state.originalVariables.get(element);
    if (original) {
      restoreVariable(element, '--simple-gradient-runtime-layer', original.layer, original.layerPriority);
      restoreVariable(element, '--simple-gradient-runtime-native-image', original.native, original.nativePriority);
      state.originalVariables.delete(element);
    } else {
      element.style.removeProperty('--simple-gradient-runtime-layer');
      element.style.removeProperty('--simple-gradient-runtime-native-image');
    }
  }

  function clearAppliedSurfaces() {
    for (const element of state.appliedElements) clearElement(element);
    state.appliedElements.clear();
  }

  function applyLayer(element, category, resolved) {
    const layer = gradientToCss(resolved.gradient);
    if (!layer) return;
    const alreadyApplied = state.appliedElements.has(element);
    rememberOriginalVariables(element);
    if (!alreadyApplied) {
      const computedImage = typeof global.getComputedStyle === 'function'
        ? global.getComputedStyle(element).backgroundImage
        : 'none';
      element.style.setProperty('--simple-gradient-runtime-native-image', computedImage || 'none');
    }
    element.style.setProperty('--simple-gradient-runtime-layer', layer);
    element.setAttribute(SURFACE_ATTRIBUTE, category);
    element.setAttribute(TARGET_ATTRIBUTE, resolved.target || 'app');
    state.appliedElements.add(element);
  }

  function applyResolvedToSelectors(selectors, category, resolved) {
    const action = resolvedSurfaceAction(resolved);
    if (action === 'skip') return 0;
    const elements = queryElements(selectors);
    for (const element of elements) {
      if (action === 'clear') {
        clearElement(element);
        state.appliedElements.delete(element);
      } else {
        applyLayer(element, category, resolved);
      }
    }
    return action === 'apply' ? elements.length : 0;
  }

  function dispatch(name, detail) {
    if (typeof global.CustomEvent !== 'function') return;
    global.dispatchEvent(new global.CustomEvent(name, { detail }));
  }

  function applyNow(reason) {
    state.applyFrame = 0;
    if (state.destroyed) return;
    ensureLauncher();
    clearAppliedSurfaces();

    const context = detectContext(documentObject);
    const profile = activeProfile();
    state.lastContext = context;
    state.lastProfile = profile;

    let appliedCount = 0;
    if (state.enabled && context) {
      const selectors = SURFACE_SELECTORS[context.surface];
      const pageTargets = pageTargetCandidates(context.surface, context.page);
      const appResolved = resolveGradientForTargets(profile, ['app'], []);
      const pageResolved = resolveGradientForTargets(profile, pageTargets, []);
      appliedCount += applyResolvedToSelectors(selectors.app, 'app', appResolved);
      appliedCount += applyResolvedToSelectors(selectors.page, 'page', pageResolved);

      for (const category of ['navigation', 'workspace', 'assistant', 'cards', 'toolbar', 'composer']) {
        const panelTargets = panelTargetCandidates(context.surface, context.page, category);
        const resolved = resolveGradientForTargets(profile, panelTargets, pageTargets);
        appliedCount += applyResolvedToSelectors(selectors[category], category, resolved);
      }
    }

    // Selector groups may intentionally meet at a hierarchy boundary (for
    // example the expanded Home shell is both app and page). Report unique
    // elements after later page/panel overrides or explicit solid clears.
    appliedCount = state.appliedElements.size;

    updateLauncher(appliedCount);
    dispatch('simple-gradient:applied', {
      reason: reason || 'apply',
      enabled: state.enabled,
      context: context ? { ...context } : null,
      profileName: profile.name,
      appliedCount
    });
  }

  function scheduleApply(reason) {
    if (state.destroyed || state.applyFrame) return;
    const requestFrame = typeof global.requestAnimationFrame === 'function'
      ? global.requestAnimationFrame.bind(global)
      : (callback) => global.setTimeout(callback, 0);
    state.applyFrame = requestFrame(() => applyNow(reason));
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    writeEnabledPreference(state.enabled);
    scheduleApply('enabled-changed');
  }

  function setProfile(profile) {
    state.profileOverride = normalizeProfile(profile);
    scheduleApply('profile-set');
  }

  function resetProfile() {
    state.profileOverride = null;
    if (state.ui) state.ui.status.textContent = 'Restoring the installed profile…';
    scheduleApply('profile-reset');
    dispatch('simple-gradient:profile-reset', {
      profile: normalizeProfile(global.__SIMPLE_GRADIENT_PROFILE__ || DEFAULT_PROFILE),
      source: 'installed'
    });
  }

  function setDialogOpen(open) {
    ensureLauncher();
    if (!state.ui) return;
    state.ui.dialog.hidden = !open;
    state.ui.launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      updateLauncher(state.appliedElements.size);
      state.ui.enabled.focus();
    } else if (documentObject.activeElement && state.ui.dialog.contains(documentObject.activeElement)) {
      state.ui.launcher.focus();
    }
  }

  function ensureLauncher() {
    if (state.ui || !documentObject.body) return;
    const root = documentObject.createElement('div');
    root.id = ROOT_ID;
    root.className = 'simple-gradient-runtime';
    root.innerHTML = [
      '<button class="simple-gradient-runtime__launcher" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="simple-gradient-runtime-dialog" title="Open SimpleGradient controls">',
      '  <span aria-hidden="true">◒</span><span class="simple-gradient-runtime__launcher-label">Gradient</span>',
      '</button>',
      '<section class="simple-gradient-runtime__dialog" id="simple-gradient-runtime-dialog" role="dialog" aria-modal="false" aria-labelledby="simple-gradient-runtime-title" hidden>',
      '  <header><div><strong id="simple-gradient-runtime-title">SimpleGradient</strong><small data-runtime-context>Waiting for SimpleRAG…</small></div><button type="button" data-runtime-close aria-label="Close gradient controls">×</button></header>',
      '  <label class="simple-gradient-runtime__enabled"><input type="checkbox" data-runtime-enabled> <span>Enable native gradients</span></label>',
      '  <p data-runtime-profile>Profile: —</p>',
      '  <div class="simple-gradient-runtime__actions">',
      '    <button type="button" data-runtime-reset>Reset to installed</button>',
      '    <button type="button" data-runtime-reapply>Reapply</button>',
      '  </div>',
      '  <output data-runtime-status role="status" aria-live="polite">Ready</output>',
      '</section>'
    ].join('');
    documentObject.body.appendChild(root);

    state.ui = {
      root,
      launcher: root.querySelector('.simple-gradient-runtime__launcher'),
      dialog: root.querySelector('.simple-gradient-runtime__dialog'),
      enabled: root.querySelector('[data-runtime-enabled]'),
      context: root.querySelector('[data-runtime-context]'),
      profile: root.querySelector('[data-runtime-profile]'),
      status: root.querySelector('[data-runtime-status]')
    };

    state.ui.launcher.addEventListener('click', () => setDialogOpen(state.ui.dialog.hidden));
    root.querySelector('[data-runtime-close]').addEventListener('click', () => setDialogOpen(false));
    state.ui.enabled.addEventListener('change', () => setEnabled(state.ui.enabled.checked));
    root.querySelector('[data-runtime-reset]').addEventListener('click', resetProfile);
    root.querySelector('[data-runtime-reapply]').addEventListener('click', () => scheduleApply('manual-reapply'));
    state.ui.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDialogOpen(false);
      }
    });
  }

  function updateLauncher(appliedCount) {
    if (!state.ui) return;
    const contextText = state.lastContext
      ? `${state.lastContext.surface === 'advanced' ? 'Advanced' : 'Comfy'} · ${state.lastContext.page}`
      : 'SimpleRAG surface not detected';
    state.ui.enabled.checked = state.enabled;
    state.ui.context.textContent = contextText;
    state.ui.profile.textContent = `Profile: ${state.lastProfile?.name || '—'}`;
    state.ui.status.textContent = state.enabled
      ? `${appliedCount} native surface${appliedCount === 1 ? '' : 's'} themed`
      : 'Native gradients disabled';
    state.ui.root.dataset.enabled = state.enabled ? 'true' : 'false';
  }

  function onProfileEvent(event) {
    state.profileOverride = event?.detail?.profile
      ? normalizeProfile(event.detail.profile)
      : null;
    scheduleApply('profile-event');
  }

  function onStorage(event) {
    if (event.key === ENABLED_STORAGE_KEY) {
      state.enabled = event.newValue !== 'false';
      scheduleApply('storage-sync');
      return;
    }
    if (event.key === 'simpleui.theme' || event.key === 'signalLifeSettings' || event.key === 'signalLife2Settings') {
      scheduleApply('native-theme-storage');
    }
  }

  function nodeContainsObservedAnchor(node) {
    if (!node || node.nodeType !== 1) return false;
    try {
      return node.matches(OBSERVED_ANCHOR_SELECTOR) || Boolean(node.querySelector(OBSERVED_ANCHOR_SELECTOR));
    } catch {
      return false;
    }
  }

  function mutationAffectsRuntime(record) {
    const runtimeRoot = state.ui?.root;
    if (runtimeRoot?.contains(record.target)) return false;
    if (record.type === 'attributes') {
      if (record.attributeName === 'style') return record.target === documentObject.documentElement;
      if (record.attributeName === 'class') {
        return Boolean(record.target?.matches?.('#app-bar .app-icon[data-app]'));
      }
      return record.attributeName === 'data-page'
        || record.attributeName === 'data-app'
        || record.attributeName === 'data-ai-app'
        || record.attributeName === 'aria-current';
    }
    if (record.type !== 'childList') return false;
    return [...record.addedNodes, ...record.removedNodes].some(nodeContainsObservedAnchor);
  }

  function installObserver() {
    if (typeof global.MutationObserver !== 'function' || !documentObject.documentElement) return;
    state.observer = new global.MutationObserver((records) => {
      if (records.some(mutationAffectsRuntime)) scheduleApply('page-change');
    });
    state.observer.observe(documentObject.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-page', 'data-app', 'data-ai-app', 'aria-current']
    });
  }

  function destroy() {
    state.destroyed = true;
    state.observer?.disconnect();
    clearAppliedSurfaces();
    state.ui?.root.remove();
    state.ui = null;
    global.removeEventListener('hashchange', onNavigation);
    global.removeEventListener('popstate', onNavigation);
    global.removeEventListener('storage', onStorage);
    global.removeEventListener('ragworkspace-theme-changed', onNavigation);
    global.removeEventListener('simple-gradient-profile-changed', onProfileEvent);
    global.removeEventListener('simple-gradient:profile-changed', onProfileEvent);
  }

  function onNavigation() {
    scheduleApply('navigation');
  }

  const api = {
    __simpleGradientRuntime: true,
    version: RUNTIME_VERSION,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    setProfile,
    reset: resetProfile,
    reapply: (reason) => scheduleApply(reason || 'api-reapply'),
    open: () => setDialogOpen(true),
    close: () => setDialogOpen(false),
    destroy,
    getState: () => ({
      enabled: state.enabled,
      context: state.lastContext ? { ...state.lastContext } : null,
      profileName: state.lastProfile?.name || '',
      appliedCount: state.appliedElements.size
    })
  };
  global.SimpleGradientRuntime = Object.freeze(api);

  global.addEventListener('hashchange', onNavigation);
  global.addEventListener('popstate', onNavigation);
  global.addEventListener('storage', onStorage);
  global.addEventListener('ragworkspace-theme-changed', onNavigation);
  global.addEventListener('simple-gradient-profile-changed', onProfileEvent);
  global.addEventListener('simple-gradient:profile-changed', onProfileEvent);

  function start() {
    if (state.destroyed) return;
    ensureLauncher();
    installObserver();
    scheduleApply('startup');
  }

  if (documentObject.readyState === 'loading') {
    documentObject.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
