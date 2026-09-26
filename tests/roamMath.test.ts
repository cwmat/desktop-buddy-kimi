import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickWaypoint, stepToward, floorY, stepIntervalMs } from '../src/shared/roamMath.ts';
import type { Rect } from '../src/shared/roamMath.ts';

const area: Rect = { x: 0, y: 0, width: 1920, height: 1040 }; // workArea (taskbar excluded)

test('pickWaypoint stays inside the area, accounting for window width', () => {
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    const x = pickWaypoint(area, 200, 500, () => r);
    assert.ok(x >= 0 && x <= 1720, `x=${x} out of [0,1720]`);
  }
});

test('pickWaypoint prefers a spot at least minDistance away', () => {
  // rand → 0 would pick x=0, only 100 away; retry with 0.9 lands far away.
  const rolls = [0, 0.9];
  let i = 0;
  const x = pickWaypoint(area, 200, 100, () => rolls[i++ % rolls.length]);
  assert.ok(Math.abs(x - 100) >= 80, `x=${x} too close to 100`);
});

test('pickWaypoint in an area narrower than minDistance still returns a valid x', () => {
  const narrow: Rect = { x: 300, y: 0, width: 250, height: 800 };
  const x = pickWaypoint(narrow, 200, 350, () => 0.5);
  assert.ok(x >= 300 && x <= 350, `x=${x} out of [300,350]`);
});

test('pickWaypoint exhausted retries fall back to the far side', () => {
  const x = pickWaypoint(area, 200, 100, () => 0.001); // always picks near-left
  assert.ok(x >= 0 && x <= 1720);
});

test('stepToward moves by stepPx and reports direction', () => {
  assert.deepEqual(stepToward(0, 100, 4), { next: 4, dir: 1 });
  assert.deepEqual(stepToward(100, 0, 4), { next: 96, dir: -1 });
});

test('stepToward clamps the last step onto the target', () => {
  assert.deepEqual(stepToward(98, 100, 4), { next: 100, dir: 1 });
  assert.deepEqual(stepToward(100, 100, 4), { next: 100, dir: 0 });
});

test('floorY rests the window bottom on the area bottom', () => {
  assert.equal(floorY(area, 192), 1040 - 192);
  assert.equal(floorY({ x: 100, y: 50, width: 800, height: 600 }, 100), 550);
});

test('stepIntervalMs shrinks with scale and stays sane', () => {
  for (let s = 1; s <= 4; s++) {
    assert.ok(stepIntervalMs(s) >= 24, `scale ${s} too fast`);
    assert.ok(stepIntervalMs(s) <= 60, `scale ${s} too slow`);
  }
  assert.ok(stepIntervalMs(1) > stepIntervalMs(4), 'bigger pets step faster per interval');
});
