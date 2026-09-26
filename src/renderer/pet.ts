// Pet overlay renderer: loads the active pet, runs the animation loop, and
// wires pointer input (drag moves the window; short click plays 'happy').

import { Animator, BASE_UPSCALE, drawFrame } from '../sprite/engine';
import type { PetDefinition } from '../pets/types';
import type { PetState, Settings } from '../shared/types';
import type { PetApi } from '../preload/pet';

declare global {
  interface Window {
    petApi: PetApi;
  }
}

const canvas = document.getElementById('pet') as HTMLCanvasElement;
const ctxMaybe = canvas.getContext('2d');
if (!ctxMaybe) throw new Error('pet: no 2d canvas context');
const ctx: CanvasRenderingContext2D = ctxMaybe;

let settings: Settings;
let pet: PetDefinition;
let animator: Animator;
let pixelSize = BASE_UPSCALE;

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

// rAF loop: real dt accumulates in Animator, which honors per-state fps.
let lastTime = performance.now();
let lastFrame: string[] | null = null;

function loop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;
  const frame = animator.update(dt);
  if (frame !== lastFrame) {
    lastFrame = frame;
    drawFrame(ctx, frame, pet.palette, pixelSize);
  }
  requestAnimationFrame(loop);
}

// ---- Drag + click ----
let dragging = false;
let moved = false;
let lastX = 0;
let lastY = 0;

window.addEventListener('mousedown', (e) => {
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
