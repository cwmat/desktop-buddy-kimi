import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Animator, windowSizeFor } from '../src/sprite/engine.ts';
import type { AnimationSet } from '../src/sprite/engine.ts';

const grid = { width: 4, height: 2 };

function makeAnimations(idleFrames: string[][]): AnimationSet {
  const one = { frames: idleFrames, fps: 4 };
  return { idle: one, walk: one, happy: one, eat: one, sleep: one };
}

test('windowSizeFor scales grid by base upscale and scale', () => {
  const size = windowSizeFor({ grid: { width: 16, height: 16 } }, 2);
  assert.equal(size.width, 192);
  assert.equal(size.height, 192);
});

test('Animator loops frames at the state fps', () => {
  const a = ['x...', '....'];
  const b = ['.x..', '....'];
  const animator = new Animator(makeAnimations([a, b]));
  assert.equal(animator.update(0), a);
  assert.equal(animator.update(300), b);
  assert.equal(animator.update(300), a);
});

test('Animator playOnce returns to the fallback state', () => {
  const idle = ['x...', '....'];
  const happy = ['.x..', '....'];
  const anims = makeAnimations([idle]);
  anims.happy = { frames: [happy], fps: 10 };
  const animator = new Animator(anims);
  animator.playOnce('happy', 'idle');
  assert.equal(animator.currentState, 'happy');
  assert.equal(animator.update(0), happy);
  assert.equal(animator.update(100), idle);
  assert.equal(animator.currentState, 'idle');
});

void grid;
