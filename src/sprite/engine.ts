// Pure sprite engine: pixel-map parsing, validation, canvas drawing, animation.
// No electron/DOM imports — canvas types come from lib.dom. Unit-testable.

import type { PetState } from '../shared/types';

export type Palette = Record<string, string>; // char -> CSS color
export type PixelMap = string[]; // rows, one char per pixel; '.' and ' ' = transparent

export interface Grid {
  width: number;
  height: number;
}

export interface Animation {
  frames: PixelMap[];
  fps: number;
}

export type AnimationSet = Record<PetState, Animation>;

export const BASE_UPSCALE = 6; // pet window pixels per sprite pixel at scale 1

/** Validate one pixel-map against a palette. Throws with a clear message. */
export function validateFrame(map: PixelMap, palette: Palette, grid?: Grid): void {
  if (map.length === 0) throw new Error('frame has no rows');
  const width = map[0].length;
  if (width === 0) throw new Error('frame rows are empty');
  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    if (row.length !== width) {
      throw new Error(`frame row ${y} has length ${row.length}, expected ${width}`);
    }
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      if (!(ch in palette)) {
        throw new Error(`frame row ${y} col ${x}: char '${ch}' not in palette`);
      }
    }
  }
  if (grid && (map.length !== grid.height || width !== grid.width)) {
    throw new Error(`frame is ${width}x${map.length}, expected ${grid.width}x${grid.height}`);
  }
}

/** Validate a full animation set: every state present, >=1 frame, fps > 0, dims match grid. */
export function validateAnimations(animations: AnimationSet, palette: Palette, grid: Grid): void {
  const states: PetState[] = ['idle', 'walk', 'happy', 'eat', 'sleep'];
  for (const state of states) {
    const anim = animations[state];
    if (!anim) throw new Error(`missing animation for state '${state}'`);
    if (anim.frames.length === 0) throw new Error(`state '${state}' has no frames`);
    if (!(anim.fps > 0)) throw new Error(`state '${state}' fps must be > 0, got ${anim.fps}`);
    anim.frames.forEach((frame, i) => {
      try {
        validateFrame(frame, palette, grid);
      } catch (err) {
        throw new Error(`state '${state}' frame ${i}: ${(err as Error).message}`);
      }
    });
  }
}

/** Draw a pixel-map to a canvas context, nearest-neighbor, at pixelSize per sprite pixel. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: PixelMap,
  palette: Palette,
  pixelSize: number,
): void {
  validateFrame(frame, palette);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
}

/** Window size in screen px for a pet at a given integer scale. */
export function windowSizeFor(pet: { grid: Grid }, scale: number): { width: number; height: number } {
  const px = BASE_UPSCALE * scale;
  return { width: pet.grid.width * px, height: pet.grid.height * px };
}

/**
 * State machine animator. Loops the current state; playOnce states run their
 * frames a single time then fall back to another state.
 */
export class Animator {
  private state: PetState = 'idle';
  private frameIndex = 0;
  private elapsedMs = 0;
  private onceReturn: PetState | null = null;
  private readonly animations: AnimationSet;

  constructor(animations: AnimationSet) {
    this.animations = animations;
    for (const state of ['idle', 'walk', 'happy', 'eat', 'sleep'] as PetState[]) {
      const anim = animations[state];
      if (!anim || anim.frames.length === 0) throw new Error(`animator: bad animation for '${state}'`);
      if (!(anim.fps > 0)) throw new Error(`animator: fps must be > 0 for '${state}'`);
    }
  }

  get currentState(): PetState {
    return this.state;
  }

  /** Switch looping state (no-op if already there). */
  setState(state: PetState): void {
    if (state === this.state && this.onceReturn === null) return;
    this.state = state;
    this.frameIndex = 0;
    this.elapsedMs = 0;
    this.onceReturn = null;
  }

  /** Play a state's frames once, then return to `thenBackTo` (default 'idle'). */
  playOnce(state: PetState, thenBackTo: PetState = 'idle'): void {
    this.state = state;
    this.frameIndex = 0;
    this.elapsedMs = 0;
    this.onceReturn = thenBackTo;
  }

  /** Advance time; returns the frame to draw. */
  update(dtMs: number): PixelMap {
    const anim = this.animations[this.state];
    this.elapsedMs += Math.max(0, dtMs);
    const frameMs = 1000 / anim.fps;
    while (this.elapsedMs >= frameMs) {
      this.elapsedMs -= frameMs;
      this.frameIndex++;
      if (this.frameIndex >= anim.frames.length) {
        if (this.onceReturn !== null) {
          const backTo = this.onceReturn;
          this.setState(backTo);
          return this.animations[this.state].frames[this.frameIndex];
        }
        this.frameIndex = 0;
      }
    }
    return anim.frames[this.frameIndex];
  }

  /** Current frame without advancing time. */
  currentFrame(): PixelMap {
    return this.animations[this.state].frames[this.frameIndex];
  }
}
