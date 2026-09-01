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
        { id: 'toolbar', label: 'Toolbar' }
      ],
      previewSurfaces: {
        navigation: 'navigation', workspace: 'workspace', cards: 'cards', assistant: 'assistant', toolbar: 'toolbar'
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
        'warm-studio': { id: 'warm-studio', name: 'Warm Studio Canvas', type: 'linear', angle: 132, stops: [
          { color: '#FFF9F2', position: 0, opacity: 100 },
          { color: '#F8EFE3', position: 42, opacity: 100 },
          { color: '#F1D6C1', position: 76, opacity: 100 },
          { color: '#E86633', position: 100, opacity: 100 }
        ] },
        'ember-focus': { id: 'ember-focus', name: 'Ember Focus', type: 'linear', angle: 148, stops: [
          { color: '#171512', position: 0, opacity: 100 },
          { color: '#25221F', position: 44, opacity: 100 },
          { color: '#563022', position: 75, opacity: 100 },
          { color: '#E86633', position: 100, opacity: 100 }
        ] },
        'ocean-workspace': { id: 'ocean-workspace', name: 'Ocean Workspace', type: 'linear', angle: 128, stops: [
          { color: '#12202A', position: 0, opacity: 100 },
          { color: '#167C8C', position: 48, opacity: 100 },
          { color: '#9BCBD1', position: 76, opacity: 100 },
          { color: '#E8F0F2', position: 100, opacity: 100 }
        ] },
        'grove-workspace': { id: 'grove-workspace', name: 'Grove Workspace', type: 'linear', angle: 142, stops: [
          { color: '#17231C', position: 0, opacity: 100 },
          { color: '#4D7C58', position: 46, opacity: 100 },
          { color: '#B8CFAD', position: 76, opacity: 100 },
          { color: '#EDF1E7', position: 100, opacity: 100 }
        ] },
        'oled-ember': { id: 'oled-ember', name: 'OLED Ember Edge', type: 'linear', angle: 118, stops: [
          { color: '#000000', position: 0, opacity: 100 },
          { color: '#0B0B0D', position: 52, opacity: 100 },
          { color: '#2A1710', position: 80, opacity: 100 },
          { color: '#E86633', position: 100, opacity: 100 }
        ] }
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
  let profile = clone((useFreshPreview ? null : host.getState()?.profile) || defaultProfile());
  let selectedStopIndex = 0;
  let undoStack = [];
  let redoStack = [];
  let modalDraft = null;
  let modalTrigger = null;
  let toastTimer = 0;
  let assignmentVisible = true;
  let compareMode = false;
  let scopeDrawerOpen = false;
  let sendTimer = 0;

  function activeCatalog() {
    return catalogs[profile.editor.targetCatalog] || catalogs.studio;
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

  function gradientCss(gradient) {
    if (!gradient) return 'none';
    const stops = gradient.stops.map((stop) => {
      const alpha = Math.floor((clamp(stop.opacity, 0, 100) * 255 + 50) / 100).toString(16).padStart(2, '0').toUpperCase();
      const color = stop.opacity >= 100 ? stop.color.slice(0, 7) : `${stop.color.slice(0, 7)}${alpha}`;
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
    byId('targetCatalogSelect').value = profile.editor.targetCatalog || 'studio';
    byId('sampleBrandName').textContent = profile.editor.targetCatalog === 'simplerag'
      ? 'SimpleRAG surface map'
      : 'Gradient Sandbox';

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

    const scopeTree = byId('scopeTree');
    scopeTree.replaceChildren();
    const appRow = createScopeRow({ id: 'app', label: 'App default', icon: 'home' });
    scopeTree.append(appRow);
    for (const page of pages) {
      const pageTarget = `page:${page.id}`;
      const pageRow = createScopeRow({ id: pageTarget, label: page.label, icon: page.icon, page: true });
      scopeTree.append(pageRow);
      if (page.id !== profile.editor.activePage) continue;
      const children = document.createElement('div');
      children.className = 'scope-children';
      children.setAttribute('role', 'group');
      for (const surface of surfaces) {
        children.append(createScopeRow({
          id: `panel:${page.id}.${surface.id}`,
          label: surface.label,
          icon: surface.id === 'navigation' ? 'list-tree' : surface.id === 'assistant' || surface.id === 'inspector' ? 'sparkle' : surface.id === 'toolbar' ? 'filter' : 'layout-centered',
          child: true
        }));
      }
      scopeTree.append(children);
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
    glyph.className = `codicon codicon-${icon}`;
    const text = document.createElement(child ? 'span' : 'b');
    text.textContent = label;
    const chip = document.createElement('span');
    chip.className = 'scope-chip';
    chip.textContent = 'Inherited';
    row.append(glyph, text, chip);
    return row;
  }

  function renderScope() {
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

  function renderPreview() {
    const app = byId('sampleApp');
    const catalog = activeCatalog();
    const previewSurfaces = catalog.previewSurfaces;
    const targetMap = [
      ['.sample-sidebar', previewSurfaces.navigation],
      ['.sample-editor', previewSurfaces.workspace],
      ['.component-grid', previewSurfaces.cards],
      ['.sample-inspector', previewSurfaces.assistant],
      ['.sample-filter', previewSurfaces.toolbar],
      ['.sample-topbar', previewSurfaces.toolbar]
    ];
    const body = app.querySelector('.sample-body');
    if (body) body.dataset.gradientTarget = `page:${profile.editor.activePage}`;
    for (const [selector, surface] of targetMap) {
      const element = app.querySelector(selector);
      if (element) element.dataset.gradientTarget = `panel:${profile.editor.activePage}.${surface}`;
    }
    app.classList.toggle('target-mode', profile.editor.targetMode);
    app.classList.toggle('compare-mode', compareMode);
    byId('targetModeButton').classList.toggle('active', profile.editor.targetMode);
    byId('targetModeButton').setAttribute('aria-pressed', String(profile.editor.targetMode));
    byId('compareButton').classList.toggle('active', compareMode);
    byId('compareButton').setAttribute('aria-pressed', String(compareMode));
    byId('pageSelect').value = profile.editor.activePage;
    byId('zoomOutput').textContent = `${profile.editor.zoom}%`;
    app.style.transform = `scale(${profile.editor.zoom / 100})`;

    const pageGradient = resolveGradient(`page:${profile.editor.activePage}`) || resolveGradient('app');
    if (body && pageGradient && !compareMode) body.style.backgroundImage = gradientCss(pageGradient);
    if (body && (!pageGradient || compareMode)) body.style.backgroundImage = 'none';

    all('[data-gradient-target]', app).forEach((element) => {
      const target = element.dataset.gradientTarget;
      const gradient = resolveGradient(target);
      const selected = target === profile.editor.activeTarget;
      element.classList.toggle('selected-target', selected);
      if (element !== body) {
        element.style.backgroundImage = gradient && !compareMode ? gradientCss(gradient) : '';
      }
    });
    const label = app.querySelector('.target-label');
    if (label) label.textContent = `TARGET: ${assignmentLabel().toUpperCase()}`;

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
      handle.addEventListener('click', () => {
        selectedStopIndex = index;
        try {
          openModal(handle);
        } catch (error) {
          showToast(`Could not open the stop editor: ${error instanceof Error ? error.message : String(error)}`);
        }
        renderStops();
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
    const grid = byId('assignmentPopout').querySelector('.assignment-grid');
    grid.replaceChildren();
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
    byId('colorPickerVisual').style.setProperty('--modal-color', modalDraft.color);
    document.querySelector('.alpha-strip').style.setProperty('--modal-color', modalDraft.color);
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
    if (pageButton) {
      profile.editor.activePage = pageButton.dataset.pagePreview;
      profile.editor.activeTarget = `page:${pageButton.dataset.pagePreview}`;
      render();
      scheduleSend();
      return;
    }
    const target = event.target.closest('[data-gradient-target]');
    if (!profile.editor.targetMode || !target) return;
    event.preventDefault();
    event.stopPropagation();
    setTarget(target.dataset.gradientTarget);
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
    const nextCatalog = event.target.value === 'simplerag' ? 'simplerag' : 'studio';
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

  byId('exportButton').addEventListener('click', () => {
    const menu = byId('exportMenu');
    menu.hidden = !menu.hidden;
    byId('exportButton').setAttribute('aria-expanded', String(!menu.hidden));
  });
  all('[data-export]').forEach((button) => button.addEventListener('click', () => {
    byId('exportMenu').hidden = true;
    host.postMessage({ type: 'export', format: button.dataset.export });
  }));
  all('[data-import]').forEach((button) => button.addEventListener('click', () => {
    byId('exportMenu').hidden = true;
    host.postMessage({ type: 'import' });
  }));
  all('[data-copy-css]').forEach((button) => button.addEventListener('click', () => {
    byId('exportMenu').hidden = true;
    host.postMessage({ type: 'copy', text: currentCss() });
  }));

  byId('targetModeButton').addEventListener('click', () => {
    profile.editor.targetMode = !profile.editor.targetMode;
    render();
    scheduleSend();
  });
  byId('compareButton').addEventListener('click', () => {
    compareMode = !compareMode;
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

  byId('angleInput').addEventListener('change', (event) => commit(() => { ensureTargetGradient().angle = Math.round(clamp(event.target.value, 0, 359)); }));
  byId('positionInput').addEventListener('change', (event) => updateSelectedStop('position', Math.round(clamp(event.target.value, 0, 100))));
  byId('opacityInput').addEventListener('change', (event) => updateSelectedStop('opacity', Math.round(clamp(event.target.value, 0, 100))));
  byId('colorInput').addEventListener('input', (event) => updateSelectedStop('color', safeHex(event.target.value)));
  byId('hexInput').addEventListener('change', (event) => updateSelectedStop('color', safeHex(event.target.value, activeGradient().stops[selectedStopIndex].color)));
  all('[data-copy-color]').forEach((button) => button.addEventListener('click', () => host.postMessage({ type: 'copy', text: activeGradient().stops[selectedStopIndex].color })));
  byId('blendInput').addEventListener('input', (event) => event.target.nextElementSibling.textContent = `${event.target.value}%`);

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
  byId('modalHex').addEventListener('input', (event) => {
    if (modalDraft && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(event.target.value)) {
      modalDraft.color = safeHex(event.target.value);
      byId('colorPickerVisual').style.setProperty('--modal-color', modalDraft.color);
      document.querySelector('.alpha-strip').style.setProperty('--modal-color', modalDraft.color);
    }
  });
  byId('modalPosition').addEventListener('input', (event) => { if (modalDraft) modalDraft.position = Math.round(clamp(event.target.value, 0, 100)); });
  byId('modalOpacity').addEventListener('input', (event) => { if (modalDraft) modalDraft.opacity = Math.round(clamp(event.target.value, 0, 100)); });
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
      byId('exportMenu').hidden = true;
      if (scopeDrawerOpen) {
        scopeDrawerOpen = false;
        render();
      }
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'state' && event.data.profile) {
      profile = clone(event.data.profile);
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
    if (message?.type === 'save') showToast('Gradient profile saved in browser preview mode.');
    if (message?.type === 'export') showToast(`${String(message.format || 'json').toUpperCase()} export is handled by VS Code after installation.`);
    if (message?.type === 'copy') navigator.clipboard?.writeText(message.text).then(() => showToast('Copied CSS to clipboard.')).catch(() => showToast(message.text));
    if (message?.type === 'openView') showToast(`${titleCase(message.view)} opens as a synchronized VS Code editor panel after installation.`);
    if (message?.type === 'installSimpleRag') showToast('SimpleRAG installation is available from the packaged VS Code extension.');
  });

  render();
  host.postMessage({ type: 'ready', view: document.body.dataset.view, protocol: 1 });
})();
