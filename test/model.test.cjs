'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PROFILE_SCHEMA,
  createDefaultProfile,
  exportCss,
  gradientToCss,
  normalizeProfile,
  resolveAssignment
} = require('../out/model.js');

test('default profile is versioned and includes reusable gradients', () => {
  const profile = createDefaultProfile();
  assert.equal(profile.schema, PROFILE_SCHEMA);
  assert.equal(profile.version, 1);
  assert.ok(Object.keys(profile.gradients).length >= 5);
  assert.equal(profile.assignments['panel:workbench.inspector'].mode, 'gradient');
});

test('normalizer clamps imported values and drops unsafe targets and CSS payloads', () => {
  const profile = normalizeProfile({
    name: 'Imported',
    gradients: {
      safe: {
        name: 'Safe',
        angle: 800,
        type: 'radial',
        stops: [
          { color: 'url(https://bad.example)', position: -20, opacity: 900 },
          { color: '#112233', position: 120, opacity: -2 }
        ]
      }
    },
    assignments: {
      'panel:workbench.inspector': { mode: 'gradient', gradientId: 'safe' },
      'panel:workbench.inspector > script': { mode: 'gradient', gradientId: 'safe' }
    }
  });
  assert.equal(profile.gradients.safe.type, 'linear');
  assert.equal(profile.gradients.safe.angle, 359);
  assert.deepEqual(profile.gradients.safe.stops.map((stop) => stop.position), [0, 100]);
  assert.deepEqual(profile.gradients.safe.stops.map((stop) => stop.opacity), [100, 0]);
  assert.equal(profile.gradients.safe.stops[0].color, '#12202A');
  assert.equal(profile.assignments['panel:workbench.inspector > script'], undefined);
});

test('panel resolution follows exact panel then page then app and solid blocks inheritance', () => {
  const profile = createDefaultProfile();
  profile.assignments['panel:files.inspector'] = { mode: 'inherit' };
  assert.equal(resolveAssignment(profile, 'panel:files.inspector').id, 'ocean-workspace');
  profile.assignments['panel:files.inspector'] = { mode: 'solid' };
  assert.equal(resolveAssignment(profile, 'panel:files.inspector'), undefined);
  profile.assignments['panel:files.inspector'] = { mode: 'gradient', gradientId: 'grove-workspace' };
  assert.equal(resolveAssignment(profile, 'panel:files.inspector').id, 'grove-workspace');
});

test('gradient CSS is linear, bounded, and alpha-aware', () => {
  const profile = createDefaultProfile();
  const gradient = profile.gradients['warm-studio'];
  gradient.stops[0].opacity = 50;
  const css = gradientToCss(gradient);
  assert.match(css, /^linear-gradient\(132deg,/);
  assert.match(css, /#FFF9F280 0%/);
  assert.doesNotMatch(css, /url\(/i);
});

test('CSS export contains named variables without arbitrary selectors', () => {
  const css = exportCss(createDefaultProfile());
  assert.match(css, /--gradient-warm-studio:/);
  assert.match(css, /panel:workbench\.inspector/);
  assert.doesNotMatch(css, /<script/i);
});
