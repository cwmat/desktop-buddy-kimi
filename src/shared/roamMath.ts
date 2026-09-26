// Pure roaming geometry: waypoint selection and stepping. No electron imports
// so Node's native type stripping can unit-test this module directly.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Pick a waypoint along the bottom of `area` for a window of `winWidth` px.
 * Prefers a point at least `minDistance` from `currentX` (best-effort: gives up
 * after a few tries so a narrow area can't loop forever). Returns the target's
 * left-edge x, clamped inside the area.
 */
export function pickWaypoint(
  area: Rect,
  winWidth: number,
  currentX: number,
  rand: () => number,
  minDistance = 80,
): number {
  const minX = area.x;
  const maxX = area.x + Math.max(0, area.width - winWidth);
  if (maxX - minX <= minDistance) {
    // Too narrow to be picky: anywhere in range goes.
    return Math.round(minX + rand() * (maxX - minX));
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = Math.round(minX + rand() * (maxX - minX));
    if (Math.abs(candidate - currentX) >= minDistance) return candidate;
  }
  // Deterministic fallback: jump to the far side.
  return currentX < (minX + maxX) / 2 ? maxX : minX;
}

/**
 * Step `current` toward `target` by at most `stepPx`. Returns the new x and the
 * direction of travel (1 right, -1 left, 0 arrived/aligned).
 */
export function stepToward(current: number, target: number, stepPx: number): { next: number; dir: -1 | 0 | 1 } {
  const delta = target - current;
  if (delta === 0) return { next: current, dir: 0 };
  const step = Math.min(Math.abs(delta), Math.max(1, stepPx));
  const dir = delta > 0 ? 1 : -1;
  return { next: current + step * dir, dir };
}

/** Y for the window's top edge so its bottom rests on the area's bottom. */
export function floorY(area: Rect, winHeight: number): number {
  return area.y + area.height - winHeight;
}

/** ms per roam step for a given integer scale — bigger pets stride a bit slower. */
export function stepIntervalMs(scale: number): number {
  return Math.max(24, 46 - scale * 4);
}
