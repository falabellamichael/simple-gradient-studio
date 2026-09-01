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

export interface GradientProfile {
  schema: typeof PROFILE_SCHEMA;
  version: typeof PROFILE_VERSION;
  name: string;
  gradients: Record<string, GradientDefinition>;
  assignments: Record<string, GradientAssignment>;
  editor: {
    activePage: string;
    activeTarget: string;
    targetMode: boolean;
    zoom: number;
  };
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
        { color: '#FFF9F2', position: 0, opacity: 100 },
        { color: '#F8EFE3', position: 42, opacity: 100 },
        { color: '#F1D6C1', position: 76, opacity: 100 },
        { color: '#E86633', position: 100, opacity: 100 }
      ]
    },
    'ember-assistant': {
      id: 'ember-assistant',
      name: 'Ember Focus',
      type: 'linear',
      angle: 148,
      stops: [
        { color: '#171512', position: 0, opacity: 100 },
        { color: '#25221F', position: 44, opacity: 100 },
        { color: '#563022', position: 75, opacity: 100 },
        { color: '#E86633', position: 100, opacity: 100 }
      ]
    },
    'ocean-workspace': {
      id: 'ocean-workspace',
      name: 'Ocean Workspace',
      type: 'linear',
      angle: 128,
      stops: [
        { color: '#12202A', position: 0, opacity: 100 },
        { color: '#167C8C', position: 48, opacity: 100 },
        { color: '#9BCBD1', position: 76, opacity: 100 },
        { color: '#E8F0F2', position: 100, opacity: 100 }
      ]
    },
    'grove-workspace': {
      id: 'grove-workspace',
      name: 'Grove Workspace',
      type: 'linear',
      angle: 142,
      stops: [
        { color: '#17231C', position: 0, opacity: 100 },
        { color: '#4D7C58', position: 46, opacity: 100 },
        { color: '#B8CFAD', position: 76, opacity: 100 },
        { color: '#EDF1E7', position: 100, opacity: 100 }
      ]
    },
    'oled-ember': {
      id: 'oled-ember',
      name: 'OLED Ember Edge',
      type: 'linear',
      angle: 118,
      stops: [
        { color: '#000000', position: 0, opacity: 100 },
        { color: '#0B0B0D', position: 52, opacity: 100 },
        { color: '#2A1710', position: 80, opacity: 100 },
        { color: '#E86633', position: 100, opacity: 100 }
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
      'page:overview': { mode: 'gradient', gradientId: 'warm-studio' },
      'panel:overview.assistant': { mode: 'gradient', gradientId: 'warm-studio' },
      'page:journal': { mode: 'gradient', gradientId: 'ocean-workspace' },
      'page:tasks': { mode: 'gradient', gradientId: 'grove-workspace' },
      'page:mail': { mode: 'inherit' },
      'page:documents': { mode: 'inherit' },
      'page:knowledge': { mode: 'inherit' },
      'page:settings': { mode: 'inherit' }
    },
    editor: {
      activePage: 'overview',
      activeTarget: 'panel:overview.assistant',
      targetMode: true,
      zoom: 100
    }
  };
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

  return {
    schema: PROFILE_SCHEMA,
    version: PROFILE_VERSION,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 100) : fallback.name,
    gradients,
    assignments,
    editor: {
      activePage,
      activeTarget,
      targetMode: editor.targetMode !== false,
      zoom: Math.round(clamp(Number(editor.zoom ?? 100), 70, 140))
    }
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
