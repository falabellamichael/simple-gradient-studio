/*
 * SimpleGradient runtime for the native SimpleRAG Comfy and Advanced shells.
 *
 * The host may assign a schema-v1 profile to window.__SIMPLE_GRADIENT_PROFILE__
 * before this script runs. Profile data is normalized here and can never supply
 * selectors or raw CSS; all SimpleRAG surface selectors are fixed below.
 */
(function simpleGradientRuntimeBootstrap(global) {
  'use strict';

  const RUNTIME_VERSION = '0.3.0';
  const ENABLED_STORAGE_KEY = 'simpleGradient.runtime.enabled';
  const PROFILE_STORAGE_KEY = 'simpleGradient.runtime.profileOverride.v1';
  const ROOT_ID = 'simple-gradient-runtime-root';
  const SURFACE_ATTRIBUTE = 'data-simple-gradient-runtime-surface';
  const TARGET_ATTRIBUTE = 'data-simple-gradient-runtime-target';
  const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
  const SAFE_TARGET = /^(app|page:[a-z0-9-]+|panel:[a-z0-9-]+\.[a-z0-9-]+)$/;
  const SAFE_HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

  const DEFAULT_PROFILE = {
    schema: 'simple-gradient-profile',
    version: 1,
    name: 'Warm Glass Workspace',
    gradients: {
      'warm-studio': {
        id: 'warm-studio',
        name: 'Warm Studio Canvas',
        type: 'linear',
        angle: 132,
        stops: [
          { color: '#FFF9F2', position: 0, opacity: 24 },
          { color: '#F8EFE3', position: 42, opacity: 28 },
          { color: '#F1D6C1', position: 76, opacity: 32 },
          { color: '#E86633', position: 100, opacity: 22 }
        ]
      }
    },
    assignments: {
      app: { mode: 'gradient', gradientId: 'warm-studio' }
    },
    editor: {
      activePage: 'home',
      activeTarget: 'app',
      targetCatalog: 'simplerag',
      targetMode: false,
      zoom: 100
    }
  };

  const SIMPLE_RAG_PAGES = Object.freeze([
    Object.freeze({ id: 'home', label: 'Home' }),
    Object.freeze({ id: 'journal', label: 'Journal' }),
    Object.freeze({ id: 'tasks', label: 'Tasks' }),
    Object.freeze({ id: 'email', label: 'Email' }),
    Object.freeze({ id: 'calendar', label: 'Calendar' }),
    Object.freeze({ id: 'pdf', label: 'PDF' }),
    Object.freeze({ id: 'graph', label: 'Knowledge Graph' }),
    Object.freeze({ id: 'plugins', label: 'Plug-ins' }),
    Object.freeze({ id: 'settings', label: 'Settings' })
  ]);

  const EDITOR_PANELS = Object.freeze([
    Object.freeze({ id: 'navigation', label: 'Navigation' }),
    Object.freeze({ id: 'workspace', label: 'Workspace' }),
    Object.freeze({ id: 'cards', label: 'Cards & modals' }),
    Object.freeze({ id: 'assistant', label: 'Assistant & pop-outs' }),
    Object.freeze({ id: 'toolbar', label: 'Toolbar & menus' }),
    Object.freeze({ id: 'composer', label: 'Composer' })
  ]);

  // Presets are data only. They are copied into a normalized draft before use,
  // and can never add selectors or CSS declarations to the runtime.
  const BUILTIN_GRADIENTS = Object.freeze({
    'warm-studio': Object.freeze({
      id: 'warm-studio', name: 'Warm Studio Canvas', type: 'linear', angle: 132,
      stops: Object.freeze([
        Object.freeze({ color: '#FFF9F2', position: 0, opacity: 26 }),
        Object.freeze({ color: '#F8EFE3', position: 42, opacity: 28 }),
        Object.freeze({ color: '#F1D6C1', position: 76, opacity: 30 }),
        Object.freeze({ color: '#E86633', position: 100, opacity: 32 })
      ])
    }),
    'ember-focus': Object.freeze({
      id: 'ember-focus', name: 'Ember Focus', type: 'linear', angle: 148,
      stops: Object.freeze([
        Object.freeze({ color: '#171512', position: 0, opacity: 78 }),
        Object.freeze({ color: '#25221F', position: 44, opacity: 78 }),
        Object.freeze({ color: '#563022', position: 75, opacity: 60 }),
        Object.freeze({ color: '#E86633', position: 100, opacity: 42 })
      ])
    }),
    'ocean-workspace': Object.freeze({
      id: 'ocean-workspace', name: 'Ocean Workspace', type: 'linear', angle: 128,
      stops: Object.freeze([
        Object.freeze({ color: '#12202A', position: 0, opacity: 72 }),
        Object.freeze({ color: '#167C8C', position: 48, opacity: 52 }),
        Object.freeze({ color: '#9BCBD1', position: 76, opacity: 34 }),
        Object.freeze({ color: '#E8F0F2', position: 100, opacity: 24 })
      ])
    }),
    'grove-workspace': Object.freeze({
      id: 'grove-workspace', name: 'Grove Workspace', type: 'linear', angle: 142,
      stops: Object.freeze([
        Object.freeze({ color: '#17231C', position: 0, opacity: 72 }),
        Object.freeze({ color: '#4D7C58', position: 46, opacity: 52 }),
        Object.freeze({ color: '#B8CFAD', position: 76, opacity: 34 }),
        Object.freeze({ color: '#EDF1E7', position: 100, opacity: 24 })
      ])
    }),
    'oled-ember': Object.freeze({
      id: 'oled-ember', name: 'OLED Ember Edge', type: 'linear', angle: 118,
      stops: Object.freeze([
        Object.freeze({ color: '#000000', position: 0, opacity: 88 }),
        Object.freeze({ color: '#0B0B0D', position: 52, opacity: 82 }),
        Object.freeze({ color: '#2A1710', position: 80, opacity: 58 }),
        Object.freeze({ color: '#E86633', position: 100, opacity: 32 })
      ])
    })
  });

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
      app: Object.freeze(['.shell']),
      page: Object.freeze(['.page-workspace-layout[data-page]']),
      navigation: Object.freeze([
        '.edge-helper.edge-left',
        '.edge-helper.edge-left .helper-panel',
        '.edge-helper.edge-left .chat-rail',
        '.edge-left',
        '.chat-rail'
      ]),
      workspace: Object.freeze([
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
        '.edge-helper.edge-right',
        '.edge-helper.edge-right .helper-panel',
        '.edge-helper.edge-right .endpoint-helper',
        '.endpoint-settings',
        '.ai-settings-panel',
        '.edge-right'
      ]),
      cards: Object.freeze([
        '.main-stage .quick',
        '.main-stage .quick > button',
        '.main-stage .dashboard',
        '.main-stage .dashboard > article',
        '.main-stage .home-welcome',
        '.main-stage .welcome',
        '.main-stage .chat-card',
        '.main-stage .chat-msg-card',
        '.main-stage .message-card',
        '.main-stage .msg-bubble',
        '.main-stage .message-row > article',
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
        '.main-stage .composer',
        '.main-stage .home-composer',
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
        targetCatalog: 'simplerag',
        targetMode: rawEditor.targetMode === true,
        zoom: Math.round(clamp(rawEditor.zoom == null ? 100 : rawEditor.zoom, 70, 140))
      }
    };
  }

  function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function profileFingerprint(value) {
    const source = canonicalJson(normalizeProfile(value));
    let hash = 0x811c9dc5;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `sgp1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function normalizeStoredProfileOverride(value, installedProfile) {
    let stored = value;
    if (typeof value === 'string') {
      try {
        stored = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (
      !stored
      || typeof stored !== 'object'
      || stored.schema !== 'simple-gradient-runtime-override'
      || stored.version !== 1
      || stored.installedFingerprint !== profileFingerprint(installedProfile)
      || !stored.profile
    ) {
      return null;
    }
    return normalizeProfile(stored.profile);
  }

  function editorTarget(page, panel) {
    const safePage = SIMPLE_RAG_PAGES.some((entry) => entry.id === page) ? page : 'home';
    if (!panel) return `page:${safePage}`;
    return EDITOR_PANELS.some((entry) => entry.id === panel)
      ? `panel:${safePage}.${panel}`
      : `page:${safePage}`;
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
    SIMPLE_RAG_PAGES,
    EDITOR_PANELS,
    BUILTIN_GRADIENTS,
    PANEL_ALIASES,
    SURFACE_SELECTORS,
    normalizeProfile,
    profileFingerprint,
    normalizeStoredProfileOverride,
    editorTarget,
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
    if (global.SimpleGradientRuntime.version === RUNTIME_VERSION) {
      global.SimpleGradientRuntime.reapply?.('script-reloaded');
      return;
    }
    try {
      global.SimpleGradientRuntime.destroy?.();
    } catch {
      global.document?.getElementById?.(ROOT_ID)?.remove?.();
    }
  }

  const documentObject = global.document;
  const OBSERVED_ANCHOR_SELECTOR = [
    '.shell',
    '.expanded-home-chat',
    '.outlook-app',
    '.page-workspace-layout[data-page]',
    '.app-icon[data-app]',
    'button[data-tutorial-id="settings-tab-themes"]',
    '.theme-settings.settings-detail',
    '[data-tutorial-id="settings-theme-presets"]',
    '.settings-general-page.settings-appearance-page[data-settings-page-id="appearance"]',
    '[data-settings-section="all"][data-settings-subpage="appearance"]',
    ...Object.values(SURFACE_SELECTORS).flatMap((surface) => Object.values(surface).flat())
  ].join(',');
  const initialInstalledProfile = normalizeProfile(global.__SIMPLE_GRADIENT_PROFILE__ || DEFAULT_PROFILE);
  const initialProfileOverride = readPersistedProfileOverride(initialInstalledProfile);
  const state = {
    enabled: readEnabledPreference(),
    manualOverride: true,
    installedFingerprint: profileFingerprint(initialInstalledProfile),
    profileOverride: initialProfileOverride,
    draftProfile: clone(initialProfileOverride || initialInstalledProfile),
    draftDirty: false,
    editorPage: (initialProfileOverride || initialInstalledProfile).editor.activePage,
    editorTarget: (initialProfileOverride || initialInstalledProfile).editor.activeTarget,
    selectedGradientId: '',
    observer: null,
    applyFrame: 0,
    appliedElements: new Set(),
    originalVariables: new WeakMap(),
    originalNativeImages: new WeakMap(),
    ui: null,
    settingsEntry: null,
    comfyAppearanceTile: null,
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

  function readPersistedProfileOverride(installedProfile, serializedValue) {
    try {
      const serialized = serializedValue === undefined
        ? global.localStorage?.getItem(PROFILE_STORAGE_KEY)
        : serializedValue;
      return normalizeStoredProfileOverride(serialized, installedProfile);
    } catch {
      return null;
    }
  }

  function writePersistedProfileOverride(profile) {
    try {
      global.localStorage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
        schema: 'simple-gradient-runtime-override',
        version: 1,
        installedFingerprint: state.installedFingerprint,
        profile: normalizeProfile(profile)
      }));
    } catch {
      // The current runtime still updates even if persistence is unavailable.
    }
  }

  function clearPersistedProfileOverride() {
    try {
      global.localStorage?.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in hardened webviews.
    }
  }

  function installedProfile() {
    return normalizeProfile(global.__SIMPLE_GRADIENT_PROFILE__ || DEFAULT_PROFILE);
  }

  function refreshInstalledProfileIdentity() {
    const installed = installedProfile();
    const fingerprint = profileFingerprint(installed);
    if (fingerprint !== state.installedFingerprint) {
      state.installedFingerprint = fingerprint;
      state.profileOverride = null;
      state.draftProfile = clone(installed);
      state.draftDirty = false;
      state.editorPage = installed.editor.activePage;
      state.editorTarget = installed.editor.activeTarget;
      clearPersistedProfileOverride();
    }
    return installed;
  }

  function activeProfile() {
    const installed = refreshInstalledProfileIdentity();
    if (state.draftDirty && state.draftProfile) {
      return normalizeProfile(state.draftProfile);
    }
    return normalizeProfile(state.profileOverride || installed);
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
      nativePriority: element.style.getPropertyPriority('--simple-gradient-runtime-native-image'),
      bgColor: element.style.getPropertyValue('background-color'),
      bgPriority: element.style.getPropertyPriority('background-color'),
      backdrop: element.style.getPropertyValue('backdrop-filter'),
      backdropPriority: element.style.getPropertyPriority('backdrop-filter'),
      webkitBackdrop: element.style.getPropertyValue('-webkit-backdrop-filter'),
      webkitBackdropPriority: element.style.getPropertyPriority('-webkit-backdrop-filter')
    });
  }

  function restoreVariable(element, name, value, priority) {
    if (value) element.style.setProperty(name, value, priority || '');
    else element.style.removeProperty(name);
  }

  function clearElement(element) {
    element.removeAttribute(SURFACE_ATTRIBUTE);
    element.removeAttribute(TARGET_ATTRIBUTE);
    element.removeAttribute('data-simple-gradient-has-native');
    const original = state.originalVariables.get(element);
    if (original) {
      restoreVariable(element, '--simple-gradient-runtime-layer', original.layer, original.layerPriority);
      restoreVariable(element, '--simple-gradient-runtime-native-image', original.native, original.nativePriority);
      restoreVariable(element, 'background-color', original.bgColor, original.bgPriority);
      restoreVariable(element, 'backdrop-filter', original.backdrop, original.backdropPriority);
      restoreVariable(element, '-webkit-backdrop-filter', original.webkitBackdrop, original.webkitBackdropPriority);
      state.originalVariables.delete(element);
    } else {
      element.style.removeProperty('--simple-gradient-runtime-layer');
      element.style.removeProperty('--simple-gradient-runtime-native-image');
      element.style.removeProperty('background-color');
      element.style.removeProperty('backdrop-filter');
      element.style.removeProperty('-webkit-backdrop-filter');
    }
    element.style.removeProperty('background-image');
  }

  function clearAppliedSurfaces() {
    for (const element of state.appliedElements) clearElement(element);
    state.appliedElements.clear();
  }

  function findNativeBackgroundImage(element) {
    if (state.originalNativeImages.has(element)) {
      return state.originalNativeImages.get(element);
    }
    const candidates = [];
    if (element) {
      candidates.push(element.style.getPropertyValue('background-image'));
      if (typeof global.getComputedStyle === 'function') {
        candidates.push(global.getComputedStyle(element).backgroundImage);
      }
    }
    if (documentObject.body) {
      candidates.push(documentObject.body.style.getPropertyValue('background-image'));
      if (typeof global.getComputedStyle === 'function') {
        candidates.push(global.getComputedStyle(documentObject.body).backgroundImage);
      }
    }
    if (documentObject.documentElement) {
      candidates.push(documentObject.documentElement.style.getPropertyValue('background-image'));
      if (typeof global.getComputedStyle === 'function') {
        candidates.push(global.getComputedStyle(documentObject.documentElement).backgroundImage);
      }
    }
    let found = '';
    for (const image of candidates) {
      if (typeof image === 'string' && image && image !== 'none' && !image.includes('simple-gradient')) {
        if (image.includes('url(') || image.includes('data:')) {
          found = image;
          break;
        }
      }
    }
    state.originalNativeImages.set(element, found);
    return found;
  }

  function applyLayer(element, category, resolved) {
    const isExplicitPanel = Boolean(resolved.target && resolved.target.startsWith('panel:') && resolved.explicit);
    const isExplicitPage = Boolean(resolved.target && resolved.target.startsWith('page:') && resolved.explicit);
    const isMasterApp = category === 'app';
    const shouldHaveGradient = isMasterApp || isExplicitPage || isExplicitPanel;
    const layer = shouldHaveGradient ? gradientToCss(resolved.gradient) : '';
    const isManualOverride = state.manualOverride !== false;
    rememberOriginalVariables(element);

    const nativeImage = isMasterApp ? findNativeBackgroundImage(element) : '';
    if (nativeImage) {
      element.style.setProperty('--simple-gradient-runtime-native-image', nativeImage);
      element.setAttribute('data-simple-gradient-has-native', 'true');
    } else {
      element.style.removeProperty('--simple-gradient-runtime-native-image');
      element.removeAttribute('data-simple-gradient-has-native');
    }

    if (layer) {
      element.style.setProperty('--simple-gradient-runtime-layer', layer);
      const combinedImage = nativeImage ? `${layer}, ${nativeImage}` : layer;
      element.style.setProperty('background-image', combinedImage, 'important');
    } else if (nativeImage && isMasterApp) {
      element.style.removeProperty('--simple-gradient-runtime-layer');
      element.style.setProperty('background-image', nativeImage, 'important');
    } else {
      element.style.removeProperty('--simple-gradient-runtime-layer');
      element.style.setProperty('background-image', 'none', 'important');
    }

    if (isManualOverride) {
      if (category === 'app' || category === 'page' || category === 'cards' || !isExplicitPanel) {
        element.style.setProperty('background-color', 'transparent', 'important');
      } else {
        element.style.setProperty('background-color', 'rgba(16, 18, 22, 0.28)', 'important');
        element.style.setProperty('backdrop-filter', 'blur(28px) saturate(140%)', 'important');
        element.style.setProperty('-webkit-backdrop-filter', 'blur(28px) saturate(140%)', 'important');
      }
    }
    element.setAttribute(SURFACE_ATTRIBUTE, category);
    element.setAttribute(TARGET_ATTRIBUTE, resolved.target || 'app');
    state.appliedElements.add(element);
  }

  function applyResolvedToSelectors(selectors, category, resolved) {
    const action = resolvedSurfaceAction(resolved);
    if (action === 'skip') return 0;
    let elements = queryElements(selectors).filter((element) => (
      !state.ui?.root?.contains(element)
      && !state.settingsEntry?.contains(element)
      && element !== state.settingsEntry
    ));
    if (category === 'composer') {
      // Composer selectors cover wrapper variants and the inner box; tagging a
      // wrapper that contains the box paints the gradient outside its rounded border.
      elements = elements.filter((element) => !elements.some((other) => other !== element && element.contains(other)));
    }
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
    clearAppliedSurfaces();

    const context = detectContext(documentObject);
    const profile = activeProfile();
    state.lastContext = context;
    state.lastProfile = profile;
    syncSettingsEntry(context);

    if (documentObject.documentElement) {
      documentObject.documentElement.setAttribute('data-simple-gradient-manual-override', String(state.manualOverride !== false));
    }

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

    updateEditorStatus(appliedCount);
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
    const normalized = normalizeProfile(profile);
    state.profileOverride = normalized;
    state.draftProfile = clone(normalized);
    state.draftDirty = false;
    writePersistedProfileOverride(normalized);
    scheduleApply('profile-set');
    broadcastStudioState(normalized);
  }

  function resetProfile() {
    const installed = installedProfile();
    state.profileOverride = null;
    state.draftProfile = clone(installed);
    state.draftDirty = false;
    clearPersistedProfileOverride();
    scheduleApply('profile-reset');
    broadcastStudioState(installed, 'Restored the installed SimpleRAG profile.');
    dispatch('simple-gradient:profile-reset', {
      profile: installed,
      source: 'installed'
    });
  }

  function pageLabel(pageId) {
    return SIMPLE_RAG_PAGES.find((page) => page.id === pageId)?.label || 'Home';
  }

  function targetLabel(target) {
    if (target === 'app') return 'App default';
    if (target.startsWith('page:')) return `${pageLabel(target.slice(5))} page`;
    if (target.startsWith('panel:')) {
      const [pageId, panelId] = target.slice(6).split('.');
      const panel = EDITOR_PANELS.find((entry) => entry.id === panelId);
      return `${pageLabel(pageId)} · ${panel?.label || 'Panel'}`;
    }
    return 'App default';
  }

  function selectedGradientId() {
    const profile = state.draftProfile || activeProfile();
    const assignment = profile.assignments[state.editorTarget];
    if (assignment?.mode === 'gradient' && profile.gradients[assignment.gradientId]) {
      state.selectedGradientId = assignment.gradientId;
    }
    if (!profile.gradients[state.selectedGradientId]) {
      state.selectedGradientId = Object.keys(profile.gradients)[0] || Object.keys(BUILTIN_GRADIENTS)[0];
    }
    return state.selectedGradientId;
  }

  function ensureDraftGradient(gradientId) {
    const safeId = SAFE_ID.test(String(gradientId || '')) ? String(gradientId) : Object.keys(BUILTIN_GRADIENTS)[0];
    if (!state.draftProfile.gradients[safeId]) {
      const source = BUILTIN_GRADIENTS[safeId] || DEFAULT_PROFILE.gradients['native-warmth'];
      state.draftProfile.gradients[safeId] = normalizeGradient(safeId, source);
    }
    state.selectedGradientId = safeId;
    return state.draftProfile.gradients[safeId];
  }

  function markDraftDirty(message) {
    state.draftDirty = true;
    if (!state.ui) return;
    state.ui.root.dataset.dirty = 'true';
    state.ui.apply.disabled = false;
    state.ui.status.textContent = message || 'Draft changed · Apply to save';
  }

  function assignmentMode() {
    return state.draftProfile?.assignments?.[state.editorTarget]?.mode || 'inherit';
  }

  function updatePreview() {
    if (!state.ui) return;
    const gradient = ensureDraftGradient(selectedGradientId());
    state.ui.preview.style.backgroundImage = gradientToCss(gradient);
    state.ui.preview.setAttribute('aria-label', `Live preview of ${gradient.name}`);
    state.ui.previewName.textContent = gradient.name;
    state.ui.previewMeta.textContent = `${gradient.angle}° · ${gradient.stops.length} stops`;
    state.ui.angleRange.value = String(gradient.angle);
    state.ui.angleNumber.value = String(gradient.angle);
  }

  function renderPresetOptions() {
    if (!state.ui) return;
    const select = state.ui.preset;
    const prior = selectedGradientId();
    select.replaceChildren();
    const ids = [...new Set([
      ...Object.keys(BUILTIN_GRADIENTS),
      ...Object.keys(state.draftProfile.gradients)
    ])];
    for (const id of ids) {
      const source = state.draftProfile.gradients[id] || BUILTIN_GRADIENTS[id];
      const option = documentObject.createElement('option');
      option.value = id;
      option.textContent = source?.name || id;
      if (!state.draftProfile.gradients[id]) option.textContent += ' · built-in';
      select.appendChild(option);
    }
    select.value = ids.includes(prior) ? prior : ids[0];
  }

  function renderStops() {
    if (!state.ui) return;
    const gradient = ensureDraftGradient(selectedGradientId());
    const container = state.ui.stops;
    container.replaceChildren();
    gradient.stops.forEach((stop, index) => {
      const row = documentObject.createElement('div');
      row.className = 'simple-gradient-editor__stop';
      row.dataset.stopIndex = String(index);

      const colorLabel = documentObject.createElement('label');
      colorLabel.className = 'simple-gradient-editor__color';
      const colorText = documentObject.createElement('span');
      colorText.textContent = `Stop ${index + 1} color`;
      const colorInput = documentObject.createElement('input');
      colorInput.type = 'color';
      colorInput.value = stop.color.slice(0, 7);
      colorInput.dataset.stopColor = String(index);
      const colorValue = documentObject.createElement('code');
      colorValue.dataset.stopColorValue = String(index);
      colorValue.textContent = stop.color.slice(0, 7);
      colorLabel.append(colorText, colorInput, colorValue);

      const positionLabel = documentObject.createElement('label');
      positionLabel.innerHTML = '<span>Position</span>';
      const positionInput = documentObject.createElement('input');
      positionInput.type = 'number';
      positionInput.min = '0';
      positionInput.max = '100';
      positionInput.step = '1';
      positionInput.value = String(stop.position);
      positionInput.dataset.stopPosition = String(index);
      positionInput.setAttribute('aria-label', `Stop ${index + 1} position percent`);
      positionLabel.appendChild(positionInput);

      const opacityLabel = documentObject.createElement('label');
      opacityLabel.innerHTML = '<span>Opacity</span>';
      const opacityInput = documentObject.createElement('input');
      opacityInput.type = 'number';
      opacityInput.min = '0';
      opacityInput.max = '100';
      opacityInput.step = '1';
      opacityInput.value = String(stop.opacity);
      opacityInput.dataset.stopOpacity = String(index);
      opacityInput.setAttribute('aria-label', `Stop ${index + 1} opacity percent`);
      opacityLabel.appendChild(opacityInput);

      const remove = documentObject.createElement('button');
      remove.type = 'button';
      remove.dataset.stopRemove = String(index);
      remove.disabled = gradient.stops.length <= 2;
      remove.setAttribute('aria-label', `Remove stop ${index + 1}`);
      remove.title = gradient.stops.length <= 2 ? 'A gradient needs at least two stops' : `Remove stop ${index + 1}`;
      remove.textContent = '×';

      row.append(colorLabel, positionLabel, opacityLabel, remove);
      container.appendChild(row);
    });
    state.ui.addStop.disabled = gradient.stops.length >= 8;
    state.ui.stopCount.textContent = `${gradient.stops.length} / 8`;
  }

  function renderTargets() {
    if (!state.ui) return;
    const page = SIMPLE_RAG_PAGES.some((entry) => entry.id === state.editorPage) ? state.editorPage : 'home';
    state.editorPage = page;
    state.ui.page.value = page;
    const targets = [
      { id: 'app', label: 'App default', detail: 'Fallback for every page' },
      { id: editorTarget(page), label: `${pageLabel(page)} page`, detail: 'Page-wide override' },
      ...EDITOR_PANELS.map((panel) => ({
        id: editorTarget(page, panel.id),
        label: panel.label,
        detail: `${pageLabel(page)} panel`
      }))
    ];
    if (!targets.some((target) => target.id === state.editorTarget)) state.editorTarget = editorTarget(page);
    state.ui.targets.replaceChildren();
    targets.forEach((target) => {
      const assignment = state.draftProfile.assignments[target.id];
      const button = documentObject.createElement('button');
      button.type = 'button';
      button.dataset.editorTarget = target.id;
      button.className = target.id === state.editorTarget ? 'active' : '';
      button.setAttribute('aria-pressed', target.id === state.editorTarget ? 'true' : 'false');
      const copy = documentObject.createElement('span');
      const strong = documentObject.createElement('strong');
      strong.textContent = target.label;
      const small = documentObject.createElement('small');
      small.textContent = target.detail;
      copy.append(strong, small);
      const mode = documentObject.createElement('em');
      mode.textContent = assignment?.mode || 'inherit';
      button.append(copy, mode);
      state.ui.targets.appendChild(button);
    });
    state.ui.targetName.textContent = targetLabel(state.editorTarget);
  }

  function renderEditor() {
    if (!state.ui || !state.draftProfile) return;
    renderTargets();
    const mode = assignmentMode();
    state.ui.root.dataset.mode = mode;
    state.ui.modeInputs.forEach((input) => { input.checked = input.value === mode; });
    renderPresetOptions();
    state.ui.gradientControls.disabled = mode !== 'gradient';
    renderStops();
    updatePreview();
    state.ui.enabled.checked = state.enabled;
    state.ui.profile.textContent = state.profileOverride
      ? `Local profile · ${state.draftProfile.name}`
      : `Installed profile · ${state.draftProfile.name}`;
    state.ui.apply.disabled = !state.draftDirty;
    state.ui.root.dataset.dirty = state.draftDirty ? 'true' : 'false';
  }

  function setDraftMode(mode) {
    if (!['inherit', 'gradient', 'solid'].includes(mode)) return;
    if (mode === 'gradient') {
      const id = selectedGradientId();
      ensureDraftGradient(id);
      state.draftProfile.assignments[state.editorTarget] = { mode: 'gradient', gradientId: id };
    } else {
      state.draftProfile.assignments[state.editorTarget] = { mode };
    }
    state.draftProfile.editor.activePage = state.editorPage;
    state.draftProfile.editor.activeTarget = state.editorTarget;
    markDraftDirty(`${targetLabel(state.editorTarget)} set to ${mode}`);
    renderEditor();
  }

  function selectPreset(gradientId) {
    const gradient = ensureDraftGradient(gradientId);
    state.draftProfile.assignments[state.editorTarget] = { mode: 'gradient', gradientId: gradient.id };
    markDraftDirty(`${gradient.name} selected for ${targetLabel(state.editorTarget)}`);
    renderEditor();
  }

  function addStop() {
    const gradient = ensureDraftGradient(selectedGradientId());
    if (gradient.stops.length >= 8) return;
    const sorted = [...gradient.stops].sort((left, right) => left.position - right.position);
    let left = sorted[0];
    let right = sorted[1];
    let largestGap = -1;
    for (let index = 1; index < sorted.length; index += 1) {
      const gap = sorted[index].position - sorted[index - 1].position;
      if (gap > largestGap) {
        largestGap = gap;
        left = sorted[index - 1];
        right = sorted[index];
      }
    }
    gradient.stops.push({
      color: left.color,
      position: Math.round((left.position + right.position) / 2),
      opacity: Math.round((left.opacity + right.opacity) / 2)
    });
    gradient.stops.sort((a, b) => a.position - b.position);
    markDraftDirty('Gradient stop added');
    renderStops();
    updatePreview();
  }

  function removeStop(index) {
    const gradient = ensureDraftGradient(selectedGradientId());
    if (gradient.stops.length <= 2 || index < 0 || index >= gradient.stops.length) return;
    gradient.stops.splice(index, 1);
    markDraftDirty('Gradient stop removed');
    renderStops();
    updatePreview();
  }

  function applyDraftProfile() {
    const normalized = normalizeProfile(state.draftProfile);
    normalized.editor.activePage = state.editorPage;
    normalized.editor.activeTarget = state.editorTarget;
    state.profileOverride = normalized;
    state.draftProfile = clone(normalized);
    state.draftDirty = false;
    writePersistedProfileOverride(normalized);
    if (state.ui) state.ui.status.textContent = 'Saved locally and applied across SimpleRAG';
    scheduleApply('editor-apply');
    renderEditor();
    dispatch('simple-gradient:profile-applied', {
      profile: clone(normalized),
      source: 'settings-editor'
    });
  }

  function settingsEntryHost(context) {
    if (!context || context.page !== 'settings') return null;
    if (context.surface === 'comfy') {
      const appearanceSection = documentObject.querySelector('.theme-settings.settings-detail [data-tutorial-id="settings-theme-presets"]');
      return appearanceSection?.parentElement || null;
    }
    if (context.surface === 'advanced') {
      return documentObject.querySelector('.settings-page.settings-appearance-page[data-settings-page-id="appearance"] .settings-workspace-main');
    }
    return null;
  }

  function removeSettingsEntry() {
    state.settingsEntry?.remove();
    state.settingsEntry = null;
  }

  function restoreComfyAppearanceTile() {
    const record = state.comfyAppearanceTile;
    if (record?.element?.isConnected) {
      if (record.title) record.title.textContent = record.originalTitle;
      if (record.detail) record.detail.textContent = record.originalDetail;
    }
    state.comfyAppearanceTile = null;
  }

  function labelComfyAppearanceTile() {
    const tile = documentObject.querySelector('button[data-tutorial-id="settings-tab-themes"]');
    if (!tile) return;
    if (state.comfyAppearanceTile?.element !== tile) {
      restoreComfyAppearanceTile();
      const title = tile.querySelector('strong');
      const detail = tile.querySelector('small');
      state.comfyAppearanceTile = {
        element: tile,
        title,
        detail,
        originalTitle: title?.textContent || 'Themes',
        originalDetail: detail?.textContent || 'Presets and every color'
      };
    }
    if (state.comfyAppearanceTile.title) state.comfyAppearanceTile.title.textContent = 'Appearance';
    if (state.comfyAppearanceTile.detail) state.comfyAppearanceTile.detail.textContent = 'Themes, backgrounds, and gradients';
  }

  function closeEditor() {
    if (!state.ui) return;
    const returnFocus = state.ui.returnFocus;
    state.ui.root.remove();
    state.ui = null;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function createSettingsEntry(surface) {
    const entry = documentObject.createElement('section');
    entry.dataset.simpleGradientSettingsEntry = surface;
    if (surface === 'comfy') {
      entry.className = 'simple-gradient-settings-entry simple-gradient-settings-entry--comfy';
      entry.innerHTML = [
        '<header><span><h3>Gradient Studio</h3><p>Assign linear gradients to every SimpleRAG page, panel, modal, and pop-out.</p></span></header>',
        '<button type="button" class="simple-gradient-settings-entry__open"><span><strong>Open Gradient Studio</strong><small>Full page and panel controls</small></span><span aria-hidden="true">›</span></button>'
      ].join('');
    } else {
      entry.className = 'settings-section-card simple-gradient-settings-entry simple-gradient-settings-entry--advanced';
      entry.innerHTML = [
        '<header class="settings-section-header"><div class="settings-section-title"><i aria-hidden="true">◒</i><div><h2>Gradient appearance</h2><p>Assign linear gradients to every SimpleRAG page, panel, modal, and pop-out.</p></div></div></header>',
        '<div class="settings-section-body"><button type="button" class="simple-gradient-settings-entry__open"><span>Open Gradient Studio</span><small>Full page and panel controls</small></button></div>'
      ].join('');
    }
    const trigger = entry.querySelector('button');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'simple-gradient-runtime-dialog');
    trigger.addEventListener('click', () => openEditorFromSettings(trigger));
    return entry;
  }

  function syncSettingsEntry(context) {
    const isComfySettings = context?.surface === 'comfy' && context.page === 'settings';
    if (isComfySettings) labelComfyAppearanceTile();
    else restoreComfyAppearanceTile();
    const host = settingsEntryHost(context);
    if (!host) {
      removeSettingsEntry();
      if (state.ui) closeEditor();
      return;
    }
    const surface = context.surface;
    if (state.settingsEntry?.isConnected && state.settingsEntry.parentElement === host
      && state.settingsEntry.dataset.simpleGradientSettingsEntry === surface) return;
    removeSettingsEntry();
    state.settingsEntry = createSettingsEntry(surface);
    host.appendChild(state.settingsEntry);
  }

  function trapEditorFocus(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEditor();
      return;
    }
    if (event.key !== 'Tab' || !state.ui) return;
    const focusable = [...state.ui.dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && documentObject.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && documentObject.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function ensureEditorModal(returnFocus) {
    if (state.ui || !documentObject.body) return;
    const root = documentObject.createElement('div');
    root.id = ROOT_ID;
    root.className = 'simple-gradient-runtime simple-gradient-editor-overlay';
    root.dataset.size = 'comfortable';
    root.innerHTML = [
      '<section class="simple-gradient-runtime__dialog" id="simple-gradient-runtime-dialog" role="dialog" aria-modal="true" aria-labelledby="simple-gradient-runtime-title">',
      '  <header class="simple-gradient-editor__header">',
      '    <div class="simple-gradient-editor__brand"><span aria-hidden="true">◒</span><div><strong id="simple-gradient-runtime-title">SimpleGradient Editor</strong><small data-runtime-context>Settings · Appearance</small></div></div>',
      '    <div class="simple-gradient-editor__window-actions"><button type="button" data-runtime-expand aria-pressed="false" title="Use full screen">Expand</button><button type="button" data-runtime-close aria-label="Close gradient editor">×</button></div>',
      '  </header>',
      '  <div class="simple-gradient-editor__topline">',
      '    <label class="simple-gradient-runtime__enabled"><input type="checkbox" data-runtime-enabled> <span>Enable gradients</span></label>',
      '    <p data-runtime-profile>Installed profile</p>',
      '  </div>',
      '  <div class="simple-gradient-editor__workspace">',
      '    <aside class="simple-gradient-editor__targets" aria-label="Gradient targets">',
      '      <label class="simple-gradient-editor__page"><span>SimpleRAG page</span><select data-editor-page></select></label>',
      '      <div class="simple-gradient-editor__target-list" data-editor-targets></div>',
      '    </aside>',
      '    <main class="simple-gradient-editor__controls">',
      '      <section class="simple-gradient-editor__assignment">',
      '        <div><span class="simple-gradient-editor__eyebrow">Editing target</span><h2 data-editor-target-name>App default</h2></div>',
      '        <fieldset class="simple-gradient-editor__modes"><legend>Assignment mode</legend>',
      '          <label><input type="radio" name="simple-gradient-mode" value="inherit"><span>Inherit</span></label>',
      '          <label><input type="radio" name="simple-gradient-mode" value="gradient"><span>Gradient</span></label>',
      '          <label><input type="radio" name="simple-gradient-mode" value="solid"><span>Native / no gradient</span></label>',
      '        </fieldset>',
      '      </section>',
      '      <fieldset class="simple-gradient-editor__gradient-controls" data-editor-gradient-controls>',
      '        <legend>Linear gradient</legend>',
      '        <label class="simple-gradient-editor__preset"><span>Gradient preset</span><select data-editor-preset></select></label>',
      '        <div class="simple-gradient-editor__preview" data-editor-preview role="img"><span><strong data-editor-preview-name>Gradient</strong><small data-editor-preview-meta></small></span></div>',
      '        <div class="simple-gradient-editor__angle"><label for="simple-gradient-angle">Angle</label><input id="simple-gradient-angle" type="range" min="0" max="359" step="1" data-editor-angle-range><input type="number" min="0" max="359" step="1" data-editor-angle-number aria-label="Gradient angle in degrees"><span>°</span></div>',
      '        <div class="simple-gradient-editor__stops-header"><div><strong>Color stops</strong><span data-editor-stop-count>2 / 8</span></div><button type="button" data-editor-add-stop>+ Add stop</button></div>',
      '        <div class="simple-gradient-editor__stops" data-editor-stops></div>',
      '      </fieldset>',
      '    </main>',
      '  </div>',
      '  <footer class="simple-gradient-editor__footer">',
      '    <output data-runtime-status role="status" aria-live="polite">Ready</output>',
      '    <div><button type="button" data-runtime-reset>Reset to installed</button><button type="button" data-runtime-reapply>Reapply saved</button><button type="button" class="primary" data-editor-apply>Save &amp; Apply</button></div>',
      '  </footer>',
      '</section>'
    ].join('');
    documentObject.body.appendChild(root);

    const pageSelect = root.querySelector('[data-editor-page]');
    SIMPLE_RAG_PAGES.forEach((page) => {
      const option = documentObject.createElement('option');
      option.value = page.id;
      option.textContent = page.label;
      pageSelect.appendChild(option);
    });

    state.ui = {
      root,
      dialog: root.querySelector('.simple-gradient-runtime__dialog'),
      returnFocus,
      enabled: root.querySelector('[data-runtime-enabled]'),
      context: root.querySelector('[data-runtime-context]'),
      profile: root.querySelector('[data-runtime-profile]'),
      status: root.querySelector('[data-runtime-status]'),
      page: pageSelect,
      targets: root.querySelector('[data-editor-targets]'),
      targetName: root.querySelector('[data-editor-target-name]'),
      modeInputs: [...root.querySelectorAll('input[name="simple-gradient-mode"]')],
      gradientControls: root.querySelector('[data-editor-gradient-controls]'),
      preset: root.querySelector('[data-editor-preset]'),
      preview: root.querySelector('[data-editor-preview]'),
      previewName: root.querySelector('[data-editor-preview-name]'),
      previewMeta: root.querySelector('[data-editor-preview-meta]'),
      angleRange: root.querySelector('[data-editor-angle-range]'),
      angleNumber: root.querySelector('[data-editor-angle-number]'),
      stops: root.querySelector('[data-editor-stops]'),
      stopCount: root.querySelector('[data-editor-stop-count]'),
      addStop: root.querySelector('[data-editor-add-stop]'),
      apply: root.querySelector('[data-editor-apply]')
    };

    root.addEventListener('click', (event) => {
      if (event.target === root) closeEditor();
    });
    root.querySelector('[data-runtime-close]').addEventListener('click', closeEditor);
    root.querySelector('[data-runtime-expand]').addEventListener('click', (event) => {
      const expanded = root.dataset.size !== 'fullscreen';
      root.dataset.size = expanded ? 'fullscreen' : 'comfortable';
      event.currentTarget.textContent = expanded ? 'Restore' : 'Expand';
      event.currentTarget.setAttribute('aria-pressed', expanded ? 'true' : 'false');
    });
    state.ui.enabled.addEventListener('change', () => setEnabled(state.ui.enabled.checked));
    root.querySelector('[data-runtime-reset]').addEventListener('click', resetProfile);
    root.querySelector('[data-runtime-reapply]').addEventListener('click', () => scheduleApply('manual-reapply'));
    state.ui.apply.addEventListener('click', applyDraftProfile);
    state.ui.page.addEventListener('change', () => {
      const priorTarget = state.editorTarget;
      state.editorPage = state.ui.page.value;
      if (priorTarget !== 'app') {
        const panelId = priorTarget.startsWith('panel:') ? priorTarget.split('.')[1] : '';
        state.editorTarget = panelId ? editorTarget(state.editorPage, panelId) : editorTarget(state.editorPage);
      }
      state.draftProfile.editor.activePage = state.editorPage;
      state.draftProfile.editor.activeTarget = state.editorTarget;
      markDraftDirty(`Editing ${pageLabel(state.editorPage)}`);
      renderEditor();
    });
    state.ui.targets.addEventListener('click', (event) => {
      const button = event.target.closest('[data-editor-target]');
      if (!button) return;
      state.editorTarget = button.dataset.editorTarget;
      state.draftProfile.editor.activeTarget = state.editorTarget;
      const assignment = state.draftProfile.assignments[state.editorTarget];
      if (assignment?.mode === 'gradient') state.selectedGradientId = assignment.gradientId;
      renderEditor();
    });
    state.ui.modeInputs.forEach((input) => input.addEventListener('change', () => {
      if (input.checked) setDraftMode(input.value);
    }));
    state.ui.preset.addEventListener('change', () => selectPreset(state.ui.preset.value));
    const updateAngle = (value) => {
      const gradient = ensureDraftGradient(selectedGradientId());
      gradient.angle = Math.round(clamp(value, 0, 359));
      markDraftDirty('Gradient angle changed');
      updatePreview();
    };
    state.ui.angleRange.addEventListener('input', () => updateAngle(state.ui.angleRange.value));
    state.ui.angleNumber.addEventListener('input', () => updateAngle(state.ui.angleNumber.value));
    state.ui.addStop.addEventListener('click', addStop);
    state.ui.stops.addEventListener('click', (event) => {
      const button = event.target.closest('[data-stop-remove]');
      if (button) removeStop(Number(button.dataset.stopRemove));
    });
    state.ui.stops.addEventListener('input', (event) => {
      const gradient = ensureDraftGradient(selectedGradientId());
      const colorIndex = event.target.dataset.stopColor;
      const positionIndex = event.target.dataset.stopPosition;
      const opacityIndex = event.target.dataset.stopOpacity;
      if (colorIndex !== undefined) {
        const index = Number(colorIndex);
        gradient.stops[index].color = normalizeHex(event.target.value, gradient.stops[index].color).slice(0, 7);
        const value = state.ui.stops.querySelector(`[data-stop-color-value="${index}"]`);
        if (value) value.textContent = gradient.stops[index].color;
      } else if (positionIndex !== undefined) {
        gradient.stops[Number(positionIndex)].position = Math.round(clamp(event.target.value, 0, 100));
      } else if (opacityIndex !== undefined) {
        gradient.stops[Number(opacityIndex)].opacity = Math.round(clamp(event.target.value, 0, 100));
      } else {
        return;
      }
      markDraftDirty('Gradient stop changed');
      updatePreview();
    });
    state.ui.dialog.addEventListener('keydown', trapEditorFocus);
    renderEditor();
    updateEditorStatus(state.appliedElements.size);
  }

  function studioAssets() {
    const assets = global.__SIMPLE_GRADIENT_STUDIO_ASSETS__;
    return assets?.schema === 'simple-gradient-studio-assets'
      && typeof assets.html === 'string'
      && typeof assets.css === 'string'
      && typeof assets.script === 'string'
      ? assets
      : null;
  }

  function studioChannel() {
    const bytes = new Uint32Array(4);
    try {
      global.crypto?.getRandomValues?.(bytes);
    } catch {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 0xffffffff);
    }
    return [...bytes].map((value) => value.toString(16).padStart(8, '0')).join('');
  }

  function scriptText(value) {
    return String(value || '').replace(/<\/script/gi, '<\\/script');
  }

  function styleText(value) {
    return String(value || '').replace(/<\/style/gi, '<\\/style');
  }

  function studioHostAdapter(profile, channel, view) {
    const safeProfile = JSON.stringify(normalizeProfile(profile)).replace(/</g, '\\u003c');
    const safeChannel = JSON.stringify(channel);
    const safeView = JSON.stringify(view);
    return `(() => {
      'use strict';
      const channel = ${safeChannel};
      const view = ${safeView};
      let hostState = { profile: ${safeProfile} };
      const send = (message) => parent.postMessage({ type: 'simple-gradient-studio-host', channel, message }, '*');
      const importProfile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.hidden = true;
        input.addEventListener('change', async () => {
          const file = input.files && input.files[0];
          if (file) send({ type: 'importData', text: await file.text() });
          input.remove();
        }, { once: true });
        document.body.appendChild(input);
        input.click();
      };
      window.acquireVsCodeApi = () => ({
        postMessage(message) {
          if (message && message.type === 'import') importProfile();
          else send(message);
        },
        getState() { return hostState; },
        setState(next) { hostState = next && typeof next === 'object' ? next : hostState; }
      });
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'icon-button simple-gradient-host-close';
      close.title = view === 'studio' ? 'Close Gradient Studio' : 'Close detached view';
      close.setAttribute('aria-label', close.title);
      close.innerHTML = '<span class="codicon codicon-close" aria-hidden="true"></span>';
      close.addEventListener('click', () => send({ type: 'closeView', view }));
      document.querySelector('.top-actions')?.appendChild(close);
      const target = document.getElementById('targetCatalogSelect');
      if (target) {
        target.value = 'simplerag';
        target.disabled = true;
        target.title = 'This installed editor targets SimpleRAG';
      }
      let escapeWasInternal = false;
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        escapeWasInternal = Boolean(
          document.getElementById('stopModal')?.classList.contains('open')
          || !document.getElementById('exportMenu')?.hidden
          || document.querySelector('.scope-panel.drawer-open')
        );
        setTimeout(() => {
          if (!escapeWasInternal) send({ type: 'closeView', view });
          escapeWasInternal = false;
        }, 0);
      }, true);
    })();`;
  }

  function studioDocument(profile, channel, view = 'studio') {
    const assets = studioAssets();
    if (!assets) return '';
    const hostStyle = [
      '.simple-gradient-host-close { flex: 0 0 auto; }',
      '.simple-gradient-host-close .codicon { pointer-events: none; }',
      '#targetCatalogSelect:disabled { opacity: 1; cursor: default; }'
    ].join('\n');
    const policy = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';";
    let html = assets.html.replace('__SIMPLE_GRADIENT_VIEW__', view);
    html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><style>${styleText(`${assets.css}\n${hostStyle}`)}</style>`);
    html = html.replace('</body>', `<script>${scriptText(studioHostAdapter(profile, channel, view))}</script><script>${scriptText(assets.script)}</script></body>`);
    return html;
  }

  function studioFrameRecordFromSource(source) {
    if (!state.ui?.frames) return null;
    for (const record of state.ui.frames.values()) {
      if (record.iframe.contentWindow === source) return record;
    }
    return null;
  }

  function postStudioMessage(record, message) {
    record?.iframe?.contentWindow?.postMessage?.(message, '*');
  }

  function broadcastStudioState(profile = state.draftProfile, message = '', exceptRecord = null) {
    if (!state.ui?.frames) return;
    for (const record of state.ui.frames.values()) {
      if (record === exceptRecord) continue;
      postStudioMessage(record, { type: 'state', profile: clone(normalizeProfile(profile)) });
      if (message) {
        postStudioMessage(record, { type: 'simpleRagIntegration', installed: true, message });
      }
    }
  }

  function commitStudioDraft(profile, message) {
    const normalized = normalizeProfile(profile || state.draftProfile || activeProfile());
    normalized.editor.targetCatalog = 'simplerag';
    state.draftProfile = clone(normalized);
    state.draftDirty = false;
    setProfile(normalized);
    broadcastStudioState(normalized, message || 'Saved and applied across SimpleRAG.');
  }

  function exportedStudioCss(profile) {
    const normalized = normalizeProfile(profile);
    const lines = [':root {'];
    for (const [id, gradient] of Object.entries(normalized.gradients)) {
      lines.push(`  --simple-gradient-${id}: ${gradientToCss(gradient)};`);
    }
    lines.push('}', '');
    for (const [target, assignment] of Object.entries(normalized.assignments)) {
      const safeTarget = target.replace(/"/g, '\\"');
      if (assignment.mode === 'gradient' && normalized.gradients[assignment.gradientId]) {
        lines.push(`[data-simple-gradient-target="${safeTarget}"] {`);
        lines.push(`  background-image: var(--simple-gradient-${assignment.gradientId});`);
        lines.push('}');
      } else if (assignment.mode === 'solid') {
        lines.push(`[data-simple-gradient-target="${safeTarget}"] { background-image: none; }`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  function downloadStudioFile(filename, content, type) {
    const blob = new global.Blob([content], { type });
    const url = global.URL.createObjectURL(blob);
    const anchor = documentObject.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    documentObject.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    global.setTimeout(() => global.URL.revokeObjectURL(url), 0);
  }

  async function copyStudioText(text) {
    try {
      await global.navigator?.clipboard?.writeText?.(String(text || ''));
      return true;
    } catch {
      const field = documentObject.createElement('textarea');
      field.value = String(text || '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      documentObject.body.appendChild(field);
      field.select();
      const copied = documentObject.execCommand?.('copy') === true;
      field.remove();
      return copied;
    }
  }

  function closeStudioView(view) {
    if (view === 'studio') {
      closeEditor();
      return;
    }
    const record = state.ui?.frames?.get(view);
    record?.host?.remove();
    state.ui?.frames?.delete(view);
    state.ui?.frames?.get('studio')?.iframe?.focus();
  }

  function createStudioFrame(view, host) {
    const channel = studioChannel();
    const iframe = documentObject.createElement('iframe');
    iframe.className = 'simple-gradient-studio-frame';
    iframe.title = view === 'studio'
      ? 'SimpleGradient Studio editor'
      : `SimpleGradient ${view} detached view`;
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '100%');
    iframe.style.cssText = 'width: 100%; height: 100%; min-height: 0; border: 0; display: block;';
    iframe.srcdoc = studioDocument(state.draftProfile || activeProfile(), channel, view);
    host.appendChild(iframe);
    const record = { view, channel, host, iframe };
    state.ui.frames.set(view, record);
    return record;
  }

  function openStudioPopout(view) {
    if (!state.ui || !['assignments', 'preview'].includes(view)) return;
    const existing = state.ui.frames.get(view);
    if (existing) {
      existing.host.hidden = false;
      existing.iframe.focus();
      return;
    }
    const host = documentObject.createElement('section');
    host.className = 'simple-gradient-studio-popout';
    host.dataset.studioView = view;
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-label', `Detached Gradient ${view}`);
    host.style.cssText = 'width: min(1080px, calc(100vw - 28px)); height: min(780px, calc(100% - 28px)); margin: 0; border: 0; border-radius: var(--sgr-corner-lg); background: transparent; box-shadow: var(--sgr-shadow); overflow: hidden;';
    state.ui.root.appendChild(host);
    const record = createStudioFrame(view, host);
    record.iframe.addEventListener('load', () => record.iframe.focus(), { once: true });
  }

  function handleStudioHostMessage(event) {
    const record = studioFrameRecordFromSource(event.source);
    if (!record || event.data?.type !== 'simple-gradient-studio-host' || event.data.channel !== record.channel) return;
    const message = event.data.message;
    if (!message || typeof message !== 'object') return;
    switch (message.type) {
      case 'ready':
        postStudioMessage(record, { type: 'state', profile: clone(state.draftProfile || activeProfile()) });
        postStudioMessage(record, { type: 'simpleRagIntegration', installed: true });
        break;
      case 'updateProfile':
        state.draftProfile = normalizeProfile(message.profile);
        state.draftProfile.editor.targetCatalog = 'simplerag';
        if (typeof message.manualOverride === 'boolean') {
          state.manualOverride = message.manualOverride;
        }
        state.draftDirty = true;
        broadcastStudioState(state.draftProfile, '', record);
        scheduleApply('studio-draft-updated');
        break;
      case 'save':
        global.clearTimeout(state.ui.saveTimer);
        state.ui.saveTimer = global.setTimeout(() => commitStudioDraft(state.draftProfile, 'Gradient profile saved and applied.'), 80);
        break;
      case 'installSimpleRag':
        global.clearTimeout(state.ui.saveTimer);
        commitStudioDraft(message.profile || state.draftProfile, 'Gradient profile applied to SimpleRAG.');
        break;
      case 'openView':
        if (message.view === 'assignments' || message.view === 'preview') openStudioPopout(message.view);
        break;
      case 'closeView':
        closeStudioView(message.view || record.view);
        break;
      case 'importData':
        try {
          const imported = normalizeProfile(JSON.parse(String(message.text || '')));
          imported.editor.targetCatalog = 'simplerag';
          commitStudioDraft(imported, `Imported and applied gradient profile “${imported.name}”.`);
        } catch (error) {
          postStudioMessage(record, {
            type: 'simpleRagIntegration',
            installed: false,
            message: `Could not import that gradient profile: ${error instanceof Error ? error.message : String(error)}`
          });
        }
        break;
      case 'export': {
        const profile = normalizeProfile(state.draftProfile || activeProfile());
        const format = message.format === 'css' ? 'css' : 'json';
        const content = format === 'css' ? exportedStudioCss(profile) : `${JSON.stringify(profile, null, 2)}\n`;
        downloadStudioFile(`simple-gradient-profile.${format}`, content, format === 'css' ? 'text/css' : 'application/json');
        break;
      }
      case 'copy':
        void copyStudioText(message.text).then((copied) => {
          postStudioMessage(record, {
            type: 'simpleRagIntegration',
            installed: true,
            message: copied ? 'Copied gradient output to the clipboard.' : 'Clipboard access was unavailable.'
          });
        });
        break;
    }
  }

  function ensureStudioModal(returnFocus) {
    if (state.ui || !documentObject.body || !studioAssets()) return false;
    const root = documentObject.createElement('div');
    root.id = ROOT_ID;
    root.className = 'simple-gradient-runtime simple-gradient-studio-host';

    root.style.cssText = 'position: fixed; inset: 0; z-index: 2147483000; width: 100%; height: 100%; padding: 14px; display: block; box-sizing: border-box; pointer-events: auto; background: rgba(4, 6, 10, 0.68); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); place-items: initial;';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'SimpleGradient Studio');
    documentObject.body.appendChild(root);
    state.ui = {
      root,
      returnFocus,
      frames: new Map(),
      saveTimer: 0
    };
    global.addEventListener('message', handleStudioHostMessage);
    const record = createStudioFrame('studio', root);
    record.iframe.addEventListener('load', () => record.iframe.focus(), { once: true });
    return true;
  }

  function openEditorFromSettings(returnFocus) {
    const context = detectContext(documentObject);
    if (!settingsEntryHost(context)) return false;
    if (!state.draftDirty) state.draftProfile = clone(activeProfile());
    state.draftProfile.editor.targetCatalog = 'simplerag';
    return ensureStudioModal(returnFocus || state.settingsEntry);
  }

  function updateEditorStatus(appliedCount) {
    state.lastAppliedCount = appliedCount;
  }

  function onProfileEvent(event) {
    if (event?.detail?.profile) {
      const installed = normalizeProfile(event.detail.profile);
      global.__SIMPLE_GRADIENT_PROFILE__ = installed;
      state.installedFingerprint = profileFingerprint(installed);
      state.profileOverride = null;
      state.draftProfile = clone(installed);
      state.draftDirty = false;
      state.editorPage = installed.editor.activePage;
      state.editorTarget = installed.editor.activeTarget;
      clearPersistedProfileOverride();
      renderEditor();
    }
    scheduleApply('profile-event');
  }

  function onStorage(event) {
    if (event.key === ENABLED_STORAGE_KEY) {
      state.enabled = event.newValue !== 'false';
      scheduleApply('storage-sync');
      return;
    }
    if (event.key === PROFILE_STORAGE_KEY) {
      const installed = installedProfile();
      const next = readPersistedProfileOverride(installed, event.newValue);
      state.installedFingerprint = profileFingerprint(installed);
      state.profileOverride = next;
      state.draftProfile = clone(next || installed);
      state.draftDirty = false;
      state.editorPage = state.draftProfile.editor.activePage;
      state.editorTarget = state.draftProfile.editor.activeTarget;
      state.selectedGradientId = '';
      renderEditor();
      scheduleApply('profile-storage-sync');
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
    if (state.applyFrame) {
      if (typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(state.applyFrame);
      else global.clearTimeout?.(state.applyFrame);
      state.applyFrame = 0;
    }
    clearAppliedSurfaces();
    state.ui?.root.remove();
    state.ui = null;
    removeSettingsEntry();
    restoreComfyAppearanceTile();
    documentObject.getElementById(ROOT_ID)?.remove();
    documentObject.removeEventListener('DOMContentLoaded', start);
    global.removeEventListener('hashchange', onNavigation);
    global.removeEventListener('popstate', onNavigation);
    global.removeEventListener('storage', onStorage);
    global.removeEventListener('ragworkspace-theme-changed', onNavigation);
    global.removeEventListener('simple-gradient-profile-changed', onProfileEvent);
    global.removeEventListener('simple-gradient:profile-changed', onProfileEvent);
    try {
      if (global.SimpleGradientRuntime === api) delete global.SimpleGradientRuntime;
    } catch {
      // A host may expose the global as non-configurable; the next load replaces it.
    }
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
    open: () => openEditorFromSettings(state.settingsEntry),
    close: closeEditor,
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
    installObserver();
    scheduleApply('startup');
  }

  if (documentObject.readyState === 'loading') {
    documentObject.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
