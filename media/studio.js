(() => {
  'use strict';

  const host = typeof acquireVsCodeApi === 'function'
    ? acquireVsCodeApi()
    : {
      postMessage(message) {
        window.dispatchEvent(new CustomEvent('simple-gradient-host-message', { detail: message }));
      },
      getState() {
        try { return JSON.parse(localStorage.getItem('simpleGradient.previewState') || 'null'); } catch { return null; }
      },
      setState(value) {
        localStorage.setItem('simpleGradient.previewState', JSON.stringify(value));
      }
    };

  const catalogs = {
    studio: {
      label: 'Design workbench',
      pages: [
        { id: 'workbench', label: 'Workbench', icon: 'layout' },
        { id: 'files', label: 'Files', icon: 'files' },
        { id: 'search', label: 'Search', icon: 'search' },
        { id: 'terminal', label: 'Terminal', icon: 'terminal' },
        { id: 'debugger', label: 'Debug', icon: 'debug-alt' },
        { id: 'settings', label: 'Settings', icon: 'settings-gear' },
        { id: 'components', label: 'Components', icon: 'extensions' }
      ],
      surfaces: [
        { id: 'navigation', label: 'Navigation' },
        { id: 'editor', label: 'Editor' },
        { id: 'components', label: 'Components' },
        { id: 'inspector', label: 'Inspector' },
        { id: 'toolbar', label: 'Toolbar' }
      ],
      previewSurfaces: {
        navigation: 'navigation', workspace: 'editor', cards: 'components', assistant: 'inspector', toolbar: 'toolbar'
      }
    },
    simplerag: {
      label: 'SimpleRAG',
      pages: [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'journal', label: 'Journal', icon: 'book' },
        { id: 'tasks', label: 'Tasks', icon: 'checklist' },
        { id: 'email', label: 'Email', icon: 'mail' },
        { id: 'calendar', label: 'Calendar', icon: 'calendar' },
        { id: 'pdf', label: 'PDF', icon: 'file-pdf' },
        { id: 'graph', label: 'Knowledge Graph', icon: 'type-hierarchy' },
        { id: 'plugins', label: 'Plug-ins', icon: 'extensions' },
        { id: 'settings', label: 'Settings', icon: 'settings-gear' }
      ],
      surfaces: [
        { id: 'navigation', label: 'Navigation' },
        { id: 'workspace', label: 'Workspace' },
        { id: 'cards', label: 'Cards' },
        { id: 'assistant', label: 'Assistant' },
        { id: 'toolbar', label: 'Toolbar' },
        { id: 'composer', label: 'Composer' }
      ],
      previewSurfaces: {
        navigation: 'navigation', workspace: 'workspace', cards: 'cards', assistant: 'assistant', toolbar: 'toolbar', composer: 'composer'
      }
    }
  };

  let pages = catalogs.studio.pages;
  let surfaces = catalogs.studio.surfaces;
  let targetLabels = { app: 'App default' };

  const byId = (id) => document.getElementById(id);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
  const safeHex = (value, fallback = '#E86633') => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;

  function defaultProfile() {
    return {
      schema: 'simple-gradient-profile',
      version: 1,
      name: 'Warm Glass Workspace',
      gradients: {
        'warm-studio': {
          id: 'warm-studio', name: 'Warm Studio Canvas', type: 'linear', angle: 132, stops: [
            { color: '#FFF9F2', position: 0, opacity: 100 },
            { color: '#F8EFE3', position: 42, opacity: 100 },
            { color: '#F1D6C1', position: 76, opacity: 100 },
            { color: '#E86633', position: 100, opacity: 100 }
          ]
        },
        'ember-focus': {
          id: 'ember-focus', name: 'Ember Focus', type: 'linear', angle: 148, stops: [
            { color: '#171512', position: 0, opacity: 100 },
            { color: '#25221F', position: 44, opacity: 100 },
            { color: '#563022', position: 75, opacity: 100 },
            { color: '#E86633', position: 100, opacity: 100 }
          ]
        },
        'ocean-workspace': {
          id: 'ocean-workspace', name: 'Ocean Workspace', type: 'linear', angle: 128, stops: [
            { color: '#12202A', position: 0, opacity: 100 },
            { color: '#167C8C', position: 48, opacity: 100 },
            { color: '#9BCBD1', position: 76, opacity: 100 },
            { color: '#E8F0F2', position: 100, opacity: 100 }
          ]
        },
        'grove-workspace': {
          id: 'grove-workspace', name: 'Grove Workspace', type: 'linear', angle: 142, stops: [
            { color: '#17231C', position: 0, opacity: 100 },
            { color: '#4D7C58', position: 46, opacity: 100 },
            { color: '#B8CFAD', position: 76, opacity: 100 },
            { color: '#EDF1E7', position: 100, opacity: 100 }
          ]
        },
        'oled-ember': {
          id: 'oled-ember', name: 'OLED Ember Edge', type: 'linear', angle: 118, stops: [
            { color: '#000000', position: 0, opacity: 100 },
            { color: '#0B0B0D', position: 52, opacity: 100 },
            { color: '#2A1710', position: 80, opacity: 100 },
            { color: '#E86633', position: 100, opacity: 100 }
          ]
        }
      },
      assignments: {
        app: { mode: 'gradient', gradientId: 'oled-ember' },
        'page:workbench': { mode: 'gradient', gradientId: 'warm-studio' },
        'panel:workbench.inspector': { mode: 'gradient', gradientId: 'warm-studio' },
        'page:files': { mode: 'gradient', gradientId: 'ocean-workspace' },
        'page:search': { mode: 'gradient', gradientId: 'grove-workspace' },
        'page:terminal': { mode: 'inherit' },
        'page:debugger': { mode: 'inherit' },
        'page:settings': { mode: 'inherit' },
        'page:components': { mode: 'inherit' }
      },
      editor: { activePage: 'workbench', activeTarget: 'panel:workbench.inspector', targetCatalog: 'studio', targetMode: true, zoom: 100 }
    };
  }

  const useFreshPreview = new URLSearchParams(window.location.search).has('fresh');

  const legacyState = host.getState();
  let profile = clone((useFreshPreview ? null : legacyState?.profile) || defaultProfile());
  profile.editor.targetCatalog = 'simplerag';
  if (!catalogs.simplerag.pages.some(p => p.id === profile.editor.activePage)) {
    profile.editor.activePage = 'home';
    profile.editor.activeTarget = 'app';
  }

  let selectedStopIndex = 0;
  let undoStack = [];
  let redoStack = [];
  let modalDraft = null;
  let modalTrigger = null;
  let toastTimer = 0;
  let assignmentVisible = true;
  let compareMode = false;
  let advancedMode = false;
  let blendMode = true;
  let blendStrength = 100;
  let shadowsOff = true;
  let subtleMode = true;
  let scopeDrawerOpen = false;
  let baseTheme = 'oled';
  let manualOverride = true;
  let sendTimer = 0;

  const IN_APP_THEMES = {
    oled: { id: 'oled', label: 'OLED Dark', ribbon: '#000000', ribbonText: '#ffffff', background: '#000000', card: '#0b0b0d', accent: '#e86633', text: '#f5f5f7', muted: '#8e8e93', border: '#222226', assistant: '#050507' },
    warm: { id: 'warm', label: 'Warm Sand', ribbon: '#201e1c', ribbonText: '#ffffff', background: '#f8efe3', card: '#fffaf4', accent: '#e86633', text: '#2e2925', muted: '#796f67', border: '#dfd1c3', assistant: '#25221f' },
    granite: { id: 'granite', label: 'Granite Silver', ribbon: '#292c30', ribbonText: '#ffffff', background: '#e4e6e8', card: '#f8f8f7', accent: '#59636e', text: '#25282b', muted: '#626970', border: '#c6cacf', assistant: '#30343a' },
    ocean: { id: 'ocean', label: 'Ocean Breeze', ribbon: '#12202a', ribbonText: '#ffffff', background: '#e8f0f2', card: '#f8fcfc', accent: '#167c8c', text: '#162b31', muted: '#61777b', border: '#c5d8da', assistant: '#172b33' },
    grove: { id: 'grove', label: 'Grove Forest', ribbon: '#17231c', ribbonText: '#ffffff', background: '#edf1e7', card: '#fbfcf6', accent: '#4d7c58', text: '#243127', muted: '#6b796d', border: '#ccd7c9', assistant: '#1d2a21' }
  };

  function activeCatalog() {
    if (profile.editor.targetCatalog === 'studio') return catalogs.studio;
    return catalogs.simplerag;
  }

  function syncCatalog() {
    const catalog = activeCatalog();
    pages = catalog.pages;
    surfaces = catalog.surfaces;
    targetLabels = { app: 'App default' };
    pages.forEach((page) => {
      targetLabels[`page:${page.id}`] = page.label;
      surfaces.forEach((surface) => {
        targetLabels[`panel:${page.id}.${surface.id}`] = `${page.label} ${surface.label.toLowerCase()}`;
      });
    });
  }

  function gradientCss(gradient, forceSubtle = subtleMode) {
    if (!gradient) return 'none';
    const stops = gradient.stops.map((stop) => {
      let opacity = clamp(stop.opacity, 0, 100);
      if (forceSubtle && opacity > 65) {
        opacity = Math.round(opacity * 0.78);
      }
      const alpha = Math.floor((opacity * 255 + 50) / 100).toString(16).padStart(2, '0').toUpperCase();
      const color = opacity >= 100 ? stop.color.slice(0, 7) : `${stop.color.slice(0, 7)}${alpha}`;
      return `${color} ${stop.position}%`;
    });
    return `linear-gradient(${gradient.angle}deg, ${stops.join(', ')})`;
  }

  function assignmentFor(target) {
    return profile.assignments[target] || { mode: 'inherit' };
  }

  function resolveGradient(target) {
    const assignment = assignmentFor(target);
    if (assignment.mode === 'solid') return null;
    if (assignment.mode === 'gradient' && profile.gradients[assignment.gradientId]) return profile.gradients[assignment.gradientId];
    if (target.startsWith('panel:')) {
      const pageId = target.slice('panel:'.length).split('.')[0];
      const pageAssignment = assignmentFor(`page:${pageId}`);
      if (pageAssignment.mode === 'solid') return null;
      if (pageAssignment.mode === 'gradient' && profile.gradients[pageAssignment.gradientId]) return profile.gradients[pageAssignment.gradientId];
    }
    const appAssignment = assignmentFor('app');
    return appAssignment.mode === 'gradient' ? profile.gradients[appAssignment.gradientId] || null : null;
  }

  function activeGradient() {
    return resolveGradient(profile.editor.activeTarget) || Object.values(profile.gradients)[0];
  }

  function activeGradientId() {
    const targetAssignment = assignmentFor(profile.editor.activeTarget);
    if (targetAssignment.mode === 'gradient' && profile.gradients[targetAssignment.gradientId]) return targetAssignment.gradientId;
    return activeGradient()?.id;
  }

  function targetPage(target = profile.editor.activeTarget) {
    if (target === 'app') return profile.editor.activePage;
    if (target.startsWith('page:')) return target.slice(5);
    if (target.startsWith('panel:')) return target.slice(6).split('.')[0];
    return profile.editor.activePage;
  }

  function targetLabel(target = profile.editor.activeTarget) {
    if (targetLabels[target]) return targetLabels[target];
    if (target.startsWith('page:')) return titleCase(target.slice(5));
    if (target.startsWith('panel:')) return titleCase(target.split('.').at(-1));
    return 'App default';
  }

  function titleCase(value) {
    return String(value || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function assignmentLabel(target = profile.editor.activeTarget) {
    const mode = assignmentFor(target).mode;
    if (mode === 'solid') return 'No gradient';
    if (mode === 'inherit') return 'Inherited';
    return target.startsWith('panel:') ? 'Panel override' : target.startsWith('page:') ? 'Page override' : 'App gradient';
  }

  function scheduleSend() {
    clearTimeout(sendTimer);
    sendTimer = window.setTimeout(() => {
      host.setState?.({ profile });
      host.postMessage({ type: 'updateProfile', profile });
    }, 55);
  }

  function commit(mutator, message) {
    undoStack.push(clone(profile));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
    mutator(profile);
    selectedStopIndex = Math.min(selectedStopIndex, Math.max(0, activeGradient().stops.length - 1));
    render();
    scheduleSend();
    if (message) showToast(message);
  }

  function replaceFromHistory(next, destination) {
    destination.push(clone(profile));
    profile = clone(next);
    selectedStopIndex = Math.min(selectedStopIndex, Math.max(0, activeGradient().stops.length - 1));
    render();
    scheduleSend();
  }

  function setTarget(target) {
    profile.editor.activeTarget = target;
    profile.editor.activePage = targetPage(target);
    selectedStopIndex = 0;
    render();
    scheduleSend();
  }

  function ensureTargetGradient() {
    let id = activeGradientId();
    if (!id || !profile.gradients[id]) id = Object.keys(profile.gradients)[0];
    if (assignmentFor(profile.editor.activeTarget).mode !== 'gradient') {
      profile.assignments[profile.editor.activeTarget] = { mode: 'gradient', gradientId: id };
    }
    return profile.gradients[id];
  }

  function rgbaToHexOpacity(stop) {
    return safeHex(stop.color).slice(0, 7);
  }

  function hexToRgb(hex) {
    const clean = safeHex(hex).slice(1);
    const r = parseInt(clean.slice(0, 2), 16) || 0;
    const g = parseInt(clean.slice(2, 4), 16) || 0;
    const b = parseInt(clean.slice(4, 6), 16) || 0;
    const a = clean.length >= 8 ? Math.round((parseInt(clean.slice(6, 8), 16) / 255) * 100) : 100;
    return { r, g, b, a };
  }

  function rgbToHex(r, g, b) {
    const clampCh = (v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
    return `#${clampCh(r)}${clampCh(g)}${clampCh(b)}`;
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = Math.min(100, Math.max(0, s)) / 100;
    v = Math.min(100, Math.max(0, v)) / 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function hsvToHex(h, s, v) {
    const { r, g, b } = hsvToRgb(h, s, v);
    return rgbToHex(r, g, b);
  }

  let modalHsv = { h: 20, s: 80, v: 90 };
  let modalOpacityVal = 100;

  function relativeLuminance(hex) {
    const values = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }

  function contrastRatio(hex, against = '#FFFFFF') {
    const first = relativeLuminance(safeHex(hex).slice(0, 7));
    const second = relativeLuminance(against);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }

  function render() {
    syncCatalog();
    renderCatalog();
    renderScope();
    renderPreview();
    renderLibrary();
    renderStops();
    renderAssignments();
    renderSummary();
    byId('undoButton').disabled = undoStack.length === 0;
    byId('redoButton').disabled = redoStack.length === 0;
    byId('assignmentPopout').hidden = !assignmentVisible;
    document.querySelector('.scope-panel').classList.toggle('drawer-open', scopeDrawerOpen);
    byId('scopeDrawerButton').setAttribute('aria-expanded', String(scopeDrawerOpen));
  }

  function renderCatalog() {
    const catalog = activeCatalog();
    byId('targetCatalogSelect').value = profile.editor.targetCatalog;
    byId('sampleBrandName').textContent = catalog.label;

    const profileSelect = byId('profileSelect');
    if (profileSelect) {
      profileSelect.replaceChildren();
      const currentName = profile.name || 'Warm Glass Workspace';
      const presetNames = [
        currentName,
        'Warm Glass Workspace',
        'Ember Focus Studio',
        'Oceanic Flow',
        'Grove Forest Theme',
        'OLED Ember Minimal'
      ];
      const uniqueProfiles = Array.from(new Set(presetNames));
      for (const name of uniqueProfiles) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === currentName) option.selected = true;
        profileSelect.append(option);
      }
    }

    const pageSelect = byId('pageSelect');
    pageSelect.replaceChildren();
    for (const page of pages) {
      const option = document.createElement('option');
      option.value = page.id;
      option.textContent = page.label;
      pageSelect.append(option);
    }

    const sampleNav = byId('samplePageNav');
    sampleNav.replaceChildren();
    for (const page of pages) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.pagePreview = page.id;
      const icon = document.createElement('span');
      icon.className = `codicon codicon-${page.icon}`;
      button.append(icon, document.createTextNode(page.label));
      sampleNav.append(button);
    }

    byId('integrationHint').textContent = profile.editor.targetCatalog === 'simplerag'
      ? 'Assignments in this catalog install into both SimpleRAG Comfy and Advanced.'
      : `Switch the target above to ${catalogs.simplerag.label} to define each SimpleRAG page and panel.`;
  }

  function createScopeRow({ id, label, icon, page = false, child = false }) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `scope-row${child ? ' child' : ''}`;
    row.dataset.target = id;
    row.setAttribute('role', 'treeitem');
    if (child) {
      const line = document.createElement('span');
      line.className = 'tree-line';
      row.append(line);
    } else if (page) {
      const caret = document.createElement('span');
      caret.className = `codicon codicon-chevron-${id === `page:${profile.editor.activePage}` ? 'down' : 'right'}`;
      row.append(caret);
    } else {
      const caret = document.createElement('span');
      caret.className = 'codicon codicon-chevron-down';
      row.append(caret);
    }
    const glyph = document.createElement('span');
    glyph.className = `codicon codicon-${icon || 'symbol-color'}`;
    const text = document.createElement(child ? 'span' : 'b');
    text.textContent = label;
    const chip = document.createElement('span');
    chip.className = 'scope-chip';
    chip.textContent = assignmentLabel(id);
    row.append(glyph, text, chip);
    return row;
  }

  function renderScope() {
    const scopeTree = byId('scopeTree');
    if (scopeTree) {
      scopeTree.replaceChildren();
      const appRow = createScopeRow({ id: 'app', label: 'App default', icon: 'home' });
      scopeTree.append(appRow);

      pages.forEach((page) => {
        const pageTarget = `page:${page.id}`;
        const pageRow = createScopeRow({ id: pageTarget, label: page.label, icon: page.icon, page: true });
        scopeTree.append(pageRow);

        if (page.id === profile.editor.activePage) {
          pageRow.setAttribute('aria-expanded', 'true');
          const children = document.createElement('div');
          children.className = 'scope-children';
          children.setAttribute('role', 'group');

          surfaces.forEach((surface) => {
            const panelTarget = `panel:${page.id}.${surface.id}`;
            const panelRow = createScopeRow({
              id: panelTarget,
              label: `${surface.label} panel`,
              icon: surface.id === 'navigation' ? 'list-tree' : surface.id === 'workspace' || surface.id === 'editor' ? 'layout-centered' : surface.id === 'cards' || surface.id === 'components' ? 'extensions' : surface.id === 'assistant' || surface.id === 'inspector' ? 'sparkle' : 'filter',
              child: true
            });
            children.append(panelRow);
          });
          scopeTree.append(children);
        }
      });
    }

    all('.scope-row[data-target]').forEach((row) => {
      const target = row.dataset.target;
      const assignment = assignmentFor(target);
      const chip = row.querySelector('.scope-chip');
      const selected = target === profile.editor.activeTarget;
      row.classList.toggle('selected', selected);
      row.setAttribute('aria-selected', String(selected));
      if (chip) {
        chip.classList.remove('page', 'panel');
        chip.textContent = assignmentLabel(target);
        if (assignment.mode === 'gradient' && target.startsWith('panel:')) chip.classList.add('panel');
        if (assignment.mode === 'gradient' && target.startsWith('page:')) chip.classList.add('page');
      }
    });

    const action = assignmentFor(profile.editor.activeTarget);
    byId('scopeActionText').textContent = action.mode === 'gradient'
      ? `This ${profile.editor.activeTarget.startsWith('panel:') ? 'panel' : 'scope'} has its own gradient override.`
      : action.mode === 'solid' ? 'This scope explicitly uses a solid surface.' : 'This scope inherits its gradient from its parent.';
    byId('revertScopeButton').innerHTML = '<span class="codicon codicon-debug-restart"></span>Revert to inherited';
    byId('revertScopeButton').disabled = profile.editor.activeTarget === 'app' || action.mode === 'inherit';
  }


  function getComfyPageHtml(pageId) {
    if (pageId === 'home') {
      return `
        <div class="exact-workspace-page exact-home-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:home.navigation">
            <div class="helper-header">
              <div class="workspace-title-row"><span class="codicon codicon-briefcase"></span><b>My workspace</b></div>
              <button type="button" class="mini-action-btn" title="Switch workspace"><span class="codicon codicon-arrow-swap"></span></button>
            </div>
            <button type="button" class="workspace-add-btn"><span class="codicon codicon-add"></span>New workspace</button>
            <div class="workspace-action-row">
              <button type="button" class="action-btn-pill primary"><span class="codicon codicon-add"></span>New chat</button>
              <button type="button" class="action-btn-pill"><span class="codicon codicon-symbol-property"></span>Context</button>
            </div>
            <div class="tag-section">
              <small class="section-label">HOME RECENT</small>
            </div>
            <div class="helper-list">
              <div class="nav-item active">
                <div class="nav-item-top"><span class="codicon codicon-home"></span><b>hey</b><div class="nav-item-actions"><span class="codicon codicon-edit"></span><span class="codicon codicon-close"></span></div></div>
                <small>1 prompts • Sep 1 4:04 PM</small>
              </div>
              <div class="nav-item">
                <div class="nav-item-top"><span class="codicon codicon-comment-discussion"></span><b>hey</b></div>
                <small>4 prompts • Sep 1 11:14 AM</small>
              </div>
            </div>
          </div>

          <div class="workspace exact-comfy-home targetable" data-gradient-target="panel:home.workspace">
            <!-- Hero Welcome Banner -->
            <div class="home-welcome targetable" data-gradient-target="panel:home.cards">
              <span class="eyebrow">AI HOME</span>
              <h1>Let's work through it.</h1>
              <p>Every workspace stays available while AI Home answers.</p>
            </div>

            <!-- Central Chat Card -->
            <div class="chat-msg-card ai-reply targetable" data-gradient-target="panel:home.cards">
              <div class="chat-header-bar">
                <div class="chat-title-brand"><span class="codicon codicon-sparkle"></span> <b>AI Home</b></div>
                <div class="chat-header-actions">
                  <button type="button" class="pill-btn">+ New chat</button>
                  <button type="button" class="pill-btn"><span class="codicon codicon-settings"></span> Display</button>
                </div>
              </div>

              <div class="prompt-section">
                <small class="prompt-eyebrow">PROMPT</small>
                <div class="prompt-text"><em><b>hey</b></em></div>
              </div>

              <div class="thought-process-box">
                <div class="thought-header-row">
                  <span class="thought-cloud-icon">💭</span> <b>Thought process</b>
                </div>
                <p class="thought-narrative">Analyzing user greeting and preparing workspace context.</p>
              </div>

              <div class="chat-msg-body">
                <p class="reply-text">Hey! How can I help you today?</p>
              </div>

              <div class="chat-msg-footer">
                <span class="chat-tokens-stat">50.1 tokens/s • 2,752 tokens used</span>
              </div>
            </div>

            <!-- Source Pills -->
            <div class="chat-source-pills-row targetable" data-gradient-target="panel:home.cards">
              <span class="source-bubble"><span class="source-bullet">●</span> 6 workspace sources</span>
              <span class="source-bubble"><span class="source-bullet">●</span> semantic</span>
            </div>

            <!-- Composer Bar -->
            <div class="exact-home-composer targetable" data-gradient-target="panel:home.toolbar">
              <span class="codicon codicon-search"></span>
              <input placeholder="Ask across your complete workspace..." readonly>
              <div class="tags"><span class="tag">Web</span><span class="tag active">Agent</span><button type="button" class="tag-icon-btn"><span class="codicon codicon-screen-full"></span></button></div>
              <button class="send-btn" type="button"><span class="codicon codicon-send"></span></button>
            </div>

            <!-- Quick Navigation Tiles -->
            <div class="exact-home-tiles targetable" data-gradient-target="panel:home.cards">
              <button type="button"><span class="codicon codicon-file-pdf"></span><div><b>Document Hub</b><small>7 indexed files</small></div></button>
              <button type="button"><span class="codicon codicon-calendar"></span><div><b>Daily Planner</b><small>0 open items</small></div></button>
              <button type="button"><span class="codicon codicon-mail"></span><div><b>Inbox Stream</b><small>0 saved messages</small></div></button>
              <button type="button"><span class="codicon codicon-type-hierarchy"></span><div><b>Graph Network</b><small>Live connections</small></div></button>
            </div>
          </div>

          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:home.assistant">
            <div class="assistant-header">
              <div class="assistant-title-group"><span class="codicon codicon-settings"></span><b>AI Endpoint Panel</b></div>
              <div class="assistant-header-controls">
                <span class="chip-pill">Thinking</span>
                <button type="button" class="mini-action-btn">+ Add endpoint</button>
              </div>
            </div>
            <div class="assistant-history endpoint-grid-container">
              <div class="engine-mini-grid">
                <div class="engine-chip active"><b>Local Host</b><small>Active • one-click</small></div>
                <div class="engine-chip"><b>MLX Engine</b><small>Hardware local</small></div>
                <div class="engine-chip"><b>App Server</b><small>Workspace host</small></div>
                <div class="engine-chip"><b>Lemonade</b><small>Accelerated</small></div>
              </div>
              <div class="endpoint-dropdown-group">
                <label>Default engine: <select><option>Cloud Fast (token) - online</option></select></label>
                <label>Active size: <select><option>14b-instruct</option></select></label>
              </div>
              <div class="endpoint-items-list">
                <div class="endpoint-status-card">
                  <div class="ep-status-top"><b>Host Inference</b><button type="button" class="ep-btn">Start</button></div>
                  <small>http://localhost:8080/v1 • Compatible</small>
                </div>
                <div class="endpoint-status-card active targetable" data-gradient-target="panel:home.cards">
                  <div class="ep-status-top"><span class="ep-dot live"></span><b>Cloud Fast</b><span class="ep-badge">live</span></div>
                  <small>api • live • fast-instruct</small>
                </div>
                <div class="endpoint-status-card">
                  <div class="ep-status-top"><span class="ep-dot live"></span><b>High Reasoning</b><span class="ep-badge">live</span></div>
                  <small>api • live • reasoning-max</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'journal') {
      return `
        <div class="exact-workspace-page exact-journal-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:journal.navigation">
            <div class="helper-header"><span class="codicon codicon-book"></span><b>Journal Notes</b><button type="button" class="mini-action-btn">+ New</button></div>
            <div class="helper-list">
              <div class="nav-item active"><b>Sprint Review &amp; Planning</b><small>Today 10:30 AM • 3 tags</small></div>
              <div class="nav-item"><b>Architecture Vision 2025</b><small>Yesterday • System design</small></div>
              <div class="nav-item"><b>Meeting with Core Team</b><small>Oct 12 • Product, RAG</small></div>
              <div class="nav-item"><b>Daily Standup Log</b><small>Oct 10 • Notes</small></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:journal.workspace">
            <div class="editor-header">
              <div><h2>Sprint Review &amp; Planning</h2><div class="doc-meta-strip"><span class="doc-tag">#engineering</span><span class="doc-tag">#rag</span><span class="doc-tag">#sprint-4</span><span class="doc-date">October 14, 2025</span></div></div>
              <div class="editor-tools"><button type="button" class="active">Read</button><button type="button">Edit</button></div>
            </div>
            <div class="workspace-format-toolbar targetable" data-gradient-target="panel:journal.toolbar">
              <button type="button" title="Bold"><span class="codicon codicon-bold"></span></button>
              <button type="button" title="Italic"><span class="codicon codicon-italic"></span></button>
              <button type="button" title="List"><span class="codicon codicon-list-unordered"></span></button>
              <button type="button" title="Code"><span class="codicon codicon-code"></span></button>
              <button type="button" title="Link"><span class="codicon codicon-link"></span></button>
              <button type="button" title="Checkbox"><span class="codicon codicon-checklist"></span></button>
              <span class="tb-sep"></span>
              <button type="button" class="tb-text">Timestamp</button>
            </div>
            <div class="editor-surface">
              <div class="markdown-body">
                <h3>Objectives &amp; Key Results</h3>
                <ul class="task-check-list">
                  <li><span class="codicon codicon-check done-icon"></span> Unified gradient styling across all 9 pages</li>
                  <li><span class="codicon codicon-check done-icon"></span> High-contrast accessibility validation</li>
                  <li><span class="codicon codicon-clock pend-icon"></span> Knowledge graph node clustering</li>
                </ul>
                <h3>Implementation Details</h3>
                <p>All surface selectors are strictly allowlisted. The theme engine delivers atomic background updates without modifying text contrast.</p>
                <pre class="code-preview"><code>const runtime = SimpleGradient.resolveContext();
runtime.applySurfaceGradient('panel:journal.workspace');</code></pre>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:journal.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>AI Note Assistant</b></div>
            <div class="assistant-history">
              <div class="doc-card targetable" data-gradient-target="panel:journal.cards">
                <small class="card-eyebrow">SMART SUMMARY</small>
                <b>3 action items identified in sprint planning.</b>
                <p>Key focus: multi-surface live rendering and theme persistence.</p>
              </div>
              <div class="doc-card targetable" data-gradient-target="panel:journal.cards">
                <small class="card-eyebrow">RELATED TOPICS</small>
                <span>Architecture Vision 2025, System Design Whitepaper</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:journal.toolbar">
              <input placeholder="Ask about this note..." readonly>
              <button type="button"><span class="codicon codicon-send"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'tasks') {
      return `
        <div class="exact-workspace-page exact-tasks-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:tasks.navigation">
            <div class="helper-header"><span class="codicon codicon-checklist"></span><b>Task Boards</b></div>
            <div class="helper-list">
              <div class="nav-item active"><b>All Tasks (14)</b><small>Active Sprint</small></div>
              <div class="nav-item"><b>⭐ Priority (4)</b><small>High urgency</small></div>
              <div class="nav-item"><b>Sprint 4 (8)</b><small>In progress</small></div>
              <div class="nav-item"><b>Completed (28)</b><small>Archive</small></div>
            </div>
            <div class="tag-section">
              <small>TAGS</small>
              <div class="tag-chips"><span class="chip">#frontend</span><span class="chip">#backend</span><span class="chip">#design</span></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:tasks.workspace">
            <div class="editor-header">
              <h2>Sprint 4 Task Board</h2>
              <div class="editor-tools"><button type="button" class="primary-btn">+ Add Task</button><button type="button">Filter</button></div>
            </div>
            <div class="workspace-format-toolbar targetable" data-gradient-target="panel:tasks.toolbar">
              <span>Group: Status</span><span class="tb-sep"></span><span>Sort: Priority</span><span class="tb-sep"></span><button type="button" class="active">Kanban</button><button type="button">List</button>
            </div>
            <div class="task-grid">
              <div class="task-col">
                <b>TO DO (2)</b>
                <div class="task-card active targetable" data-gradient-target="panel:tasks.cards">
                  <span class="codicon codicon-circle-large"></span>
                  <div><b>Multi-page studio preview</b><div class="task-meta"><span class="pill-red">High</span><span class="chip">#frontend</span></div></div>
                </div>
                <div class="task-card targetable" data-gradient-target="panel:tasks.cards">
                  <span class="codicon codicon-circle-large"></span>
                  <div><b>Knowledge graph physics</b><div class="task-meta"><span class="pill-yellow">Med</span><span class="chip">#graph</span></div></div>
                </div>
              </div>
              <div class="task-col">
                <b>IN PROGRESS (2)</b>
                <div class="task-card active targetable" data-gradient-target="panel:tasks.cards">
                  <span class="codicon codicon-sync"></span>
                  <div><b>Layered CSS inheritance</b><div class="task-meta"><span class="pill-red">High</span><span class="chip">#core</span></div></div>
                </div>
                <div class="task-card targetable" data-gradient-target="panel:tasks.cards">
                  <span class="codicon codicon-sync"></span>
                  <div><b>PDF text box sync</b><div class="task-meta"><span class="pill-yellow">Med</span><span class="chip">#pdf</span></div></div>
                </div>
              </div>
              <div class="task-col">
                <b>DONE (2)</b>
                <div class="task-card done targetable" data-gradient-target="panel:tasks.cards">
                  <span class="codicon codicon-pass-filled"></span>
                  <div><b>Color contrast calculator</b><div class="task-meta"><span class="chip">#done</span></div></div>
                </div>
                <div class="task-card done targetable" data-gradient-target="panel:tasks.cards">
                  <span class="codicon codicon-pass-filled"></span>
                  <div><b>Atomic installer transaction</b><div class="task-meta"><span class="chip">#done</span></div></div>
                </div>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:tasks.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>AI Task Assistant</b></div>
            <div class="assistant-history">
              <div class="task-card targetable" data-gradient-target="panel:tasks.cards">
                <small class="card-eyebrow">WORKLOAD INSIGHT</small>
                <b>2 high-priority tasks due within 24h.</b>
                <p>Frontend review batching recommended.</p>
              </div>
              <div class="task-card targetable" data-gradient-target="panel:tasks.cards">
                <small class="card-eyebrow">VELOCITY</small>
                <span>Sprint 4 is currently 75% complete on schedule.</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:tasks.toolbar">
              <input placeholder="Create task in natural language..." readonly>
              <button type="button"><span class="codicon codicon-add"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'email') {
      return `
        <div class="exact-workspace-page exact-email-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:email.navigation">
            <div class="helper-header"><button type="button" class="compose-btn"><span class="codicon codicon-edit"></span>New Message</button></div>
            <div class="helper-list">
              <div class="nav-item active"><span class="codicon codicon-inbox"></span><b>Inbox (3)</b><small>Primary</small></div>
              <div class="nav-item"><span class="codicon codicon-star"></span><b>Starred (4)</b></div>
              <div class="nav-item"><span class="codicon codicon-send"></span><b>Sent</b></div>
              <div class="nav-item"><span class="codicon codicon-drafts"></span><b>Drafts (1)</b></div>
              <div class="nav-item"><span class="codicon codicon-archive"></span><b>Archive</b></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:email.workspace">
            <div class="email-view-columns">
              <div class="email-list-column targetable" data-gradient-target="panel:email.cards">
                <div class="email-item active">
                  <div class="item-head"><b>Sarah Jenkins</b><small>11:42 AM</small></div>
                  <b>Updated Architecture Specs</b>
                  <p>I reviewed the new gradient inheritance model and the studio preview looks great...</p>
                </div>
                <div class="email-item">
                  <div class="item-head"><b>DevOps Automation</b><small>09:15 AM</small></div>
                  <b>Build Success: Studio Bundle</b>
                  <p>All test suites passed with atomic registry verification...</p>
                </div>
                <div class="email-item">
                  <div class="item-head"><b>Alex Chen</b><small>Yesterday</small></div>
                  <b>PDF OCR extraction benchmarks</b>
                  <p>The new local OCR worker achieved 98.4% accuracy...</p>
                </div>
              </div>
              <div class="email-reading-column">
                <div class="email-toolbar targetable" data-gradient-target="panel:email.toolbar">
                  <button type="button"><span class="codicon codicon-reply"></span>Reply</button>
                  <button type="button"><span class="codicon codicon-reply-all"></span>Reply All</button>
                  <button type="button"><span class="codicon codicon-forward"></span>Forward</button>
                  <button type="button"><span class="codicon codicon-archive"></span>Archive</button>
                  <button type="button"><span class="codicon codicon-trash"></span>Delete</button>
                </div>
                <div class="email-header-details">
                  <h3>Updated Architecture &amp; Gradient Specifications</h3>
                  <div class="sender-info"><b>Sarah Jenkins</b> &lt;sjenkins@workspace.local&gt; <span>To: Michael Falabella</span></div>
                </div>
                <div class="email-body-content">
                  <p>Hi Michael,</p>
                  <p>I reviewed the latest Gradient Studio preview. The live page synchronization across all panels is incredible. The stop editor and the real-time contrast checker make theme building seamless.</p>
                  <p>Could you double check the PDF document canvas and calendar timeline layouts as well?</p>
                  <p>Best regards,<br>Sarah</p>
                  <div class="attachment-chip targetable" data-gradient-target="panel:email.cards">
                    <span class="codicon codicon-file-pdf"></span>
                    <div><b>gradient-specs-v2.pdf</b><small>(1.4 MB)</small></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:email.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>AI Email Assistant</b></div>
            <div class="assistant-history">
              <div class="email-item targetable" data-gradient-target="panel:email.cards">
                <small class="card-eyebrow">EXECUTIVE SUMMARY</small>
                <b>Sarah approved the gradient model and requested verification.</b>
              </div>
              <div class="email-item targetable" data-gradient-target="panel:email.cards">
                <small class="card-eyebrow">SUGGESTED ACTION</small>
                <span>Confirm PDF and Calendar page checks.</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:email.toolbar">
              <input placeholder="Write quick reply..." readonly>
              <button type="button"><span class="codicon codicon-send"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'calendar') {
      return `
        <div class="exact-workspace-page exact-calendar-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:calendar.navigation">
            <div class="helper-header"><span class="codicon codicon-calendar"></span><b>Calendars</b></div>
            <div class="mini-month-grid">
              <div class="month-title">October 2025</div>
              <div class="calendar-days">
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                <span>12</span><span>13</span><b class="today">14</b><span>15</span><span>16</span><span>17</span><span>18</span>
              </div>
            </div>
            <div class="helper-list">
              <div class="nav-item active"><span class="dot-orange"></span><b>Engineering &amp; Sprint</b></div>
              <div class="nav-item active"><span class="dot-cyan"></span><b>Design &amp; Architecture</b></div>
              <div class="nav-item active"><span class="dot-green"></span><b>Personal Tasks</b></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:calendar.workspace">
            <div class="editor-header">
              <h2>Tuesday, October 14, 2025</h2>
              <div class="editor-tools"><button type="button">Today</button><button type="button">‹</button><button type="button">›</button><span class="view-switch">Day | Week | Month</span></div>
            </div>
            <div class="calendar-toolbar targetable" data-gradient-target="panel:calendar.toolbar">
              <button type="button" class="primary-btn">+ New Event</button><button type="button">Filter</button><span>Timezone: UTC-4</span>
            </div>
            <div class="calendar-timeline">
              <div class="time-row"><span class="time-label">09:00 AM</span><div class="time-slot"></div></div>
              <div class="time-row"><span class="time-label">10:00 AM</span><div class="cal-event event-orange targetable" data-gradient-target="panel:calendar.cards"><b>Sprint 4 Architecture Sync</b><small>Studio Room A • 4 attendees</small></div></div>
              <div class="time-row"><span class="time-label">11:30 AM</span><div class="cal-event event-cyan targetable" data-gradient-target="panel:calendar.cards"><b>SimpleRAG Extension Review</b><small>Remote • Screen Share</small></div></div>
              <div class="time-row"><span class="time-label">02:00 PM</span><div class="cal-event event-green targetable" data-gradient-target="panel:calendar.cards"><b>Knowledge Graph Extraction</b><small>Engineering Lab</small></div></div>
              <div class="time-row"><span class="time-label">04:00 PM</span><div class="cal-event event-orange targetable" data-gradient-target="panel:calendar.cards"><b>Palette Contrast QA</b><small>Design System</small></div></div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:calendar.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>AI Schedule Assistant</b></div>
            <div class="assistant-history">
              <div class="cal-event targetable" data-gradient-target="panel:calendar.cards">
                <small class="card-eyebrow">DAILY BRIEFING</small>
                <b>4 scheduled meetings today. Next in 18 mins.</b>
              </div>
              <div class="cal-event targetable" data-gradient-target="panel:calendar.cards">
                <small class="card-eyebrow">FOCUS WINDOW</small>
                <span>1.5h focus time available from 12:30 to 2:00 PM.</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:calendar.toolbar">
              <input placeholder="Schedule meeting or reminder..." readonly>
              <button type="button"><span class="codicon codicon-add"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'pdf') {
      return `
        <div class="exact-workspace-page exact-pdf-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:pdf.navigation">
            <div class="helper-header"><span class="codicon codicon-file-pdf"></span><b>Document Hub (7)</b><button type="button" class="mini-action-btn">Upload</button></div>
            <div class="helper-list">
              <div class="nav-item active"><b>Michael Anthony Falabella _ Resume.pdf</b><small>1.2 MB • 2 pages • OCR Ready</small></div>
              <div class="nav-item"><b>System Architecture Overview.pdf</b><small>3.8 MB • 14 pages</small></div>
              <div class="nav-item"><b>SimpleGradient Specification.pdf</b><small>840 KB • 6 pages</small></div>
              <div class="nav-item"><b>Local RAG Security Whitepaper.pdf</b><small>2.1 MB • 18 pages</small></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:pdf.workspace">
            <div class="pdf-toolbar targetable" data-gradient-target="panel:pdf.toolbar">
              <span>Page 1 of 2</span><button type="button">‹</button><button type="button">›</button><span>100%</span>
              <span class="tb-sep"></span>
              <button type="button"><span class="codicon codicon-search"></span>Search</button>
              <button type="button" class="active">OCR On</button>
              <button type="button"><span class="codicon codicon-edit"></span>Highlight</button>
            </div>
            <div class="pdf-canvas">
              <div class="pdf-page-mock targetable" data-gradient-target="panel:pdf.cards">
                <div class="pdf-doc-header">
                  <h2>MICHAEL ANTHONY FALABELLA</h2>
                  <p>Senior Full-Stack Engineer &amp; AI Systems Specialist</p>
                </div>
                <div class="pdf-doc-section">
                  <h4>SUMMARY</h4>
                  <p>Experienced software engineer specializing in developer tooling, high-performance web applications, and local LLM/RAG integration systems.</p>
                </div>
                <div class="pdf-doc-section">
                  <h4>EXPERIENCE &amp; PROJECTS</h4>
                  <b>SimpleGradient Studio — Visual Theme &amp; Gradient Engine</b>
                  <p>Architected deterministic multi-stop color grading engine with atomic local registry installation and real-time contrast validation.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:pdf.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>Document AI Assistant</b></div>
            <div class="assistant-history">
              <div class="pdf-page-mock targetable" data-gradient-target="panel:pdf.cards">
                <small class="card-eyebrow">KEY FACTS EXTRACTED</small>
                <b>8+ years experience, TypeScript, Node.js, Systems Architecture.</b>
              </div>
              <div class="pdf-page-mock targetable" data-gradient-target="panel:pdf.cards">
                <small class="card-eyebrow">CITATION</small>
                <span>Page 1, Section 2: Visual Theme &amp; Gradient Engine.</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:pdf.toolbar">
              <input placeholder="Ask anything about this PDF..." readonly>
              <button type="button"><span class="codicon codicon-send"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'graph') {
      return `
        <div class="exact-workspace-page exact-graph-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:graph.navigation">
            <div class="helper-header"><span class="codicon codicon-type-hierarchy"></span><b>Entity Filters</b></div>
            <div class="helper-list">
              <div class="nav-item active"><span class="dot-orange"></span><b>Concepts (18)</b></div>
              <div class="nav-item active"><span class="dot-cyan"></span><b>Documents (7)</b></div>
              <div class="nav-item active"><span class="dot-green"></span><b>Code Artifacts (12)</b></div>
              <div class="nav-item active"><span class="dot-purple"></span><b>People &amp; Authors (4)</b></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:graph.workspace">
            <div class="kg-toolbar targetable" data-gradient-target="panel:graph.toolbar">
              <button type="button" class="active">Physics: Active</button>
              <button type="button">Layout: Force-Directed</button>
              <button type="button">Zoom Fit</button>
              <span class="tb-sep"></span>
              <span>Cluster: Topic</span>
              <span>Depth: 3</span>
            </div>
            <div class="graph-canvas">
              <div class="graph-network-visual targetable" data-gradient-target="panel:graph.cards">
                <div class="graph-node center-node"><span class="codicon codicon-symbol-color"></span><b>SimpleGradient Studio</b></div>
                <div class="graph-node node-1"><span class="codicon codicon-gear"></span><span>Theme Engine</span></div>
                <div class="graph-node node-2"><span class="codicon codicon-plug"></span><span>SimpleRAG Ext</span></div>
                <div class="graph-node node-3"><span class="codicon codicon-shield"></span><span>Registry Safety</span></div>
                <div class="graph-node node-4"><span class="codicon codicon-eye"></span><span>Contrast QA</span></div>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:graph.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>Entity Inspector</b></div>
            <div class="assistant-history">
              <div class="doc-card targetable" data-gradient-target="panel:graph.cards">
                <small class="card-eyebrow">SELECTED ENTITY</small>
                <b>SimpleGradient Studio</b>
                <p>Connected to 4 core nodes across 2 indexed documents.</p>
              </div>
              <div class="doc-card targetable" data-gradient-target="panel:graph.cards">
                <small class="card-eyebrow">RELATIONS</small>
                <span>targets → SimpleRAG, validates → Contrast AA</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:graph.toolbar">
              <input placeholder="Explore connections..." readonly>
              <button type="button"><span class="codicon codicon-search"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'plugins') {
      return `
        <div class="exact-workspace-page exact-plugins-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:plugins.navigation">
            <div class="helper-header"><span class="codicon codicon-extensions"></span><b>Extension Manager</b></div>
            <div class="helper-list">
              <div class="nav-item active"><b>Installed (5)</b><small>Active in workspace</small></div>
              <div class="nav-item"><b>Marketplace (18)</b><small>Available extensions</small></div>
              <div class="nav-item"><b>Themes &amp; Appearance (3)</b><small>Styling</small></div>
              <div class="nav-item"><b>AI Models &amp; Engines (4)</b><small>Inference</small></div>
              <div class="nav-item"><b>System Tools (6)</b><small>Utilities</small></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:plugins.workspace">
            <div class="plugins-toolbar targetable" data-gradient-target="panel:plugins.toolbar">
              <input placeholder="Search extensions..." readonly>
              <button type="button">Check Updates</button>
              <button type="button">Install VSIX</button>
              <span>Sort: Recommended</span>
            </div>
            <div class="plugin-grid">
              <div class="plugin-card active targetable" data-gradient-target="panel:plugins.cards">
                <div class="plugin-top"><span class="codicon codicon-symbol-color plugin-icon"></span><div><b>SimpleGradient Studio</b><small>v0.3.0 • by falabella</small></div><span class="badge-active">Enabled</span></div>
                <p>Design reusable app, page, and panel gradients, then apply them natively.</p>
              </div>
              <div class="plugin-card targetable" data-gradient-target="panel:plugins.cards">
                <div class="plugin-top"><span class="codicon codicon-server-process plugin-icon"></span><div><b>Local Host Engine</b><small>v1.2.4 • by simple-team</small></div><span class="badge-active">Enabled</span></div>
                <p>Accelerated local model inference engine with GPU offloading.</p>
              </div>
              <div class="plugin-card targetable" data-gradient-target="panel:plugins.cards">
                <div class="plugin-top"><span class="codicon codicon-eye plugin-icon"></span><div><b>RAG OCR Console</b><small>v0.9.1 • by vision-core</small></div><span class="badge-active">Enabled</span></div>
                <p>High-speed document parsing, image extraction, and OCR mapping.</p>
              </div>
              <div class="plugin-card targetable" data-gradient-target="panel:plugins.cards">
                <div class="plugin-top"><span class="codicon codicon-database plugin-icon"></span><div><b>Vector Memory Store</b><small>v2.0.0 • by rag-sys</small></div><span class="badge-active">Enabled</span></div>
                <p>Persistent vector index for fast semantic workspace retrieval.</p>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:plugins.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>Extension Inspector</b></div>
            <div class="assistant-history">
              <div class="plugin-card targetable" data-gradient-target="panel:plugins.cards">
                <small class="card-eyebrow">PACKAGE HEALTH</small>
                <b>All 4 active extensions verified.</b>
              </div>
              <div class="plugin-card targetable" data-gradient-target="panel:plugins.cards">
                <small class="card-eyebrow">MANIFEST</small>
                <span>Schema v1 • 0 collisions detected.</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:plugins.toolbar">
              <input placeholder="Plugin command or CLI argument..." readonly>
              <button type="button"><span class="codicon codicon-play"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    if (pageId === 'settings') {
      return `
        <div class="exact-workspace-page exact-settings-page">
          <div class="edge-helper edge-left targetable" data-gradient-target="panel:settings.navigation">
            <div class="helper-header"><span class="codicon codicon-settings-gear"></span><b>Preferences</b></div>
            <div class="helper-list">
              <div class="nav-item"><b>General &amp; Interface</b></div>
              <div class="nav-item active"><b>Appearance &amp; Themes</b></div>
              <div class="nav-item"><b>AI Endpoints &amp; Models</b></div>
              <div class="nav-item"><b>Document Indexing</b></div>
              <div class="nav-item"><b>Storage &amp; Data</b></div>
              <div class="nav-item"><b>Security &amp; Privacy</b></div>
            </div>
          </div>
          <div class="workspace targetable" data-gradient-target="panel:settings.workspace">
            <div class="settings-toolbar targetable" data-gradient-target="panel:settings.toolbar">
              <button type="button" class="primary-btn">Save Preferences</button><button type="button">Reset to Default</button><button type="button">Export Config</button>
            </div>
            <div class="settings-tiles">
              <div class="settings-tile targetable" data-gradient-target="panel:settings.cards">
                <div class="setting-head"><b>Gradient Studio Integration</b><span class="toggle-switch active"></span></div>
                <p>Apply custom gradients to navigation, workspace canvas, cards, and assistant panels.</p>
              </div>
              <div class="settings-tile targetable" data-gradient-target="panel:settings.cards">
                <div class="setting-head"><b>Glassmorphism &amp; Backdrop Blur</b><span>28px (Saturate 140%)</span></div>
                <div class="slider-bar"><div class="slider-fill" style="width: 75%"></div></div>
              </div>
              <div class="settings-tile targetable" data-gradient-target="panel:settings.cards">
                <div class="setting-head"><b>Active Theme Palette</b></div>
                <div class="theme-swatch-row">
                  <div class="swatch-card selected">Warm Glass</div>
                  <div class="swatch-card">Ember Focus</div>
                  <div class="swatch-card">Ocean</div>
                  <div class="swatch-card">OLED Deep</div>
                </div>
              </div>
              <div class="settings-tile targetable" data-gradient-target="panel:settings.cards">
                <div class="setting-head"><b>Layout Surface Mode</b><span class="chip">Comfy Shell</span></div>
                <p>Choose between standard Comfy floating shells or Advanced 3-column Outlook layout.</p>
              </div>
            </div>
          </div>
          <div class="assistant assistant-embedded targetable" data-gradient-target="panel:settings.assistant">
            <div class="assistant-header"><span class="codicon codicon-sparkle"></span><b>System Status</b></div>
            <div class="assistant-history">
              <div class="settings-tile targetable" data-gradient-target="panel:settings.cards">
                <small class="card-eyebrow">REGISTRY STATUS</small>
                <b>OK • 1 custom extension loaded.</b>
              </div>
              <div class="settings-tile targetable" data-gradient-target="panel:settings.cards">
                <small class="card-eyebrow">STORAGE FOOTPRINT</small>
                <span>38 MB runtime • 12 MB cached palettes</span>
              </div>
            </div>
            <div class="assistant-composer targetable" data-gradient-target="panel:settings.toolbar">
              <input placeholder="Search preferences..." readonly>
              <button type="button"><span class="codicon codicon-search"></span></button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="exact-comfy-home">
        <div class="home-welcome">
          <span class="eyebrow">${titleCase(pageId).toUpperCase()}</span>
          <h1>${titleCase(pageId)} Surface</h1>
          <p>Custom gradient workspace preview.</p>
        </div>
      </div>
    `;
  }

  function getAdvancedPageHtml(pageId) {
    const pagesList = [
      { id: 'home', icon: 'home', title: 'Home' },
      { id: 'journal', icon: 'book', title: 'Journal' },
      { id: 'tasks', icon: 'checklist', title: 'Tasks' },
      { id: 'email', icon: 'mail', title: 'Email' },
      { id: 'calendar', icon: 'calendar', title: 'Calendar' },
      { id: 'pdf', icon: 'file-pdf', title: 'PDF' },
      { id: 'graph', icon: 'type-hierarchy', title: 'Knowledge Graph' },
      { id: 'plugins', icon: 'extensions', title: 'Plug-ins' },
      { id: 'settings', icon: 'settings-gear', title: 'Settings' }
    ];

    const appIcons = pagesList.map(p => `
      <div class="app-icon${p.id === pageId ? ' active' : ''}" data-page-preview="${p.id}" title="${p.title}">
        <span class="codicon codicon-${p.icon}"></span>
      </div>
    `).join('');

    let ribbonActions = '';
    let listItems = '';
    let contentPane = '';
    let aiSummary = '';

    if (pageId === 'email') {
      ribbonActions = `
        <button class="ribbon-btn primary" type="button"><span class="codicon codicon-edit"></span>New Email</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-reply"></span>Reply</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-forward"></span>Forward</button>
        <span class="ribbon-sep"></span>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-archive"></span>Archive</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-trash"></span>Delete</button>
      `;
      listItems = `
        <div class="item active"><b>Sarah Jenkins</b><small>11:42 AM</small><p>Updated Architecture &amp; Gradient Specs</p></div>
        <div class="item"><b>DevOps Automation</b><small>09:15 AM</small><p>Build Success: Studio Bundle v0.3.0</p></div>
        <div class="item"><b>Alex Chen</b><small>Yesterday</small><p>PDF OCR extraction benchmarks</p></div>
      `;
      contentPane = `
        <div class="pane-header">
          <h2>Updated Architecture &amp; Gradient Specifications</h2>
          <div class="pane-meta"><span>From: <b>Sarah Jenkins</b></span><span>To: Michael Falabella</span><span>Date: 11:42 AM</span></div>
        </div>
        <div class="pane-body">
          <p>Hi Michael,</p>
          <p>I reviewed the latest Gradient Studio preview. The live page synchronization across all panels is incredible. The stop editor and the real-time contrast checker make theme building seamless.</p>
          <p>Best regards,<br>Sarah</p>
          <div class="attachment-chip targetable" data-gradient-target="panel:email.cards"><span class="codicon codicon-file-pdf"></span><b>gradient-specs-v2.pdf</b> (1.4 MB)</div>
        </div>
      `;
      aiSummary = `<b>Email Summary</b><p>Sarah approved the gradient model and requested verification across all pages.</p>`;
    } else if (pageId === 'tasks') {
      ribbonActions = `
        <button class="ribbon-btn primary" type="button"><span class="codicon codicon-add"></span>New Task</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-filter"></span>Filter Priority</button>
        <span class="ribbon-sep"></span>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-check"></span>Mark Complete</button>
      `;
      listItems = `
        <div class="item active"><b>Multi-page studio preview</b><small>Due Today • High</small><p>#frontend • Studio</p></div>
        <div class="item"><b>Knowledge graph physics</b><small>Sprint 4 • Med</small><p>#graph • Engine</p></div>
        <div class="item"><b>Layered CSS inheritance</b><small>Sprint 4 • High</small><p>#core • Falabella</p></div>
      `;
      contentPane = `
        <div class="pane-header">
          <h2>Multi-page studio preview (Sprint 4)</h2>
          <div class="pane-meta"><span>Status: <b>In Progress</b></span><span>Priority: <b>High</b></span><span>Assignee: Me</span></div>
        </div>
        <div class="pane-body">
          <p>Ensure that the studio preview renders exact layouts for every page (Home, Journal, Tasks, Email, Calendar, PDF, Knowledge Graph, Plug-ins, Settings) in both Comfy and Advanced modes.</p>
          <div class="doc-mock-line full"></div>
          <div class="doc-mock-line half"></div>
        </div>
      `;
      aiSummary = `<b>Task Insights</b><p>Sprint 4 is 75% complete. 2 high priority items pending review.</p>`;
    } else if (pageId === 'journal') {
      ribbonActions = `
        <button class="ribbon-btn primary" type="button"><span class="codicon codicon-add"></span>New Note</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-bold"></span>Bold</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-italic"></span>Italic</button>
        <span class="ribbon-sep"></span>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-tag"></span>Tag</button>
      `;
      listItems = `
        <div class="item active"><b>Sprint Review &amp; Planning</b><small>Today 10:30 AM</small><p>#engineering, #rag</p></div>
        <div class="item"><b>Architecture Vision 2025</b><small>Yesterday</small><p>System design</p></div>
        <div class="item"><b>Meeting with Core Team</b><small>Oct 12</small><p>Product, RAG</p></div>
      `;
      contentPane = `
        <div class="pane-header">
          <h2>Sprint Review &amp; Planning</h2>
          <div class="pane-meta"><span>Date: <b>Oct 14, 2025</b></span><span>Tags: #engineering #rag #sprint-4</span></div>
        </div>
        <div class="pane-body">
          <p>Reviewing gradient inheritance, theme persistence, and atomic installation across native SimpleRAG shells.</p>
          <pre class="code-preview"><code>const runtime = SimpleGradient.resolveContext();</code></pre>
        </div>
      `;
      aiSummary = `<b>Note Assistant</b><p>3 action items identified in sprint planning notes.</p>`;
    } else if (pageId === 'pdf') {
      ribbonActions = `
        <button class="ribbon-btn primary" type="button"><span class="codicon codicon-file-pdf"></span>Open Document</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-search"></span>OCR Search</button>
        <span class="ribbon-sep"></span>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-edit"></span>Annotate</button>
      `;
      listItems = `
        <div class="item active"><b>Michael Anthony Falabella _ Resume.pdf</b><small>1.2 MB • 2 pages</small><p>OCR Indexed</p></div>
        <div class="item"><b>System Architecture Overview.pdf</b><small>3.8 MB • 14 pages</small><p>Technical Spec</p></div>
      `;
      contentPane = `
        <div class="pane-header">
          <h2>Michael Anthony Falabella _ Resume.pdf</h2>
          <div class="pane-meta"><span>Page: <b>1 of 2</b></span><span>Zoom: <b>100%</b></span><span>Status: OCR Ready</span></div>
        </div>
        <div class="pane-body">
          <div class="pdf-page-mock targetable" data-gradient-target="panel:pdf.cards">
            <h3>MICHAEL ANTHONY FALABELLA</h3>
            <p>Senior Full-Stack Engineer &amp; AI Systems Specialist</p>
            <h4>SUMMARY</h4>
            <p>Experienced software engineer specializing in developer tooling and RAG integration systems.</p>
          </div>
        </div>
      `;
      aiSummary = `<b>Document Q&amp;A</b><p>8+ years experience, TypeScript, Node.js, Systems Architecture.</p>`;
    } else {
      ribbonActions = `
        <button class="ribbon-btn primary" type="button"><span class="codicon codicon-play"></span>Action</button>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-refresh"></span>Refresh</button>
        <span class="ribbon-sep"></span>
        <button class="ribbon-btn" type="button"><span class="codicon codicon-settings-gear"></span>Options</button>
      `;
      listItems = `
        <div class="item active"><b>${titleCase(pageId)} Primary Item</b><small>Active</small><p>Configuration details</p></div>
        <div class="item"><b>${titleCase(pageId)} Secondary Item</b><small>Cached</small><p>Standard profile</p></div>
      `;
      contentPane = `
        <div class="pane-header">
          <h2>${titleCase(pageId)} Workspace</h2>
          <div class="pane-meta"><span>Active Target: <b>${pageId}</b></span><span>Mode: Advanced Outlook</span></div>
        </div>
        <div class="pane-body">
          <p>Viewing active surfaces and components for ${titleCase(pageId)}.</p>
          <div class="doc-mock-line full"></div>
          <div class="doc-mock-line half"></div>
        </div>
      `;
      aiSummary = `<b>AI Sidebar</b><p>Ready to assist on ${titleCase(pageId)} workspace.</p>`;
    }

    return `
      <div class="outlook-app">
        <div id="app-bar" class="targetable" data-gradient-target="panel:${pageId}.navigation">
          ${appIcons}
        </div>
        <div class="outlook-body">
          <div class="ribbon targetable" data-gradient-target="panel:${pageId}.toolbar">
            <div class="ribbon-tabs">
              <button class="active" type="button">Home</button>
              <button type="button">View</button>
              <button type="button">Tools</button>
            </div>
            <div class="ribbon-actions">
              ${ribbonActions}
            </div>
          </div>
          <div class="outlook-content">
            <div id="list-pane" class="targetable" data-gradient-target="panel:${pageId}.cards">
              <div class="search-box"><span class="codicon codicon-search"></span><input placeholder="Search list..." readonly></div>
              ${listItems}
            </div>
            <div class="content-pane targetable" data-gradient-target="panel:${pageId}.workspace">
              ${contentPane}
            </div>
            <div id="ai-sidebar" class="targetable" data-gradient-target="panel:${pageId}.assistant">
              <div class="ai-header"><span class="codicon codicon-sparkle"></span><b>AI Assistant</b></div>
              <div class="ai-chat">
                <div class="bubble ai">${aiSummary}</div>
              </div>
              <div class="ai-input targetable" data-gradient-target="panel:${pageId}.toolbar">
                <input placeholder="Ask AI Assistant..." readonly>
                <button type="button"><span class="codicon codicon-send"></span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function getStudioWorkbenchPageHtml(pageId) {
    const pageObj = catalogs.studio.pages.find(p => p.id === pageId) || { id: pageId, label: titleCase(pageId) };
    return `
      <div class="sample-workbench-view">
        <aside class="sample-navigation targetable" data-gradient-target="panel:${pageId}.navigation">
          <div class="nav-brand"><span class="codicon codicon-${pageObj.icon || 'layout'}"></span><strong>${pageObj.label}</strong></div>
          <div class="nav-tree">
            <div class="tree-item active"><span class="codicon codicon-chevron-down"></span><span class="codicon codicon-folder"></span>src</div>
            <div class="tree-item child active"><span class="codicon codicon-file-code"></span>${pageId}.ts</div>
            <div class="tree-item child"><span class="codicon codicon-file-code"></span>model.ts</div>
            <div class="tree-item child"><span class="codicon codicon-file-code"></span>runtime.ts</div>
          </div>
        </aside>
        <section class="sample-editor targetable" data-gradient-target="panel:${pageId}.editor">
          <div class="sample-kicker">DESIGN WORKBENCH / ${pageObj.label.toUpperCase()}</div>
          <h1>${pageObj.label} Surface Review</h1>
          <p>Live workspace preview with custom gradient styling and deterministic contrast validation.</p>
          <div class="component-grid targetable" data-gradient-target="panel:${pageId}.components">
            <div class="component-card"><b>Tokens Card</b><small>Theme definition</small></div>
            <div class="component-card"><b>Surface Layer</b><small>CSS variables</small></div>
          </div>
        </section>
        <aside class="sample-inspector targetable" data-gradient-target="panel:${pageId}.inspector">
          <div class="inspector-header"><span class="codicon codicon-sparkle"></span><b>Inspector</b></div>
          <div class="inspector-field"><small>PAGE</small><b>${pageObj.label}</b></div>
          <div class="inspector-field"><small>STATUS</small><span>Target active</span></div>
        </aside>
      </div>
    `;
  }

  function renderPreview() {
    const app = byId('sampleApp');
    const catalogKey = profile.editor.targetCatalog;
    const activePageId = profile.editor.activePage;
    const body = app.querySelector('.sample-body');

    // Build dynamic high-fidelity page markup
    let htmlContent = '';
    if (catalogKey === 'simplerag') {
      htmlContent = advancedMode ? getAdvancedPageHtml(activePageId) : getComfyPageHtml(activePageId);
    } else {
      htmlContent = getStudioWorkbenchPageHtml(activePageId);
    }

    // Include compatibility hidden contract anchor
    htmlContent += '<div hidden data-gradient-target="panel:workbench.inspector">DESIGN SYSTEM WORKBENCH</div>';

    if (body) {
      body.innerHTML = htmlContent;
      body.dataset.gradientTarget = `page:${activePageId}`;
    }

    const topBar = app.querySelector('.sample-topbar');
    if (topBar) {
      topBar.classList.add('targetable');
      topBar.dataset.gradientTarget = `panel:${activePageId}.toolbar`;
    }

    app.classList.toggle('target-mode', profile.editor.targetMode);
    app.classList.toggle('compare-mode', compareMode);
    app.classList.toggle('advanced-mode', advancedMode);
    app.classList.toggle('no-shadows', shadowsOff);
    app.classList.toggle('unified-blend', blendMode);

    app.dataset.baseTheme = baseTheme;
    app.dataset.manualOverride = String(manualOverride);

    const themeObj = IN_APP_THEMES[baseTheme] || IN_APP_THEMES.oled;
    app.style.setProperty('--in-app-bg', themeObj.background);
    app.style.setProperty('--in-app-card', themeObj.card);
    app.style.setProperty('--in-app-text', themeObj.text);
    app.style.setProperty('--in-app-muted', themeObj.muted);
    app.style.setProperty('--in-app-accent', themeObj.accent);
    app.style.setProperty('--in-app-border', themeObj.border);
    app.style.setProperty('--in-app-ribbon', themeObj.ribbon);
    app.style.setProperty('--in-app-assistant', themeObj.assistant);

    const blendFactor = blendMode ? (blendStrength / 100) : 0;
    app.style.setProperty('--sg-blend-factor', String(blendFactor));
    app.style.setProperty('--sg-glass-blur', `${Math.round(8 + 24 * blendFactor)}px`);
    app.style.setProperty('--sg-glass-saturation', `${Math.round(105 + 45 * blendFactor)}%`);
    app.style.setProperty('--sg-panel-alpha', String(Math.max(0.08, (0.42 - 0.32 * blendFactor).toFixed(3))));
    app.style.setProperty('--sg-card-alpha', String(Math.max(0.12, (0.52 - 0.35 * blendFactor).toFixed(3))));
    app.style.setProperty('--sg-border-glow', String(Math.max(0.06, (0.10 + 0.16 * blendFactor).toFixed(3))));

    if (byId('baseThemeSelect')) byId('baseThemeSelect').value = baseTheme;
    if (byId('manualOverrideButton')) {
      byId('manualOverrideButton').classList.toggle('active', manualOverride);
      byId('manualOverrideButton').setAttribute('aria-pressed', String(manualOverride));
      byId('manualOverrideButton').innerHTML = manualOverride
        ? '<span class="codicon codicon-shield"></span>Override: ON'
        : '<span class="codicon codicon-shield"></span>Override: OFF';
    }

    const pageGradient = resolveGradient(`page:${profile.editor.activePage}`) || resolveGradient('app');
    const masterGradientCss = (pageGradient && !compareMode) ? gradientCss(pageGradient) : 'none';
    app.style.setProperty('--sg-app-gradient', masterGradientCss);

    if (body) {
      body.style.backgroundImage = blendMode ? 'none' : (masterGradientCss !== 'none' ? masterGradientCss : '');
    }

    all('[data-gradient-target]', app).forEach((element) => {
      const target = element.dataset.gradientTarget;
      const gradient = resolveGradient(target);
      const selected = target === profile.editor.activeTarget;
      const assignment = assignmentFor(target);
      element.classList.toggle('selected-target', selected);

      const isExplicitPanelOverride = assignment.mode === 'gradient' && Boolean(assignment.gradientId);
      const isDetachedSidePanel = element.classList.contains('edge-helper') ||
        element.classList.contains('assistant') ||
        element.classList.contains('ribbon') ||
        element.id === 'app-bar' ||
        element.classList.contains('sample-navigation') ||
        element.classList.contains('sample-inspector');

      if (element !== body && isExplicitPanelOverride) {
        element.style.backgroundImage = gradientCss(gradient, true);
      } else if (element !== body && isDetachedSidePanel && !blendMode) {
        element.style.backgroundImage = gradient ? gradientCss(gradient) : '';
      } else if (element !== body) {
        element.style.backgroundImage = '';
      }
    });
    const label = app.querySelector('.target-label');
    if (label) label.textContent = `TARGET: ${assignmentLabel().toUpperCase()}`;

    if (byId('zoomOutput')) byId('zoomOutput').textContent = `${profile.editor.zoom || 100}%`;
    if (app) {
      app.style.transform = (profile.editor.zoom && profile.editor.zoom !== 100) ? `scale(${profile.editor.zoom / 100})` : '';
      app.style.transformOrigin = 'top center';
    }

    all('[data-page-preview]').forEach((button) => button.classList.toggle('active', button.dataset.pagePreview === profile.editor.activePage));
  }

  function renderLibrary() {
    const list = byId('presetList');
    list.replaceChildren();
    const selectedId = activeGradientId();
    Object.values(profile.gradients).forEach((gradient) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `preset-card${gradient.id === selectedId ? ' selected' : ''}`;
      button.dataset.gradientId = gradient.id;
      button.style.setProperty('--preset-gradient', gradientCss(gradient));
      button.setAttribute('aria-pressed', String(gradient.id === selectedId));
      button.setAttribute('aria-label', `Use ${gradient.name}, linear ${gradient.angle} degrees`);
      const name = document.createElement('b');
      name.textContent = gradient.name;
      const meta = document.createElement('small');
      meta.textContent = `Linear ${gradient.angle}°`;
      button.append(name, meta);
      button.addEventListener('click', () => commit((draft) => {
        draft.assignments[draft.editor.activeTarget] = { mode: 'gradient', gradientId: gradient.id };
      }, `${gradient.name} applied to ${targetLabel()}.`));
      list.append(button);
    });
  }

  function renderStops() {
    const gradient = activeGradient();
    if (!gradient) return;
    selectedStopIndex = Math.min(selectedStopIndex, gradient.stops.length - 1);
    const selectedStop = gradient.stops[selectedStopIndex];
    const rail = byId('stopRail');
    const labels = byId('stopLabels');
    rail.replaceChildren();
    labels.replaceChildren();
    rail.style.setProperty('--active-gradient', gradientCss(gradient));
    gradient.stops.forEach((stop, index) => {
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = `stop-handle${index === selectedStopIndex ? ' selected' : ''}`;
      handle.style.left = `${stop.position}%`;
      handle.style.setProperty('--stop-color', stop.color);
      handle.setAttribute('aria-label', `Edit stop ${index + 1}, ${stop.color} at ${stop.position} percent`);
      handle.addEventListener('click', (event) => {
        event.stopPropagation();
        selectedStopIndex = index;
        try {
          openModal(handle);
        } catch (error) {
          showToast(`Could not open the stop editor: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      rail.append(handle);

      const text = document.createElement('span');
      text.className = `stop-label${index === selectedStopIndex ? ' selected' : ''}${stop.position <= 5 ? ' edge-left' : stop.position >= 95 ? ' edge-right' : ''}`;
      text.style.left = `${stop.position}%`;
      const position = document.createElement('span');
      position.textContent = `${stop.position}%`;
      const color = document.createElement('b');
      color.textContent = stop.color.slice(0, 7);
      text.append(position, color);
      labels.append(text);
    });

    byId('angleInput').value = String(gradient.angle);
    byId('angleKnob').style.setProperty('--angle', `${gradient.angle}deg`);
    byId('positionInput').value = String(selectedStop.position);
    byId('opacityInput').value = String(selectedStop.opacity);
    byId('colorInput').value = rgbaToHexOpacity(selectedStop).toLowerCase();
    byId('hexInput').value = selectedStop.color;
    const ratio = contrastRatio(selectedStop.color);
    const ratioText = `${ratio.toFixed(1)}:1`;
    byId('contrastRatio').textContent = ratioText;
    byId('footerContrast').textContent = ratioText;

    const mode = assignmentFor(profile.editor.activeTarget).mode;
    all('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  }

  function matrixTarget(pageId, surfaceId) {
    if (pageId === 'app') return 'app';
    return `panel:${pageId}.${surfaceId}`;
  }

  function renderAssignments() {
    const popout = byId('assignmentPopout');
    const grid = popout ? popout.querySelector('.assignment-grid') : null;
    if (!grid) return;
    grid.replaceChildren();

    const isAssignmentsView = document.body.dataset.view === 'assignments';
    grid.style.gridTemplateColumns = isAssignmentsView
      ? `minmax(110px, 1.3fr) repeat(${surfaces.length}, minmax(74px, 1fr))`
      : `88px repeat(${surfaces.length}, minmax(40px, 1fr))`;

    const corner = document.createElement('div');
    corner.className = 'grid-head';
    grid.append(corner);
    for (const surface of surfaces) {
      const heading = document.createElement('div');
      heading.className = 'grid-head';
      heading.textContent = surface.label;
      grid.append(heading);
    }
    const rows = [{ id: 'app', label: 'App default', icon: 'globe' }, ...pages];
    rows.forEach((page) => {
      const rowHead = document.createElement('div');
      rowHead.className = 'row-head';
      const icon = document.createElement('span');
      icon.className = `codicon codicon-${page.icon}`;
      const label = document.createElement('span');
      label.textContent = page.label;
      rowHead.append(icon, label);
      grid.append(rowHead);
      surfaces.forEach((surface) => {
        const target = matrixTarget(page.id, surface.id);
        const assignment = assignmentFor(target);
        const gradient = resolveGradient(target);
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = `matrix-swatch ${assignment.mode}${target === profile.editor.activeTarget ? ' selected' : ''}`;
        swatch.style.setProperty('--swatch', gradient ? gradientCss(gradient) : '#292b2b');
        swatch.setAttribute('aria-label', `${page.label}, ${surface.label}: ${assignmentLabel(target)}`);
        swatch.addEventListener('click', () => setTarget(target));
        cell.append(swatch);
        grid.append(cell);
      });
    });
  }

  function renderSummary() {
    const page = pages.find((candidate) => candidate.id === targetPage())?.label || titleCase(targetPage());
    const label = targetLabel();
    const mode = assignmentLabel();
    byId('assignmentBreadcrumb').textContent = `App default / ${page} / ${label}`;
    byId('applyScope').textContent = `${page} / ${label}`;
    byId('applyMode').textContent = mode;
    byId('selectedContextName').textContent = `${page} / ${label}`;
    byId('selectedContextMode').textContent = mode;
    byId('useParentButton').textContent = profile.editor.activeTarget.startsWith('panel:') ? 'Use page gradient' : 'Use app gradient';
    byId('useParentButton').disabled = profile.editor.activeTarget === 'app';
    byId('inheritancePath').replaceChildren();
    byId('inheritancePath').append(document.createTextNode(`App default  ›  ${page} (page)  ›  `));
    const current = document.createElement('b');
    current.textContent = `${label} (${mode.toLowerCase()})`;
    byId('inheritancePath').append(current);

    const summary = byId('scopeSummary');
    summary.querySelectorAll(':scope > div').forEach((row) => row.remove());
    const pageTarget = `page:${targetPage()}`;
    const summaryRows = [
      { target: 'app', label: 'App default', dot: 'inherited', active: profile.editor.activeTarget === 'app' },
      { target: pageTarget, label: `${page} (page)`, dot: 'page', active: profile.editor.activeTarget === pageTarget }
    ];
    if (profile.editor.activeTarget.startsWith('panel:')) {
      summaryRows.push({ target: profile.editor.activeTarget, label, dot: 'panel', active: true });
    }
    for (const row of summaryRows) {
      const item = document.createElement('div');
      item.classList.toggle('active', Boolean(row.active));
      const dot = document.createElement('span');
      dot.className = `legend-dot ${row.dot}`;
      const rowLabel = document.createElement('span');
      rowLabel.textContent = row.label;
      const chip = document.createElement('span');
      const rowMode = assignmentLabel(row.target);
      chip.className = `scope-chip${rowMode === 'Panel override' ? ' panel' : rowMode === 'Page override' ? ' page' : ''}`;
      chip.textContent = rowMode;
      item.append(dot, rowLabel, chip);
      summary.append(item);
    }
  }

  function showToast(message) {
    const toast = byId('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function syncModalVisuals() {
    const pureHueHex = hsvToHex(modalHsv.h, 100, 100);
    const colorVisual = byId('colorPickerVisual');
    if (colorVisual) {
      colorVisual.style.setProperty('--modal-color', pureHueHex);
      const indicator = colorVisual.querySelector('i');
      if (indicator) {
        indicator.style.left = `${modalHsv.s}%`;
        indicator.style.top = `${100 - modalHsv.v}%`;
        indicator.style.right = 'auto';
      }
    }
    const alphaStrip = document.querySelector('.alpha-strip');
    if (alphaStrip) {
      alphaStrip.style.setProperty('--modal-color', modalDraft?.color || '#E86633');
      const indicator = alphaStrip.querySelector('i');
      if (indicator) {
        indicator.style.left = `${modalOpacityVal}%`;
        indicator.style.right = 'auto';
      }
    }
    const hueStrip = document.querySelector('.hue-strip');
    if (hueStrip) {
      const indicator = hueStrip.querySelector('i');
      if (indicator) {
        indicator.style.left = `${(modalHsv.h / 360) * 100}%`;
        indicator.style.right = 'auto';
      }
    }
  }

  function openModal(trigger) {
    const modal = byId('stopModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    const gradient = activeGradient();
    modalDraft = clone(gradient.stops[selectedStopIndex]);
    modalTrigger = trigger || document.activeElement;
    byId('modalTitle').textContent = 'Edit gradient stop';
    byId('modalDescription').textContent = `${gradient.name} / Stop ${selectedStopIndex + 1}`;
    byId('modalHex').value = modalDraft.color;
    byId('modalPosition').value = String(modalDraft.position);
    byId('modalOpacity').value = String(modalDraft.opacity);

    const rgb = hexToRgb(modalDraft.color);
    modalHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    modalOpacityVal = clamp(modalDraft.opacity, 0, 100);
    syncModalVisuals();

    document.body.classList.add('modal-open');
    requestAnimationFrame(() => byId('modalHex').focus());
  }

  function closeModal() {
    byId('stopModal').classList.remove('open');
    byId('stopModal').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modalDraft = null;
    modalTrigger?.focus?.();
  }

  function updateSelectedStop(property, value) {
    commit(() => {
      const gradient = ensureTargetGradient();
      const stop = gradient.stops[selectedStopIndex];
      stop[property] = value;
      if (property === 'position') gradient.stops.sort((left, right) => left.position - right.position);
      selectedStopIndex = gradient.stops.indexOf(stop);
    });
  }

  function currentCss() {
    const gradient = activeGradient();
    return gradient ? gradientCss(gradient) : 'background-image: none;';
  }

  byId('scopeTree').addEventListener('click', (event) => {
    const row = event.target.closest('.scope-row[data-target]');
    if (row) setTarget(row.dataset.target);
  });
  byId('sampleApp').addEventListener('click', (event) => {
    const pageButton = event.target.closest('[data-page-preview]');
    const target = event.target.closest('[data-gradient-target]');

    if (pageButton && !profile.editor.targetMode) {
      profile.editor.activePage = pageButton.dataset.pagePreview;
      profile.editor.activeTarget = `page:${pageButton.dataset.pagePreview}`;
      render();
      scheduleSend();
      return;
    }

    if (target) {
      event.preventDefault();
      event.stopPropagation();
      setTarget(target.dataset.gradientTarget);
      if (pageButton) {
        profile.editor.activePage = pageButton.dataset.pagePreview;
        render();
        scheduleSend();
      }
      return;
    }

    if (pageButton) {
      profile.editor.activePage = pageButton.dataset.pagePreview;
      profile.editor.activeTarget = `page:${pageButton.dataset.pagePreview}`;
      render();
      scheduleSend();
    }
  });
  all('[data-open-view]').forEach((button) => button.addEventListener('click', () => host.postMessage({ type: 'openView', view: button.dataset.openView })));
  all('[data-mode]').forEach((button) => button.addEventListener('click', () => commit((draft) => {
    const mode = button.dataset.mode;
    const id = activeGradientId() || Object.keys(draft.gradients)[0];
    draft.assignments[draft.editor.activeTarget] = mode === 'gradient' ? { mode, gradientId: id } : { mode };
  }, `${assignmentLabel()} selected for ${targetLabel()}.`)));

  byId('undoButton').addEventListener('click', () => {
    const previous = undoStack.pop();
    if (previous) replaceFromHistory(previous, redoStack);
  });
  byId('redoButton').addEventListener('click', () => {
    const next = redoStack.pop();
    if (next) replaceFromHistory(next, undoStack);
  });
  byId('saveButton').addEventListener('click', () => host.postMessage({ type: 'save' }));
  byId('installSimpleRagButton').addEventListener('click', () => {
    host.postMessage({ type: 'installSimpleRag', profile });
    showToast('Installing this profile into SimpleRAG…');
  });
  byId('targetCatalogSelect').addEventListener('change', (event) => {
    const nextCatalog = event.target.value === 'studio' ? 'studio' : 'simplerag';
    const next = catalogs[nextCatalog];
    profile.editor.targetCatalog = nextCatalog;
    profile.editor.activePage = next.pages[0].id;
    profile.editor.activeTarget = `page:${next.pages[0].id}`;
    render();
    scheduleSend();
    showToast(`${next.label} page and panel targets are ready.`);
  });
  byId('helpButton').addEventListener('click', () => {
    assignmentVisible = true;
    render();
    showToast('Tip: click a stop to open the modal. Use Target mode to select preview surfaces, then open Preview or Assignments beside Studio.');
  });
  byId('scopeDrawerButton').addEventListener('click', () => {
    scopeDrawerOpen = !scopeDrawerOpen;
    render();
  });

  const appBar = document.querySelector('.app-bar');
  const updateAppBarOverflow = () => {
    if (!appBar) return;
    const overflowing = appBar.scrollWidth > appBar.clientWidth + 1;
    appBar.classList.toggle('has-overflow', overflowing);
    const atEnd = !overflowing || appBar.scrollLeft + appBar.clientWidth >= appBar.scrollWidth - 1;
    appBar.classList.toggle('at-end', atEnd);
  };

  const closeExportMenu = () => {
    const menu = byId('exportMenu');
    if (menu.hidden) return;
    menu.hidden = true;
    menu.classList.remove('popover-fixed');
    menu.style.left = '';
    menu.style.top = '';
    byId('exportButton').setAttribute('aria-expanded', 'false');
  };

  const openExportMenu = () => {
    const menu = byId('exportMenu');
    const anchor = byId('exportButton');
    menu.hidden = false;
    menu.classList.add('popover-fixed');
    const rect = anchor.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8));
    const fitsBelow = rect.bottom + menu.offsetHeight + 8 <= window.innerHeight;
    menu.style.left = `${left}px`;
    menu.style.top = `${fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - menu.offsetHeight - 6)}px`;
    anchor.setAttribute('aria-expanded', 'true');
  };

  if (appBar) {
    appBar.addEventListener('scroll', () => {
      closeExportMenu();
      updateAppBarOverflow();
    }, { passive: true });
    appBar.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const maxScroll = appBar.scrollWidth - appBar.clientWidth;
      if (maxScroll <= 0) return;
      const next = Math.max(0, Math.min(maxScroll, appBar.scrollLeft + event.deltaY));
      if (next === appBar.scrollLeft) return;
      event.preventDefault();
      appBar.scrollLeft = next;
    }, { passive: false });
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(updateAppBarOverflow).observe(appBar);
    }
    window.addEventListener('resize', () => {
      closeExportMenu();
      updateAppBarOverflow();
    });
    updateAppBarOverflow();
  }

  document.addEventListener('click', (event) => {
    if (byId('exportMenu').hidden) return;
    if (event.target.closest?.('.export-menu')) return;
    closeExportMenu();
  });

  byId('exportButton').addEventListener('click', (event) => {
    event.stopPropagation();
    if (byId('exportMenu').hidden) {
      openExportMenu();
    } else {
      closeExportMenu();
    }
  });
  all('[data-export]').forEach((button) => button.addEventListener('click', () => {
    closeExportMenu();
    host.postMessage({ type: 'export', format: button.dataset.export });
  }));
  all('[data-import]').forEach((button) => button.addEventListener('click', () => {
    closeExportMenu();
    host.postMessage({ type: 'import' });
  }));
  all('[data-copy-css]').forEach((button) => button.addEventListener('click', () => {
    closeExportMenu();
    host.postMessage({ type: 'copy', text: currentCss() });
  }));

  byId('baseThemeSelect')?.addEventListener('change', (event) => {
    baseTheme = event.target.value;
    renderPreview();
    showToast(`Base in-app theme: ${IN_APP_THEMES[baseTheme]?.label || baseTheme}.`);
  });
  byId('manualOverrideButton')?.addEventListener('click', () => {
    manualOverride = !manualOverride;
    renderPreview();
    showToast(`Manual gradient override ${manualOverride ? 'ON (full gradient priority)' : 'OFF (in-app theme blend)'}.`);
  });
  byId('targetModeButton').addEventListener('click', () => {
    profile.editor.targetMode = !profile.editor.targetMode;
    render();
    scheduleSend();
  });
  byId('compareButton').addEventListener('click', () => {
    compareMode = !compareMode;
    renderPreview();
  });
  byId('advancedModeButton')?.addEventListener('click', () => {
    advancedMode = !advancedMode;
    render();
    scheduleSend();
  });
  byId('blendModeButton')?.addEventListener('click', () => {
    blendMode = !blendMode;
    renderPreview();
  });
  byId('shadowsToggleButton')?.addEventListener('click', () => {
    shadowsOff = !shadowsOff;
    renderPreview();
  });
  byId('subtleToggleButton')?.addEventListener('click', () => {
    subtleMode = !subtleMode;
    renderPreview();
  });
  byId('pageSelect').addEventListener('change', (event) => {
    profile.editor.activePage = event.target.value;
    profile.editor.activeTarget = `page:${event.target.value}`;
    render();
    scheduleSend();
  });
  byId('widthSelect').addEventListener('change', (event) => {
    const widths = { 1440: 810, 1024: 730, 768: 650, 390: 500 };
    byId('sampleApp').style.maxWidth = `${widths[event.target.value] || 810}px`;
  });
  all('[data-zoom]').forEach((button) => button.addEventListener('click', () => {
    profile.editor.zoom = clamp(profile.editor.zoom + Number(button.dataset.zoom), 70, 140);
    renderPreview();
    scheduleSend();
  }));

  let harmonicIndex = 0;
  const HARMONIC_PALETTES = [
    [
      { color: '#090514', position: 0, opacity: 95 },
      { color: '#1A0F30', position: 45, opacity: 85 },
      { color: '#441B6D', position: 75, opacity: 60 },
      { color: '#9B51E0', position: 100, opacity: 28 }
    ],
    [
      { color: '#050811', position: 0, opacity: 95 },
      { color: '#0C192E', position: 48, opacity: 85 },
      { color: '#0D3B66', position: 78, opacity: 55 },
      { color: '#00E5FF', position: 100, opacity: 25 }
    ],
    [
      { color: '#14080C', position: 0, opacity: 95 },
      { color: '#29101B', position: 46, opacity: 88 },
      { color: '#521B33', position: 76, opacity: 60 },
      { color: '#EB5757', position: 100, opacity: 26 }
    ],
    [
      { color: '#040D0E', position: 0, opacity: 95 },
      { color: '#092327', position: 46, opacity: 85 },
      { color: '#0E494D', position: 76, opacity: 55 },
      { color: '#27AE60', position: 100, opacity: 25 }
    ],
    [
      { color: '#08090C', position: 0, opacity: 95 },
      { color: '#121622', position: 48, opacity: 88 },
      { color: '#1E293B', position: 75, opacity: 65 },
      { color: '#38BDF8', position: 100, opacity: 24 }
    ],
    [
      { color: '#11100F', position: 0, opacity: 95 },
      { color: '#1C1714', position: 44, opacity: 88 },
      { color: '#331E15', position: 75, opacity: 60 },
      { color: '#E86633', position: 100, opacity: 25 }
    ]
  ];

  byId('flipAngleButton')?.addEventListener('click', () => commit(() => {
    const gradient = ensureTargetGradient();
    gradient.angle = (gradient.angle + 180) % 360;
  }, `Flipped gradient angle to ${activeGradient().angle}°.`));

  byId('reverseStopsButton')?.addEventListener('click', () => commit(() => {
    const gradient = ensureTargetGradient();
    gradient.stops.forEach((stop) => {
      stop.position = 100 - stop.position;
    });
    gradient.stops.sort((a, b) => a.position - b.position);
    selectedStopIndex = Math.min(selectedStopIndex, gradient.stops.length - 1);
  }, 'Reversed gradient color stop order.'));

  byId('randomHarmonicButton')?.addEventListener('click', () => commit(() => {
    const gradient = ensureTargetGradient();
    const palette = HARMONIC_PALETTES[harmonicIndex % HARMONIC_PALETTES.length];
    harmonicIndex += 1;
    gradient.stops = clone(palette);
    selectedStopIndex = 0;
  }, 'Generated a harmonious glass gradient palette.'));

  byId('revertScopeButton').addEventListener('click', () => commit((draft) => {
    if (draft.editor.activeTarget !== 'app') draft.assignments[draft.editor.activeTarget] = { mode: 'inherit' };
  }, `${targetLabel()} now inherits its parent gradient.`));
  byId('revertAssignmentButton').addEventListener('click', () => byId('revertScopeButton').click());
  byId('useParentButton').addEventListener('click', () => byId('revertScopeButton').click());
  byId('revertDefaultButton').addEventListener('click', () => commit((draft) => {
    const defaults = defaultProfile();
    const target = draft.editor.activeTarget;
    draft.assignments[target] = clone(defaults.assignments[target] || (target === 'app' ? defaults.assignments.app : { mode: 'inherit' }));
  }, `${targetLabel()} restored to the Studio default.`));
  byId('newGradientButton').addEventListener('click', () => commit((draft) => {
    const id = `custom-${Date.now()}`;
    const source = clone(activeGradient());
    source.id = id;
    source.name = `Custom Gradient ${Object.keys(draft.gradients).length + 1}`;
    draft.gradients[id] = source;
    draft.assignments[draft.editor.activeTarget] = { mode: 'gradient', gradientId: id };
  }, 'Created a reusable gradient from the current surface.'));
  byId('closeAssignments').addEventListener('click', () => {
    assignmentVisible = false;
    render();
    showToast('Assignments hidden. Use the Scope pop-out control or Help to restore it.');
  });

  byId('addStopButton').addEventListener('click', () => commit(() => {
    const gradient = ensureTargetGradient();
    if (gradient.stops.length >= 8) {
      showToast('A linear gradient can contain up to eight stops.');
      return;
    }
    const selected = gradient.stops[selectedStopIndex];
    const next = gradient.stops[selectedStopIndex + 1];
    const position = next ? Math.round((selected.position + next.position) / 2) : Math.min(100, selected.position + 10);
    gradient.stops.push({ color: selected.color, position, opacity: selected.opacity });
    gradient.stops.sort((left, right) => left.position - right.position);
    selectedStopIndex = gradient.stops.findIndex((stop) => stop.position === position && stop.color === selected.color);
  }, 'Gradient stop added.'));

  byId('angleInput').addEventListener('input', (event) => commit(() => { ensureTargetGradient().angle = Math.round(clamp(event.target.value, 0, 359)); }));
  byId('angleInput').addEventListener('change', (event) => commit(() => { ensureTargetGradient().angle = Math.round(clamp(event.target.value, 0, 359)); }));
  byId('positionInput').addEventListener('input', (event) => updateSelectedStop('position', Math.round(clamp(event.target.value, 0, 100))));
  byId('positionInput').addEventListener('change', (event) => updateSelectedStop('position', Math.round(clamp(event.target.value, 0, 100))));
  byId('opacityInput').addEventListener('input', (event) => updateSelectedStop('opacity', Math.round(clamp(event.target.value, 0, 100))));
  byId('opacityInput').addEventListener('change', (event) => updateSelectedStop('opacity', Math.round(clamp(event.target.value, 0, 100))));
  byId('colorInput').addEventListener('input', (event) => updateSelectedStop('color', safeHex(event.target.value)));
  byId('hexInput').addEventListener('input', (event) => {
    if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(event.target.value)) {
      updateSelectedStop('color', safeHex(event.target.value));
    }
  });
  byId('hexInput').addEventListener('change', (event) => updateSelectedStop('color', safeHex(event.target.value, activeGradient().stops[selectedStopIndex].color)));
  all('[data-copy-color]').forEach((button) => button.addEventListener('click', () => host.postMessage({ type: 'copy', text: activeGradient().stops[selectedStopIndex].color })));
  byId('blendInput').addEventListener('input', (event) => {
    blendStrength = Math.round(clamp(event.target.value, 0, 100));
    event.target.nextElementSibling.textContent = `${blendStrength}%`;
    renderPreview();
  });

  const knob = byId('angleKnob');
  if (knob) {
    let draggingKnob = false;
    const updateAngleFromEvent = (event) => {
      const rect = knob.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radians = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      let degrees = Math.round((radians * 180) / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      degrees = degrees % 360;
      commit(() => {
        ensureTargetGradient().angle = degrees;
      });
    };
    knob.addEventListener('pointerdown', (event) => {
      draggingKnob = true;
      knob.setPointerCapture?.(event.pointerId);
      updateAngleFromEvent(event);
    });
    knob.addEventListener('pointermove', (event) => {
      if (draggingKnob) updateAngleFromEvent(event);
    });
    knob.addEventListener('pointerup', () => { draggingKnob = false; });
    knob.addEventListener('pointercancel', () => { draggingKnob = false; });
  }

  const rail = byId('stopRail');
  if (rail) {
    let draggingRailStop = false;
    let dragStartX = 0;
    let dragMoved = false;
    const updateRailFromPointer = (event) => {
      const rect = rail.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawX = event.clientX - rect.left;
      const position = Math.round(clamp((rawX / rect.width) * 100, 0, 100));
      updateSelectedStop('position', position);
    };
    rail.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('.stop-handle');
      if (handle) {
        const handles = all('.stop-handle', rail);
        const index = handles.indexOf(handle);
        if (index >= 0) {
          selectedStopIndex = index;
          handles.forEach((h, i) => h.classList.toggle('selected', i === index));
          const labels = all('.stop-label', byId('stopLabels'));
          labels.forEach((l, i) => l.classList.toggle('selected', i === index));
          const gradient = activeGradient();
          if (gradient && gradient.stops[index]) {
            const stop = gradient.stops[index];
            byId('positionInput').value = String(stop.position);
            byId('opacityInput').value = String(stop.opacity);
            byId('colorInput').value = rgbaToHexOpacity(stop).toLowerCase();
            byId('hexInput').value = stop.color;
          }
        }
        draggingRailStop = true;
        dragStartX = event.clientX;
        dragMoved = false;
        rail.setPointerCapture?.(event.pointerId);
      }
    });
    rail.addEventListener('pointermove', (event) => {
      if (draggingRailStop) {
        if (Math.abs(event.clientX - dragStartX) > 2) dragMoved = true;
        if (dragMoved) updateRailFromPointer(event);
      }
    });
    rail.addEventListener('pointerup', (event) => {
      if (draggingRailStop && !dragMoved) {
        const handle = event.target.closest('.stop-handle');
        if (handle) {
          openModal(handle);
        }
      }
      draggingRailStop = false;
    });
    rail.addEventListener('pointercancel', () => { draggingRailStop = false; });
  }

  byId('applyTargetButton').addEventListener('click', () => {
    host.postMessage({ type: 'save' });
    showToast(`${activeGradient().name} applied to ${targetLabel()}.`);
  });
  byId('applyGlobalButton').addEventListener('click', () => commit((draft) => {
    draft.assignments.app = { mode: 'gradient', gradientId: activeGradientId() };
  }, `${activeGradient().name} applied globally.`));

  byId('stopRail').addEventListener('dblclick', (event) => {
    if (event.target === byId('stopRail')) openModal(byId('stopRail'));
  });
  byId('closeModalButton').addEventListener('click', closeModal);
  byId('cancelModalButton').addEventListener('click', closeModal);
  byId('stopModal').addEventListener('mousedown', (event) => { if (event.target === byId('stopModal')) closeModal(); });

  // Interactive 2D Color Picker Visual
  const colorVisualEl = byId('colorPickerVisual');
  if (colorVisualEl) {
    let draggingVisual = false;
    const updateFromVisualPointer = (event) => {
      const rect = colorVisualEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = clamp(Math.round(((event.clientX - rect.left) / rect.width) * 100), 0, 100);
      const v = clamp(Math.round((1 - (event.clientY - rect.top) / rect.height) * 100), 0, 100);
      modalHsv.s = s;
      modalHsv.v = v;
      const newHex = hsvToHex(modalHsv.h, modalHsv.s, modalHsv.v);
      if (modalDraft) modalDraft.color = newHex;
      byId('modalHex').value = newHex;
      syncModalVisuals();
      updateSelectedStop('color', newHex);
    };
    colorVisualEl.addEventListener('pointerdown', (event) => {
      draggingVisual = true;
      colorVisualEl.setPointerCapture?.(event.pointerId);
      updateFromVisualPointer(event);
    });
    colorVisualEl.addEventListener('pointermove', (event) => {
      if (draggingVisual) updateFromVisualPointer(event);
    });
    colorVisualEl.addEventListener('pointerup', () => { draggingVisual = false; });
    colorVisualEl.addEventListener('pointercancel', () => { draggingVisual = false; });
  }

  // Interactive Hue Strip
  const hueStripEl = document.querySelector('.hue-strip');
  if (hueStripEl) {
    let draggingHue = false;
    const updateFromHuePointer = (event) => {
      const rect = hueStripEl.getBoundingClientRect();
      if (rect.width <= 0) return;
      const h = clamp(Math.round(((event.clientX - rect.left) / rect.width) * 360), 0, 360) % 360;
      modalHsv.h = h;
      const newHex = hsvToHex(modalHsv.h, modalHsv.s, modalHsv.v);
      if (modalDraft) modalDraft.color = newHex;
      byId('modalHex').value = newHex;
      syncModalVisuals();
      updateSelectedStop('color', newHex);
    };
    hueStripEl.addEventListener('pointerdown', (event) => {
      draggingHue = true;
      hueStripEl.setPointerCapture?.(event.pointerId);
      updateFromHuePointer(event);
    });
    hueStripEl.addEventListener('pointermove', (event) => {
      if (draggingHue) updateFromHuePointer(event);
    });
    hueStripEl.addEventListener('pointerup', () => { draggingHue = false; });
    hueStripEl.addEventListener('pointercancel', () => { draggingHue = false; });
  }

  // Interactive Alpha Strip
  const alphaStripEl = document.querySelector('.alpha-strip');
  if (alphaStripEl) {
    let draggingAlpha = false;
    const updateFromAlphaPointer = (event) => {
      const rect = alphaStripEl.getBoundingClientRect();
      if (rect.width <= 0) return;
      const opacity = clamp(Math.round(((event.clientX - rect.left) / rect.width) * 100), 0, 100);
      modalOpacityVal = opacity;
      if (modalDraft) modalDraft.opacity = opacity;
      byId('modalOpacity').value = String(opacity);
      syncModalVisuals();
      updateSelectedStop('opacity', opacity);
    };
    alphaStripEl.addEventListener('pointerdown', (event) => {
      draggingAlpha = true;
      alphaStripEl.setPointerCapture?.(event.pointerId);
      updateFromAlphaPointer(event);
    });
    alphaStripEl.addEventListener('pointermove', (event) => {
      if (draggingAlpha) updateFromAlphaPointer(event);
    });
    alphaStripEl.addEventListener('pointerup', () => { draggingAlpha = false; });
    alphaStripEl.addEventListener('pointercancel', () => { draggingAlpha = false; });
  }

  byId('modalHex').addEventListener('input', (event) => {
    if (modalDraft && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(event.target.value)) {
      modalDraft.color = safeHex(event.target.value);
      const rgb = hexToRgb(modalDraft.color);
      modalHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      syncModalVisuals();
      updateSelectedStop('color', modalDraft.color);
    }
  });
  byId('modalPosition').addEventListener('input', (event) => {
    if (modalDraft) {
      modalDraft.position = Math.round(clamp(event.target.value, 0, 100));
      updateSelectedStop('position', modalDraft.position);
    }
  });
  byId('modalOpacity').addEventListener('input', (event) => {
    if (modalDraft) {
      modalOpacityVal = Math.round(clamp(event.target.value, 0, 100));
      modalDraft.opacity = modalOpacityVal;
      syncModalVisuals();
      updateSelectedStop('opacity', modalDraft.opacity);
    }
  });
  all('[data-copy-modal]').forEach((button) => button.addEventListener('click', () => host.postMessage({ type: 'copy', text: byId('modalHex').value })));
  byId('duplicateStopButton').addEventListener('click', () => {
    if (!modalDraft) return;
    commit(() => {
      const gradient = ensureTargetGradient();
      if (gradient.stops.length >= 8) return;
      const duplicate = clone(modalDraft);
      duplicate.position = Math.min(100, duplicate.position + 5);
      gradient.stops.push(duplicate);
      gradient.stops.sort((left, right) => left.position - right.position);
      selectedStopIndex = gradient.stops.indexOf(duplicate);
    }, 'Gradient stop duplicated.');
    closeModal();
  });
  byId('deleteStopButton').addEventListener('click', () => {
    if (activeGradient().stops.length <= 2) {
      showToast('A linear gradient needs at least two stops.');
      return;
    }
    commit(() => {
      const gradient = ensureTargetGradient();
      gradient.stops.splice(selectedStopIndex, 1);
      selectedStopIndex = Math.max(0, selectedStopIndex - 1);
    }, 'Gradient stop deleted.');
    closeModal();
  });
  byId('updateStopButton').addEventListener('click', () => {
    if (!modalDraft) return;
    const nextStop = clone(modalDraft);
    nextStop.color = safeHex(byId('modalHex').value, nextStop.color);
    nextStop.position = Math.round(clamp(byId('modalPosition').value, 0, 100));
    nextStop.opacity = Math.round(clamp(byId('modalOpacity').value, 0, 100));
    commit(() => {
      const gradient = ensureTargetGradient();
      const original = gradient.stops[selectedStopIndex];
      Object.assign(original, nextStop);
      gradient.stops.sort((left, right) => left.position - right.position);
      selectedStopIndex = gradient.stops.indexOf(original);
    }, 'Gradient stop updated.');
    closeModal();
  });

  byId('profileSelect')?.addEventListener('change', (event) => {
    commit((draft) => {
      draft.name = event.target.value;
    }, `Profile theme set to “${event.target.value}”.`);
  });

  function buildExportCss(targetProfile) {
    const lines = [
      ':root {',
      '  /* Generated by SimpleGradient Studio */'
    ];
    for (const gradient of Object.values(targetProfile.gradients)) {
      lines.push(`  --gradient-${gradient.id}: ${gradientCss(gradient, false)};`);
    }
    lines.push('}', '', '/* Assignment map */');
    for (const [target, assignment] of Object.entries(targetProfile.assignments)) {
      const resolved = resolveGradient(target);
      lines.push(`/* ${target}: ${assignment.mode}${resolved ? ` -> --gradient-${resolved.id}` : ''} */`);
    }
    return `${lines.join('\n')}\n`;
  }

  function downloadBlob(filename, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function triggerProfileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(String(e.target?.result || '{}'));
          commit((draft) => {
            if (parsed.name) draft.name = String(parsed.name).slice(0, 100);
            if (parsed.gradients && typeof parsed.gradients === 'object' && Object.keys(parsed.gradients).length) {
              draft.gradients = clone(parsed.gradients);
            }
            if (parsed.assignments && typeof parsed.assignments === 'object') {
              draft.assignments = clone(parsed.assignments);
            }
          }, `Imported gradient profile “${parsed.name || file.name}”.`);
        } catch (err) {
          showToast(`Failed to parse profile JSON: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      reader.readAsText(file);
      input.remove();
    });
    document.body.append(input);
    input.click();
  }

  document.addEventListener('keydown', (event) => {
    if (byId('stopModal').classList.contains('open')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        byId('updateStopButton').click();
      } else if (event.key === 'Tab') {
        const focusable = all('button:not(:disabled), input:not(:disabled)', byId('stopModal'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      (event.shiftKey ? byId('redoButton') : byId('undoButton')).click();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      byId('saveButton').click();
    }
    if (event.key === 'Escape') {
      closeExportMenu();
      if (scopeDrawerOpen) {
        scopeDrawerOpen = false;
        render();
      }
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'state' && event.data.profile) {
      profile = clone(event.data.profile);
      if (!profile.editor || profile.editor.targetCatalog !== 'studio') {
        profile.editor = profile.editor || {};
        profile.editor.targetCatalog = 'simplerag';
      }
      if (profile.editor.targetCatalog === 'simplerag' && !catalogs.simplerag.pages.some(p => p.id === profile.editor.activePage)) {
        profile.editor.activePage = 'home';
        profile.editor.activeTarget = 'app';
      }
      selectedStopIndex = Math.min(selectedStopIndex, activeGradient().stops.length - 1);
      render();
      host.setState?.({ profile });
    }
    if (event.data?.type === 'simpleRagIntegration') {
      const button = byId('installSimpleRagButton');
      button.classList.toggle('integration-installed', event.data.installed === true);
      button.innerHTML = event.data.installed === true
        ? '<span class="codicon codicon-pass-filled"></span>Update SimpleRAG'
        : '<span class="codicon codicon-plug"></span>Apply to SimpleRAG';
      if (event.data.message) showToast(event.data.message);
    }
  });

  window.addEventListener('simple-gradient-host-message', (event) => {
    const message = event.detail;
    if (message?.type === 'updateProfile') {
      localStorage.setItem('simpleGradient.previewProfile', JSON.stringify(message.profile));
    }
    if (message?.type === 'save') {
      localStorage.setItem('simpleGradient.previewProfile', JSON.stringify(profile));
      showToast(`Gradient profile “${profile.name}” saved in browser storage.`);
    }
    if (message?.type === 'export') {
      const isCss = message.format === 'css';
      const safeName = (profile.name || 'gradient-profile').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `${safeName}.${isCss ? 'css' : 'json'}`;
      const content = isCss ? buildExportCss(profile) : `${JSON.stringify(profile, null, 2)}\n`;
      downloadBlob(filename, content, isCss ? 'text/css' : 'application/json');
      showToast(`Exported ${filename}.`);
    }
    if (message?.type === 'import') {
      triggerProfileImport();
    }
    if (message?.type === 'copy') {
      navigator.clipboard?.writeText(message.text).then(() => showToast('Copied output to clipboard.')).catch(() => showToast(message.text));
    }
    if (message?.type === 'openView') {
      window.open(`?view=${message.view}`, '_blank');
      showToast(`Opened ${titleCase(message.view)} view.`);
    }
    if (message?.type === 'installSimpleRag') {
      showToast('Profile ready for SimpleRAG. Apply via VS Code extension or install-simplerag.ps1.');
    }
  });

  render();
  host.postMessage({ type: 'ready', view: document.body.dataset.view, protocol: 1 });
})();
