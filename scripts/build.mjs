// Bundles renderer scripts (IIFE) and preload scripts (CJS, sandboxed — no local
// requires allowed) with esbuild, and copies HTML.
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const rendererOut = join('dist', 'renderer');
const preloadOut = join('dist', 'preload');
await mkdir(rendererOut, { recursive: true });
await mkdir(preloadOut, { recursive: true });

for (const entry of ['pet', 'settings']) {
  await build({
    entryPoints: [join('src', 'renderer', `${entry}.ts`)],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: join(rendererOut, `${entry}.js`),
    logLevel: 'warning',
  });
  await copyFile(join('src', 'renderer', `${entry}.html`), join(rendererOut, `${entry}.html`));

  await build({
    entryPoints: [join('src', 'preload', `${entry}.ts`)],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['electron'],
    outfile: join(preloadOut, `${entry}.js`),
    logLevel: 'warning',
  });
}

console.log('renderer bundles -> dist/renderer/, preload bundles -> dist/preload/');
