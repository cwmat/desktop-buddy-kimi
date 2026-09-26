import type { PetDefinition } from './types';

// Biscuit the Corgi: orange/white loaf, stubby legs, big pointy ears.
// o = orange, O = dark orange outline, w = white/cream, e = eye, n = nose, p = paw shade
const palette = {
  o: '#e8913a',
  O: '#b05e1e',
  w: '#fdf3e3',
  e: '#2b1d12',
  n: '#4a2c17',
  p: '#c9742e',
};

// 16x16 frames. Rows must each be exactly 16 chars.

const idle0 = [
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..pO......Op....',
  '..pp......pp....',
  '................',
  '................',
];

const idleBlink = [
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.Oo.oOwwOo.ooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..pO......Op....',
  '..pp......pp....',
  '................',
  '................',
];

const walk0 = [
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '.pO........Op...',
  'pp..........pp..',
  '................',
  '................',
];

const walk1 = [
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..Op......pO....',
  '..pp......pp....',
  '................',
  '................',
];

const happy0 = [
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..pO......Op....',
  '..pp......pp....',
  '................',
  '................',
];

const happy1 = [
  '................',
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..pp......pp....',
  '................',
  '................',
];

const eat0 = [
  '................',
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..pp......pp....',
  '................',
  '................',
];

const eat1 = [
  '................',
  '................',
  '................',
  '...O........O...',
  '..OoO......oO...',
  '..OooO....OooO..',
  '..OooooOOoooO...',
  '..OoooooooooO...',
  '.OoeoOwwOoeooO..',
  '.OoooOwnwOoooO..',
  '.OoooOwwwOoooO..',
  'OooooooooooooO..',
  'OowooooooooooO..',
  '.OooooooooooO...',
  '..pp......pp....',
  '................',
];

const sleep0 = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..OoooooooooO...',
  '.Oo.oOwwOo.ooO..',
  '.OoooOwnwOoooO..',
  'OooooooooooooO..',
  'OooooooooooooO..',
  '.pppppppppppp...',
  '................',
];

const sleep1 = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..OoooooooooO...',
  '.Oo.oOwwOo.ooO..',
  '.OoooOwnwOoooO..',
  'OooooooooooooO..',
  'pppppppppppppp..',
  '................',
];

const biscuit: PetDefinition = {
  id: 'biscuit',
  name: 'Biscuit',
  species: 'Corgi',
  blurb: 'Loafs. Waddles. Loves treats.',
  grid: { width: 16, height: 16 },
  palette,
  animations: {
    idle: { frames: [idle0, idleBlink], fps: 2 },
    walk: { frames: [walk0, walk1], fps: 6 },
    happy: { frames: [happy0, happy1], fps: 6 },
    eat: { frames: [eat0, eat1], fps: 4 },
    sleep: { frames: [sleep0, sleep1], fps: 1 },
  },
};

export default biscuit;
