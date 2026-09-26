// Generates assets/icon.png (256x256) from the in-code paw glyph.
// Run directly or via `npm run dist` (electron-builder needs the file).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIconRgba } from '../src/main/icon.ts';
import { encodePng } from '../src/main/png.ts';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icon.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodePng(256, 256, buildIconRgba(256)));
console.log('icon ->', out);
