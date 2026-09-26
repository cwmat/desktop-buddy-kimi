// Pet overlay renderer: loads the active pet, runs the animation loop, and
// wires pointer input — drag moves the window, click plays 'happy',
// double-click cycles pets, right-click opens the context menu. Roaming
// states/direction arrive over IPC; treats draw a pixel bone, then 'eat'.

import { Animator, BASE_UPSCALE, drawFrame } from '../sprite/engine';
import type { PixelMap } from '../sprite/engine';
import type { PetDefinition } from '../pets/types';
import type { PetState, Settings } from '../shared/types';
import { TREAT_ANIMATION, TREAT_PALETTE } from '../shared/treat';
import type { PetApi } from '../preload/pet';

declare global {
  interface Window {
    petApi: PetApi;
  }
}

const TREAT_DURATION_MS = 1600;

const canvas = document.getElementById('pet') as HTMLCanvasElement;
const ctxMaybe = canvas.getContext('2d');
if (!ctxMaybe) throw new Error('pet: no 2d canvas context');
const ctx: CanvasRenderingContext2D = ctxMaybe;

let settings: Settings;
let pet: PetDefinition;
let animator: Animator;
let pixelSize = BASE_UPSCALE;
let facing: -1 | 1 = 1;

function sizeCanvas(): void {
  pixelSize = BASE_UPSCALE * settings.scale;
  canvas.width = pet.grid.width * pixelSize;
  canvas.height = pet.grid.height * pixelSize;
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
}

function rebuildFrames(): void {
  animator = new Animator(pet.animations);
  sizeCanvas();
}

// ---- Treat ----
// Small code-drawn bone shown in front of the pet for a beat, with 'eat'.

let treatUntil = 0;

function treatActive(now: number): boolean {
  return now < treatUntil;
}

/** Draw one pixel-map on top of the current canvas at sprite-pixel offset. */
function blit(map: PixelMap, palette: Record<string, string>, ox: number, oy: number): void {
  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect((ox + x) * pixelSize, (oy + y) * pixelSize, pixelSize, pixelSize);
    }
  }
}

function drawTreat(now: number): void {
  const frames = TREAT_ANIMATION.frames;
  const idx = Math.floor((now / 1000) * TREAT_ANIMATION.fps) % frames.length;
  // In front of the pet: toward the facing edge, resting on the ground line.
  const w = frames[0][0].length;
  const h = frames[0].length;
  const ox = facing === 1 ? pet.grid.width - w - 1 : 1;
  blit(frames[idx], TREAT_PALETTE, ox, pet.grid.height - h);
}

// ---- Loop ----
// rAF: real dt accumulates in Animator, which honors per-state fps.

let lastTime = performance.now();
let lastFrame: string[] | null = null;

function loop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;
  const frame = animator.update(dt);
  const showTreat = treatActive(now);
  if (frame !== lastFrame || showTreat) {
    lastFrame = frame;
    ctx.save();
    if (facing === -1) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    drawFrame(ctx, frame, pet.palette, pixelSize);
    ctx.restore();
    if (showTreat) drawTreat(now);
  }
  requestAnimationFrame(loop);
}

// ---- Input: drag + click + dblclick + context menu ----

let dragging = false;
let moved = false;
let lastX = 0;
let lastY = 0;

window.addEventListener('mousedown', (e) => {
  if (e.button === 2) return; // right-click: contextmenu handles it
  dragging = true;
  moved = false;
  lastX = e.screenX;
  lastY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - lastX;
  const dy = e.screenY - lastY;
  if (dx === 0 && dy === 0) return;
  lastX = e.screenX;
  lastY = e.screenY;
  moved = true;
  window.petApi.drag(dx, dy, false);
});

window.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  if (moved) {
    window.petApi.drag(0, 0, true);
  } else {
    animator.playOnce('happy', 'idle');
  }
});

window.addEventListener('dblclick', () => {
  window.petApi.cycle();
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.petApi.menu();
});

async function boot(): Promise<void> {
  settings = await window.petApi.getSettings();
  pet = await window.petApi.getPet();
  rebuildFrames();

  window.petApi.onPetChanged((next) => {
    pet = next;
    rebuildFrames();
  });

  window.petApi.onPlayState((state: PetState) => {
    if (state === 'eat' || state === 'happy') {
      animator.playOnce(state, 'idle');
    } else {
      animator.setState(state);
    }
  });

  window.petApi.onTreat(() => {
    treatUntil = performance.now() + TREAT_DURATION_MS;
    animator.playOnce('eat', 'idle');
  });

  window.petApi.onDirection((dir) => {
    facing = dir;
  });

  window.petApi.onSettingsChanged((next) => {
    const scaleChanged = next.scale !== settings.scale;
    settings = next;
    if (scaleChanged) sizeCanvas();
  });

  requestAnimationFrame((now) => {
    lastTime = now;
    requestAnimationFrame(loop);
  });
}

void boot();
