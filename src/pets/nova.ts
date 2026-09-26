import type { PetDefinition } from './types';

// Nova the Dragon: purple, folded wings that rise beside the head, a tail
// that curls out at the base, little horns.
// p = purple body, P = deep-purple outline, w = wing lavender, b = belly,
// h = horn, e = eye, s = sparkle
const palette = {
  p: '#9b6bf0',
  P: '#4b2a86',
  w: '#c9b2ff',
  b: '#e4d6ff',
  h: '#ffd97a',
  e: '#221040',
  s: '#fff3c4',
};

// 16x16 frames. Rows must each be exactly 16 chars.

const idle0 = [
  '................',
  'P....h....h....P',
  'PwP..Ph..hP..PwP',
  'PwwP.PppppP.PwwP',
  'PwwPPppppppPPwwP',
  'PwwPPpeppepPPwwP',
  'PwwPppppppppPwwP',
  'PwwPpbbbbbbpPwwP',
  'PwwPpbbbbbbpPwwP',
  '.PwPpbbbbbbpPwP.',
  '.P.PppbbbbppP.P.',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '....PP....PP....',
  '................',
];

const idleBlink = [
  '................',
  'P....h....h....P',
  'PwP..Ph..hP..PwP',
  'PwwP.PppppP.PwwP',
  'PwwPPppppppPPwwP',
  'PwwPPp.pp.pPPwwP',
  'PwwPppppppppPwwP',
  'PwwPpbbbbbbpPwwP',
  'PwwPpbbbbbbpPwwP',
  '.PwPpbbbbbbpPwP.',
  '.P.PppbbbbppP.P.',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '....PP....PP....',
  '................',
];

const walk0 = [
  'P..............P',
  'PwP..h....h..PwP',
  'PwwP.Ph..hP.PwwP',
  '.PwwPPppppPPwwP.',
  '..PwPppppppPwP..',
  '..P.PpeppepP.P..',
  '...PppppppppP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PppbbbbppP...',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '..PP........PP..',
  '................',
];

const walk1 = [
  '................',
  'P....h....h....P',
  'PwP..Ph..hP..PwP',
  'PwwP.PppppP.PwwP',
  'PwwPPppppppPPwwP',
  'PwwPPpeppepPPwwP',
  'PwwPppppppppPwwP',
  'PwwPpbbbbbbpPwwP',
  'PwwPpbbbbbbpPwwP',
  '.PwPpbbbbbbpPwP.',
  '.P.PppbbbbppP.P.',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '.....PP..PP.....',
  '................',
];

const happy0 = [
  'Ps............sP',
  'PwP..h....h..PwP',
  'PwwP.Ph..hP.PwwP',
  '.PwwPPppppPPwwP.',
  '..PwPppppppPwP..',
  '..P.PpeppepP.P..',
  '...PppppppppP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PppbbbbppP...',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '....PP....PP....',
  '................',
];

const happy1 = [
  '................',
  'P....h....h....P',
  'PwP..Ph..hP..PwP',
  'PwwP.PppppP.PwwP',
  'PwwPPppppppPPwwP',
  'PwwPPpeppepPPwwP',
  'PwwPppppppppPwwP',
  'PwwPpbbbbbbpPwwP',
  'PwwPpbbbbbbpPwwP',
  '.PwPpbbbbbbpPwP.',
  '.P.PppbbbbppP.P.',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '..PP........PP..',
  '................',
];

const eat0 = [
  '................',
  '.....h....h.....',
  '....Ph....hP....',
  '.....PppppP.....',
  '....PppppppP....',
  '....PpeppepP....',
  '...PppppppppP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PppbbbbppP...',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
  '....PP....PP....',
  '................',
];

const eat1 = [
  '................',
  '................',
  '.....h....h.....',
  '....Ph....hP....',
  '.....PppppP.....',
  '....PppppppP....',
  '....PpeppepP....',
  '...PppppppppP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PpbbbbbbpP...',
  '...PppbbbbppP...',
  '...PppppppppPPpP',
  '...PppppppppP.PP',
  '...PPPPPPPPPP.P.',
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
  '...........s....',
  '....Ph....hP....',
  '...PppppppppP...',
  '..Pp.pppppp.pP..',
  '.PwwwwwwwwwwwwP.',
  '.PpppppppppppPpP',
  '..PPPPPPPPPPPPP.',
  '................',
  '................',
];

const sleep1 = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '............s...',
  '................',
  '................',
  '....Ph....hP....',
  '...PppppppppP...',
  '..Pp.pppppp.pP..',
  '.PwwwwwwwwwwwwP.',
  '.PpppppppppppPpP',
  '..PPPPPPPPPPPPP.',
  '................',
];

const nova: PetDefinition = {
  id: 'nova',
  name: 'Nova',
  species: 'Dragon',
  blurb: 'Smol purple dragon. Big dreams.',
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

export default nova;
