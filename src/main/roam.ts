// Roam controller: drives the pet window per settings.roamMode.
//  - off:    pet stays where the user put it.
//  - always: continuous wandering along the bottom of the current display.
//  - idle:   wanders once the system idle time passes the threshold; walks
//            back home when the user returns.
// Dragging pauses everything. Only cross-platform electron APIs are used, so
// macOS/Linux degrade gracefully by construction.

import { powerMonitor, screen } from 'electron';
import type { BrowserWindow } from 'electron';
import type { Settings } from '../shared/types';
import { floorY, pickWaypoint, stepIntervalMs, stepToward } from '../shared/roamMath';
import type { Rect } from '../shared/roamMath';

const IDLE_POLL_MS = 2000;
const MIN_PAUSE_MS = 1200;
const PAUSE_SPAN_MS = 2400;

export interface RoamHost {
  getWindow(): BrowserWindow | null;
  getSettings(): Settings;
  isQuitting(): boolean;
  /** Tell the pet renderer which looping state to show. */
  sendState(state: 'walk' | 'idle'): void;
  /** Tell the pet renderer which way to face (1 right, -1 left). */
  sendDirection(dir: -1 | 1): void;
  persistHome(pos: { x: number; y: number }): void;
}

type Phase = 'stopped' | 'walking' | 'pausing' | 'returning';

export class RoamController {
  private readonly host: RoamHost;
  private phase: Phase = 'stopped';
  private dragging = false;
  private targetX = 0;
  private groundY = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private idlePoll: ReturnType<typeof setInterval> | null = null;
  private readonly rand: () => number;

  constructor(host: RoamHost, rand: () => number = Math.random) {
    this.host = host;
    this.rand = rand;
  }

  /** Begin driving. Call once after windows exist. */
  start(): void {
    this.idlePoll = setInterval(() => {
      // Only idle mode needs the poll; 'always' runs on its own loop.
      if (this.host.getSettings().roamMode === 'idle') this.evaluate();
    }, IDLE_POLL_MS);
    this.evaluate();
  }

  /** Stop all movement/timers (app teardown). */
  stop(): void {
    this.clearTimer();
    if (this.idlePoll) clearInterval(this.idlePoll);
    this.idlePoll = null;
    this.phase = 'stopped';
  }

  /** Re-decide what the pet should be doing (settings changed, drag ended, poll tick). */
  evaluate(): void {
    if (this.host.isQuitting() || this.dragging) return;
    const settings = this.host.getSettings();
    if (settings.roamMode === 'off') {
      this.halt();
      return;
    }
    const wantWander =
      settings.roamMode === 'always' || powerMonitor.getSystemIdleTime() >= settings.idleThresholdSec;
    if (wantWander) {
      if (this.phase === 'stopped' || this.phase === 'returning') this.startWalk();
      // walking/pausing carry on
    } else if (this.phase === 'walking' || this.phase === 'pausing') {
      // Idle mode and the user came back: head home and settle.
      this.startReturnHome();
    }
  }

  onSettingsChanged(): void {
    this.evaluate();
  }

  /** Drag in progress: pause roaming immediately (idempotent). */
  beginDrag(): void {
    if (this.dragging) return;
    this.dragging = true;
    this.clearTimer();
    this.phase = 'stopped';
    this.host.sendState('idle');
  }

  /** Drag finished at the window's final position. */
  endDrag(pos: { x: number; y: number }): void {
    this.dragging = false;
    if (this.host.getSettings().roamMode === 'off') {
      this.host.persistHome(pos);
    }
    this.evaluate();
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  // ---- internals ----

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private halt(): void {
    if (this.phase === 'stopped') return;
    this.clearTimer();
    this.phase = 'stopped';
    this.host.sendState('idle');
  }

  private workAreaFor(win: BrowserWindow): Rect | null {
    try {
      return screen.getDisplayMatching(win.getBounds()).workArea;
    } catch {
      return null; // display gone (unplugged) — try again next beat
    }
  }

  private startWalk(): void {
    const win = this.host.getWindow();
    if (!win || win.isDestroyed()) {
      this.phase = 'stopped';
      return;
    }
    const area = this.workAreaFor(win);
    if (!area) {
      this.phase = 'stopped';
      return;
    }
    const bounds = win.getBounds();
    this.groundY = floorY(area, bounds.height);
    this.targetX = pickWaypoint(area, bounds.width, bounds.x, this.rand);
    if (this.targetX === bounds.x) {
      this.startPause();
      return;
    }
    this.phase = 'walking';
    this.host.sendDirection(this.targetX > bounds.x ? 1 : -1);
    this.host.sendState('walk');
    this.scheduleStep();
  }

  private startReturnHome(): void {
    const win = this.host.getWindow();
    const home = this.host.getSettings().homePosition;
    if (!win || win.isDestroyed() || !home) {
      this.halt();
      return;
    }
    const [x] = win.getPosition();
    if (x === home.x) {
      this.halt();
      return;
    }
    this.clearTimer();
    this.phase = 'returning';
    this.targetX = home.x;
    this.groundY = home.y;
    this.host.sendDirection(this.targetX > x ? 1 : -1);
    this.host.sendState('walk');
    this.scheduleStep();
  }

  private startPause(): void {
    this.clearTimer();
    this.phase = 'pausing';
    this.host.sendState('idle');
    const wait = MIN_PAUSE_MS + this.rand() * PAUSE_SPAN_MS;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.phase === 'pausing') this.evaluate();
    }, wait);
  }

  private scheduleStep(): void {
    const scale = this.host.getSettings().scale;
    this.timer = setTimeout(() => this.step(), stepIntervalMs(scale));
  }

  private step(): void {
    this.timer = null;
    if (this.phase !== 'walking' && this.phase !== 'returning') return;
    const win = this.host.getWindow();
    if (!win || win.isDestroyed()) {
      this.phase = 'stopped';
      return;
    }
    const [x] = win.getPosition();
    const { next } = stepToward(x, this.targetX, this.host.getSettings().scale + 1);
    try {
      win.setPosition(next, this.groundY);
    } catch {
      this.phase = 'stopped';
      return;
    }
    if (next === this.targetX) {
      if (this.phase === 'returning') {
        this.halt(); // settled back home
      } else {
        this.startPause();
      }
      return;
    }
    this.scheduleStep();
  }
}
