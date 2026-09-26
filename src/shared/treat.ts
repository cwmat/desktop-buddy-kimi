// Code-drawn pixel treat (a little bone) shown in front of the pet on
// `pet:treat`. Shared so the renderer and tests use the same frames.

import type { Palette, PixelMap } from '../sprite/engine';

export const TREAT_PALETTE: Palette = {
  k: '#f0d9a8', // bone
  K: '#c9a86a', // bone shade
  s: '#ffffff', // sparkle
};

// 8x7. Knobbed bone, alternating sparkle for a subtle shimmer.
const treat0: PixelMap = [
  '........',
  '.kk..kk.',
  'kkKKKKkk',
  '.kKKKKk.',
  'kkKKKKkk',
  '.kk..kk.',
  '........',
];

const treat1: PixelMap = [
  '.......s',
  '.kk..kk.',
  'kkKKKKkk',
  '.kKKKKk.',
  'kkKKKKkk',
  '.kk..kk.',
  '........',
];

const treat2: PixelMap = [
  '........',
  '.kk..kk.',
  'kkKKKKkk',
  '.kKKKKk.',
  'kkKKKKkk',
  '.kk..kk.',
  's.......',
];

export const TREAT_ANIMATION: { frames: PixelMap[]; fps: number } = {
  frames: [treat0, treat1, treat0, treat2],
  fps: 4,
};
