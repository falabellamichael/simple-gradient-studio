export const PROFILE_SCHEMA = 'simple-gradient-profile';
export const PROFILE_VERSION = 1;

export type AssignmentMode = 'inherit' | 'gradient' | 'solid';

export interface GradientStop {
  color: string;
  position: number;
  opacity: number;
}

export interface GradientDefinition {
  id: string;
  name: string;
  type: 'linear';
  angle: number;
  stops: GradientStop[];
}

export interface GradientAssignment {
  mode: AssignmentMode;
  gradientId?: string;
}

export interface GradientEffects {
  allOff: boolean;
  surface: 'glass' | 'solid';
  autoBlend: boolean;
  blendStrength?: number;
}

export interface GradientTypography {
  textGradient?: string;
  accentColor?: string;
  glow?: boolean;
}

export interface TargetTextStyle {
  textGradient?: string;
  color?: string;
  glow?: boolean;
}

export interface GradientProfile {
  schema: typeof PROFILE_SCHEMA;
  version: typeof PROFILE_VERSION;
  name: string;
  gradients: Record<string, GradientDefinition>;
  assignments: Record<string, GradientAssignment>;
  editor: {
    activePage: string;
    activeTarget: string;
    targetCatalog: 'studio' | 'simplerag';
    targetMode: boolean;
    zoom: number;
  };
  effects: GradientEffects;
  typography?: GradientTypography;
  textStyles?: Record<string, TargetTextStyle>;
  customPages?: Record<string, string>;
}

const SAFE_TARGET = /^(app|page:[a-z0-9-]+|panel:[a-z0-9-]+\.[a-z0-9-]+)$/;
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SAFE_HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

function normalizeHex(value: unknown, fallback: string): string {
  return typeof value === 'string' && SAFE_HEX.test(value) ? value.toUpperCase() : fallback;
}

function normalizeStop(value: unknown, index: number): GradientStop {
  const raw = value && typeof value === 'object' ? value as Partial<GradientStop> : {};
  return {
    color: normalizeHex(raw.color, index === 0 ? '#12202A' : '#E86633'),
    position: Math.round(clamp(Number(raw.position), 0, 100)),
    opacity: Math.round(clamp(Number(raw.opacity ?? 100), 0, 100))
  };
}

function normalizeGradient(id: string, value: unknown): GradientDefinition {
  const raw = value && typeof value === 'object' ? value as Partial<GradientDefinition> : {};
  let stops = Array.isArray(raw.stops) ? raw.stops.slice(0, 8).map(normalizeStop) : [];
  if (stops.length < 2) {
    stops = [normalizeStop(undefined, 0), normalizeStop(undefined, 1)];
    stops[1].position = 100;
  }
  stops.sort((left, right) => left.position - right.position);
  return {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : 'Untitled gradient',
    type: 'linear',
    angle: Math.round(clamp(Number(raw.angle), 0, 359)),
    stops
  };
}

export function createDefaultProfile(): GradientProfile {
  const gradients: Record<string, GradientDefinition> = {
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
    },
    'ember-focus': {
      id: 'ember-focus',
      name: 'Ember Focus',
      type: 'linear',
      angle: 148,
      stops: [
        { color: '#11100F', position: 0, opacity: 94 },
        { color: '#1C1714', position: 44, opacity: 88 },
        { color: '#331E15', position: 75, opacity: 60 },
        { color: '#E86633', position: 100, opacity: 24 }
      ]
    },
    'ocean-workspace': {
      id: 'ocean-workspace',
      name: 'Ocean Workspace',
      type: 'linear',
      angle: 128,
      stops: [
        { color: '#0D1418', position: 0, opacity: 94 },
        { color: '#12252F', position: 48, opacity: 80 },
        { color: '#184552', position: 76, opacity: 50 },
        { color: '#4BA2B3', position: 100, opacity: 20 }
      ]
    },
    'grove-workspace': {
      id: 'grove-workspace',
      name: 'Grove Workspace',
      type: 'linear',
      angle: 142,
      stops: [
        { color: '#0E1511', position: 0, opacity: 94 },
        { color: '#15261B', position: 46, opacity: 80 },
        { color: '#22422C', position: 76, opacity: 50 },
        { color: '#5E9B6E', position: 100, opacity: 20 }
      ]
    },
    'oled-ember': {
      id: 'oled-ember',
      name: 'OLED Ember Edge',
      type: 'linear',
      angle: 118,
      stops: [
        { color: '#060708', position: 0, opacity: 95 },
        { color: '#0E1013', position: 52, opacity: 90 },
        { color: '#1D130F', position: 80, opacity: 65 },
        { color: '#E86633', position: 100, opacity: 22 }
      ]
    }
  };

  return {
    schema: PROFILE_SCHEMA,
    version: PROFILE_VERSION,
    name: 'Warm Glass Workspace',
    gradients,
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
    editor: {
      activePage: 'workbench',
      activeTarget: 'panel:workbench.inspector',
      targetCatalog: 'studio',
      targetMode: true,
      zoom: 100
    },
    effects: {
      allOff: false,
      surface: 'glass',
      autoBlend: true
    }
  };
}

export function normalizeEffects(value: unknown): GradientEffects {
  const raw = value && typeof value === 'object' ? value as Partial<GradientEffects> : {};
  const result: GradientEffects = {
    allOff: raw.allOff === true,
    surface: raw.surface === 'solid' ? 'solid' : 'glass',
    autoBlend: raw.autoBlend !== false
  };
  if (typeof raw.blendStrength === 'number') {
    result.blendStrength = Math.round(clamp(raw.blendStrength, 0, 100));
  }
  return result;
}

export function normalizeProfile(value: unknown): GradientProfile {
  const fallback = createDefaultProfile();
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const raw = value as Partial<GradientProfile>;
  const rawGradients = raw.gradients && typeof raw.gradients === 'object' ? raw.gradients : {};
  const gradients: Record<string, GradientDefinition> = {};
  for (const [rawId, definition] of Object.entries(rawGradients)) {
    const id = rawId.toLowerCase();
    if (SAFE_ID.test(id)) {
      gradients[id] = normalizeGradient(id, definition);
    }
  }
  if (!Object.keys(gradients).length) {
    Object.assign(gradients, fallback.gradients);
  }

  const assignments: Record<string, GradientAssignment> = {};
  const rawAssignments = raw.assignments && typeof raw.assignments === 'object' ? raw.assignments : {};
  for (const [target, value] of Object.entries(rawAssignments)) {
    if (!SAFE_TARGET.test(target) || !value || typeof value !== 'object') {
      continue;
    }
    const candidate = value as Partial<GradientAssignment>;
    const mode: AssignmentMode = candidate.mode === 'gradient' || candidate.mode === 'solid' ? candidate.mode : 'inherit';
    const gradientId = typeof candidate.gradientId === 'string' && gradients[candidate.gradientId]
      ? candidate.gradientId
      : undefined;
    assignments[target] = mode === 'gradient' && gradientId ? { mode, gradientId } : { mode: mode === 'gradient' ? 'inherit' : mode };
  }
  if (!assignments.app) {
    assignments.app = { mode: 'gradient', gradientId: Object.keys(gradients)[0] };
  }

  const editor = raw.editor && typeof raw.editor === 'object' ? raw.editor : fallback.editor;
  const activePage = typeof editor.activePage === 'string' && /^[a-z0-9-]+$/.test(editor.activePage)
    ? editor.activePage
    : fallback.editor.activePage;
  const activeTarget = typeof editor.activeTarget === 'string' && SAFE_TARGET.test(editor.activeTarget)
    ? editor.activeTarget
    : fallback.editor.activeTarget;
  const targetCatalog = editor.targetCatalog === 'simplerag' ? 'simplerag' : 'studio';

  function normalizeTypography(raw: unknown): GradientTypography | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const t = raw as Partial<GradientTypography>;
    return {
      textGradient: typeof t.textGradient === 'string' && t.textGradient.length < 500 ? t.textGradient : undefined,
      accentColor: typeof t.accentColor === 'string' && SAFE_HEX.test(t.accentColor) ? t.accentColor.toUpperCase() : undefined,
      glow: t.glow === true
    };
  }

  function normalizeCustomPages(raw: unknown): Record<string, string> | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof key === 'string' && key.length < 100 && typeof value === 'string' && value.length < 100000) {
        result[key] = value;
      }
    }
    return Object.keys(result).length ? result : undefined;
  }

  function normalizeTextStyles(raw: unknown): Record<string, TargetTextStyle> | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const result: Record<string, TargetTextStyle> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof key === 'string' && SAFE_ID.test(key) && value && typeof value === 'object') {
        const v = value as Record<string, unknown>;
        result[key] = {
          textGradient: typeof v.textGradient === 'string' && v.textGradient.length < 500 ? v.textGradient : undefined,
          color: typeof v.color === 'string' && SAFE_HEX.test(String(v.color)) ? String(v.color).toUpperCase() : undefined,
          glow: v.glow === true
        };
      }
    }
    return Object.keys(result).length ? result : undefined;
  }

  return {
    schema: PROFILE_SCHEMA,
    version: PROFILE_VERSION,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 100) : fallback.name,
    gradients,
    assignments,
    editor: {
      activePage,
      activeTarget,
      targetCatalog,
      targetMode: editor.targetMode !== false,
      zoom: Math.round(clamp(Number(editor.zoom ?? 100), 70, 140))
    },
    effects: normalizeEffects(raw.effects),
    typography: normalizeTypography((raw as Record<string, unknown>).typography),
    textStyles: normalizeTextStyles((raw as Record<string, unknown>).textStyles),
    customPages: normalizeCustomPages((raw as Record<string, unknown>).customPages)
  };
}

export function gradientToCss(gradient: GradientDefinition): string {
  const stops = gradient.stops.map((stop) => {
    const alpha = Math.floor((clamp(stop.opacity, 0, 100) * 255 + 50) / 100).toString(16).padStart(2, '0').toUpperCase();
    const color = stop.opacity >= 100 ? stop.color.slice(0, 7) : `${stop.color.slice(0, 7)}${alpha}`;
    return `${color} ${stop.position}%`;
  });
  return `linear-gradient(${gradient.angle}deg, ${stops.join(', ')})`;
}

export function resolveAssignment(profile: GradientProfile, target: string): GradientDefinition | undefined {
  const assignment = profile.assignments[target];
  if (assignment?.mode === 'solid') {
    return undefined;
  }
  if (assignment?.mode === 'gradient' && assignment.gradientId) {
    return profile.gradients[assignment.gradientId];
  }
  if (target.startsWith('panel:')) {
    const page = target.slice('panel:'.length).split('.')[0];
    const pageAssignment = profile.assignments[`page:${page}`];
    if (pageAssignment?.mode === 'solid') {
      return undefined;
    }
    if (pageAssignment?.mode === 'gradient' && pageAssignment.gradientId) {
      return profile.gradients[pageAssignment.gradientId];
    }
  }
  const appAssignment = profile.assignments.app;
  return appAssignment?.mode === 'gradient' && appAssignment.gradientId
    ? profile.gradients[appAssignment.gradientId]
    : undefined;
}

export function exportCss(profile: GradientProfile): string {
  const lines = [
    ':root {',
    '  /* Generated by SimpleGradient Studio */'
  ];
  for (const gradient of Object.values(profile.gradients)) {
    lines.push(`  --gradient-${gradient.id}: ${gradientToCss(gradient)};`);
  }
  lines.push('}', '', '/* Assignment map */');
  for (const [target, assignment] of Object.entries(profile.assignments)) {
    const resolved = resolveAssignment(profile, target);
    lines.push(`/* ${target}: ${assignment.mode}${resolved ? ` -> --gradient-${resolved.id}` : ''} */`);
  }
  return `${lines.join('\n')}\n`;
}
