// App icon: 32x32 paw glyph (Biscuit orange) on a dark rounded square (#14141b).
// No imports — safe under Node's direct TS execution (scripts/gen-icon.mjs)
// and under tsc builds (window factories). Callers pair the RGBA buffer with
// encodePng from ./png, so encoding logic stays in one place.

const ICON_MAP = [
  '................................',
  '................................',
  '................................',
  '................................',
  '.....XX......XX..XX......XX.....',
  '....XXXX....XXXX..XXXX....XXXX..',
  '....XXXX....XXXX..XXXX....XXXX..',
  '....XXXX....XXXX..XXXX....XXXX..',
  '....XXXX....XXXX..XXXX....XXXX..',
  '.....XX......XX..XX......XX.....',
  '................................',
  '................................',
  '...........XXXXXXXXXX...........',
  '.........XXXXXXXXXXXXXX.........',
  '........XXXXXXXXXXXXXXXX........',
  '.......XXXXXXXXXXXXXXXXXX.......',
  '.......XXXXXXXXXXXXXXXXXX.......',
  '.......XXXXXXXXXXXXXXXXXX.......',
  '.......XXXXXXXXXXXXXXXXXX.......',
  '.......XXXXXXXXXXXXXXXXXX.......',
  '........XXXXXXXXXXXXXXXX........',
  '.........XXXXXXXXXXXXXX.........',
  '..........XXXXXXXXXXXX..........',
  '...........XXXXXXXXXX...........',
  '............XXXXXXXX............',
  '.............XXXXXX.............',
  '..............XXXX..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const FG = [0xe8, 0x91, 0x3a]; // #e8913a — same orange as the tray glyph
const BG = [0x14, 0x14, 0x1b]; // #14141b — matches the settings UI

const GRID = ICON_MAP.length; // 32

/** RGBA pixel buffer for the app icon: paw upscaled nearest-neighbor, centered. */
export function buildIconRgba(size = 256): Buffer {
  if (ICON_MAP.some((row) => row.length !== GRID)) throw new Error('icon map rows must be 32 chars');
  const rgba = Buffer.alloc(size * size * 4);
  const radius = Math.round(size * 0.18);
  const inner = size - 1;
  const scale = Math.floor((size * 0.75) / GRID); // paw occupies center 3/4
  const offset = Math.floor((size - GRID * scale) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-square mask: transparent outside the corner circles
      const dx = Math.max(radius - x - 0.5, 0, x + 0.5 - (inner - radius));
      const dy = Math.max(radius - y - 0.5, 0, y + 0.5 - (inner - radius));
      if (dx * dx + dy * dy > radius * radius) continue;

      const gx = Math.floor((x - offset) / scale);
      const gy = Math.floor((y - offset) / scale);
      const on = gx >= 0 && gx < GRID && gy >= 0 && gy < GRID && ICON_MAP[gy][gx] === 'X';
      const [r, g, b] = on ? FG : BG;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}
