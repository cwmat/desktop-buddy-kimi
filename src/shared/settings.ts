// Pure settings merge/validation. No runtime imports (type-only) so Node's
// native type stripping can unit-test this module directly.

import type { RoamMode, Settings } from './types';

const ROAM_MODES: readonly string[] = ['off', 'always', 'idle'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function pickScale(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 4 ? v : fallback;
}

function pickIdleThreshold(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : fallback;
}

function pickRoamMode(v: unknown, fallback: RoamMode): RoamMode {
  return typeof v === 'string' && ROAM_MODES.includes(v) ? (v as RoamMode) : fallback;
}

function pickActivePet(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function pickHomePosition(v: unknown, fallback: Settings['homePosition']): Settings['homePosition'] {
  if (v === null) return null;
  if (
    isRecord(v) &&
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y)
  ) {
    return { x: Math.round(v.x), y: Math.round(v.y) };
  }
  return fallback;
}

/** Merge raw persisted data over defaults, dropping invalid/unknown values. */
export function mergeSettings(defaults: Settings, raw: unknown): Settings {
  const src = isRecord(raw) ? raw : {};
  return {
    activePet: pickActivePet(src.activePet, defaults.activePet),
    scale: pickScale(src.scale, defaults.scale),
    roamMode: pickRoamMode(src.roamMode, defaults.roamMode),
    idleThresholdSec: pickIdleThreshold(src.idleThresholdSec, defaults.idleThresholdSec),
    clickThrough: pickBool(src.clickThrough, defaults.clickThrough),
    launchOnLogin: pickBool(src.launchOnLogin, defaults.launchOnLogin),
    homePosition: pickHomePosition('homePosition' in src ? src.homePosition : undefined, defaults.homePosition),
  };
}

/** Merge a partial patch into current settings (same validation rules). */
export function applyPatch(current: Settings, patch: unknown): Settings {
  return mergeSettings(current, patch);
}
