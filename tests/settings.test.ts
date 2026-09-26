import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPatch, mergeSettings } from '../src/shared/settings.ts';
import { DEFAULT_SETTINGS } from '../src/shared/types.ts';

test('mergeSettings returns defaults for garbage input', () => {
  assert.deepEqual(mergeSettings(DEFAULT_SETTINGS, null), DEFAULT_SETTINGS);
  assert.deepEqual(mergeSettings(DEFAULT_SETTINGS, 'junk'), DEFAULT_SETTINGS);
  assert.deepEqual(mergeSettings(DEFAULT_SETTINGS, []), DEFAULT_SETTINGS);
});

test('mergeSettings merges valid data over defaults', () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, {
    activePet: 'nova',
    scale: 4,
    homePosition: { x: 10, y: 20 },
  });
  assert.equal(merged.activePet, 'nova');
  assert.equal(merged.scale, 4);
  assert.deepEqual(merged.homePosition, { x: 10, y: 20 });
  assert.equal(merged.roamMode, DEFAULT_SETTINGS.roamMode);
});

test('mergeSettings drops invalid values and unknown keys', () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, {
    activePet: '',
    scale: 99,
    roamMode: 'yeet',
    idleThresholdSec: -5,
    clickThrough: 'yes',
    homePosition: { x: 'a', y: 1 },
    bogus: true,
  });
  assert.deepEqual(merged, DEFAULT_SETTINGS);
  assert.equal('bogus' in merged, false);
});

test('applyPatch validates against current settings', () => {
  const current = mergeSettings(DEFAULT_SETTINGS, { activePet: 'pixel', scale: 3 });
  const next = applyPatch(current, { scale: 1 });
  assert.equal(next.scale, 1);
  assert.equal(next.activePet, 'pixel');
});

test('applyPatch keeps current values for bad patch values', () => {
  const current = mergeSettings(DEFAULT_SETTINGS, { activePet: 'pixel', scale: 3 });
  const next = applyPatch(current, { scale: 0, activePet: '' });
  assert.equal(next.scale, 3);
  assert.equal(next.activePet, 'pixel');
});

test('mergeSettings rounds fractional homePosition coords', () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, { homePosition: { x: 10.4, y: 20.6 } });
  assert.deepEqual(merged.homePosition, { x: 10, y: 21 });
});
