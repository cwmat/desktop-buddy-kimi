// Minimal PNG encoder + pixel-map rasterizer. No electron imports — pure Node,
// so tests can exercise it via native type stripping.

import zlib from 'node:zlib';

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Encode an RGBA buffer (width*height*4 bytes) as a PNG. */
export function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  if (rgba.length !== width * height * 4) {
    throw new Error(`rgba buffer is ${rgba.length} bytes, expected ${width * height * 4}`);
  }
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // compression/filter/interlace stay 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function hexToRgba(hex: string): [number, number, number, number] {
  const m = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(hex);
  if (!m) throw new Error(`bad hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  const a = m[2] ? parseInt(m[2], 16) : 255;
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, a];
}

/** Rasterize a pixel-map ('.'/' ' = transparent) into a PNG at 1px per cell. */
export function pngFromPixelMap(map: string[], palette: Record<string, string>): Buffer {
  if (map.length === 0) throw new Error('pixel map has no rows');
  const width = map[0].length;
  const height = map.length;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    if (map[y].length !== width) throw new Error(`row ${y} has length ${map[y].length}, expected ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = map[y][x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) throw new Error(`char '${ch}' at ${x},${y} not in palette`);
      const [r, g, b, a] = hexToRgba(color);
      const i = (y * width + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return encodePng(width, height, rgba);
}
