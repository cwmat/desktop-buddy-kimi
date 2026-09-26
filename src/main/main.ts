// Main process: single instance, pet window + settings window + tray, IPC,
// live-apply settings, manual drag, roaming, context menu, smoke mode.

import { app, ipcMain, Menu } from 'electron';
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PETS, petMetaList } from '../pets';
import type { PetDefinition } from '../pets/types';
import { windowSizeFor } from '../sprite/engine';
import { IPC, PET_STATES } from '../shared/types';
import type { PetState, Settings } from '../shared/types';
import { SettingsStore } from './store';
import { createPetWindow, createSettingsWindow, defaultPetPosition } from './windows';
import { TrayController } from './tray';
import { RoamController } from './roam';

const SMOKE_MODE = process.argv.includes('--smoke');

let petWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: TrayController | null = null;
let roam: RoamController | null = null;
let store: SettingsStore;
let quitting = false;

function currentPet(): PetDefinition {
  const settings = store.get();
  return PETS[settings.activePet] ?? PETS.biscuit;
}

/** Resize around the bottom-center: feet stay on the same ground line. */
function resizePetWindow(): void {
  if (!petWindow) return;
  const bounds = petWindow.getBounds();
  const size = windowSizeFor(currentPet(), store.get().scale);
  const cx = bounds.x + bounds.width / 2;
  const bottom = bounds.y + bounds.height;
  petWindow.setBounds({
    x: Math.round(cx - size.width / 2),
    y: Math.round(bottom - size.height),
    width: size.width,
    height: size.height,
  });
}

function applySettings(next: Settings, prev: Settings): void {
  if (next.scale !== prev.scale || next.activePet !== prev.activePet) {
    resizePetWindow(); // size depends on both; re-anchor on the ground line
  }
  if (next.activePet !== prev.activePet) {
    petWindow?.webContents.send(IPC.petChanged, currentPet());
    tray?.setActivePet(next.activePet);
  }
  if (next.clickThrough !== prev.clickThrough) {
    // forward: true keeps hover events flowing so the pet can still be
    // re-enabled from the tray; clicks pass through to windows beneath.
    petWindow?.setIgnoreMouseEvents(next.clickThrough, { forward: true });
  }
  if (next.launchOnLogin !== prev.launchOnLogin) {
    try {
      app.setLoginItemSettings({ openAtLogin: next.launchOnLogin });
    } catch (err) {
      // Not supported on all platforms/desktops — degrade gracefully.
      console.error('settings: setLoginItemSettings failed:', err);
    }
  }
  if (next.roamMode !== prev.roamMode || next.idleThresholdSec !== prev.idleThresholdSec) {
    roam?.onSettingsChanged();
  }
  petWindow?.webContents.send(IPC.settingsChanged, next);
  settingsWindow?.webContents.send(IPC.settingsChanged, next);
}

function updateSettings(patch: Partial<Settings>): Settings {
  const prev = store.get();
  const next = store.set(patch);
  applySettings(next, prev);
  return next;
}

function giveTreat(): void {
  // The pet renderer owns the treat visuals (drawn in front, then 'eat').
  petWindow?.webContents.send(IPC.petTreat);
}

function cyclePet(): void {
  const ids = Object.keys(PETS);
  if (ids.length === 0) return;
  const cur = store.get().activePet;
  const next = ids[(ids.indexOf(cur) + 1) % ids.length] ?? ids[0];
  updateSettings({ activePet: next });
}

function resetPetPosition(): void {
  if (!petWindow) return;
  const pos = defaultPetPosition(windowSizeFor(currentPet(), store.get().scale));
  petWindow.setPosition(pos.x, pos.y);
  updateSettings({ homePosition: pos });
}

function quitApp(): void {
  quitting = true;
  app.quit();
}

function toggleSettingsWindow(): void {
  if (!settingsWindow) return;
  if (settingsWindow.isVisible()) {
    settingsWindow.hide();
  } else {
    settingsWindow.show();
    settingsWindow.focus();
  }
}

/** Palette lives in the settings window: surface it, then tell the renderer. */
function openPalette(): void {
  if (!settingsWindow) return;
  settingsWindow.show();
  settingsWindow.focus();
  settingsWindow.webContents.send(IPC.paletteOpen);
}

function popupPetMenu(): void {
  if (!petWindow) return;
  const s = store.get();
  const menu = Menu.buildFromTemplate([
    {
      label: 'Swap Pet',
      submenu: petMetaList().map((pet) => ({
        label: `${pet.name} (${pet.species})`,
        type: 'radio' as const,
        checked: pet.id === s.activePet,
        click: () => updateSettings({ activePet: pet.id }),
      })),
    },
    { label: 'Give Treat', click: giveTreat },
    {
      label: 'Roam Mode',
      submenu: (['off', 'always', 'idle'] as const).map((mode) => ({
        label: mode === 'off' ? 'Stay put' : mode === 'always' ? 'Always wander' : "Only when I'm idle",
        type: 'radio' as const,
        checked: s.roamMode === mode,
        click: () => updateSettings({ roamMode: mode }),
      })),
    },
    {
      label: 'Scale',
      submenu: [1, 2, 3, 4].map((n) => ({
        label: `${n}×`,
        type: 'radio' as const,
        checked: s.scale === n,
        click: () => updateSettings({ scale: n }),
      })),
    },
    { type: 'separator' },
    { label: 'Settings', click: () => toggleSettingsWindow() },
    { label: 'Command Palette', click: () => openPalette() },
    { label: 'Quit', click: () => quitApp() },
  ]);
  menu.popup({ window: petWindow });
}

function registerIpc(): void {
  ipcMain.handle(IPC.settingsGet, (): Settings => store.get());

  ipcMain.handle(IPC.settingsSet, (_e: IpcMainInvokeEvent, patch: Partial<Settings>): Settings => {
    return updateSettings(patch ?? {});
  });

  ipcMain.handle(IPC.petsList, () => petMetaList());
  ipcMain.handle(IPC.petsDetail, (_e: IpcMainInvokeEvent, id: string) => PETS[id] ?? null);
  ipcMain.handle(IPC.petCurrent, () => currentPet());

  ipcMain.on(IPC.petTreat, () => giveTreat());

  ipcMain.on(IPC.petState, (_e: IpcMainEvent, state: PetState) => {
    if (!PET_STATES.includes(state)) return;
    petWindow?.webContents.send(IPC.petState, state);
  });

  ipcMain.on(IPC.petDrag, (_e: IpcMainEvent, payload: { dx?: number; dy?: number; end?: boolean }) => {
    if (!petWindow || !payload) return;
    if (payload.end) {
      const [x, y] = petWindow.getPosition();
      roam?.endDrag({ x, y });
      return;
    }
    const dx = payload.dx ?? 0;
    const dy = payload.dy ?? 0;
    if (dx === 0 && dy === 0) return;
    roam?.beginDrag();
    const [x, y] = petWindow.getPosition();
    petWindow.setPosition(Math.round(x + dx), Math.round(y + dy));
  });

  ipcMain.on(IPC.petMenu, () => popupPetMenu());
  ipcMain.on(IPC.petCycle, () => cyclePet());
  ipcMain.on(IPC.windowsToggleSettings, () => toggleSettingsWindow());
  ipcMain.on(IPC.appResetPosition, () => resetPetPosition());
  ipcMain.on(IPC.appQuit, () => quitApp());
}

function createAllWindows(): void {
  const settings = store.get();
  petWindow = createPetWindow(currentPet(), settings);
  settingsWindow = createSettingsWindow(() => quitting);

  petWindow.on('closed', () => {
    petWindow = null;
    if (!quitting) app.quit();
  });
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  roam = new RoamController({
    getWindow: () => petWindow,
    getSettings: () => store.get(),
    isQuitting: () => quitting,
    sendState: (state) => petWindow?.webContents.send(IPC.petState, state),
    sendDirection: (dir) => petWindow?.webContents.send(IPC.petDirection, dir),
    persistHome: (pos) => {
      store.set({ homePosition: pos });
    },
  });
  roam.start();

  tray = new TrayController(petMetaList(), settings.activePet, {
    onSelectPet: (id) => updateSettings({ activePet: id }),
    onTreat: giveTreat,
    onSettings: () => toggleSettingsWindow(),
    onPalette: () => openPalette(),
    onQuit: () => quitApp(),
  });
  try {
    tray.create();
  } catch (err) {
    // Headless / no system tray: the app still works via IPC.
    console.error('tray: create failed, continuing without tray:', err);
    tray = null;
  }
}

// ---- Smoke mode ----

function smokeFail(err: unknown): void {
  console.error('SMOKE_FAIL', err instanceof Error ? err.message : String(err));
  app.exit(1);
}

/** Poll a renderer-side expression until truthy (renderer boot signal). */
async function waitForJs(wc: WebContents, expression: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await wc.executeJavaScript(expression)) return;
    } catch {
      // renderer not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for: ${expression}`);
}

async function runSmoke(): Promise<void> {
  const smokeDir = path.join(app.getAppPath(), 'smoke');
  fs.mkdirSync(smokeDir, { recursive: true });

  if (!petWindow || !settingsWindow) {
    smokeFail(new Error('windows were not created'));
    return;
  }

  // Deterministic captures: no wandering mid-shot (smoke already persists
  // settings — it leaves the last captured pet active).
  updateSettings({ roamMode: 'off' });

  await Promise.all([
    new Promise<void>((resolve) => {
      if (petWindow!.webContents.isLoading()) {
        petWindow!.webContents.once('did-finish-load', () => resolve());
      } else resolve();
    }),
    new Promise<void>((resolve) => {
      if (settingsWindow!.webContents.isLoading()) {
        settingsWindow!.webContents.once('did-finish-load', () => resolve());
      } else resolve();
    }),
  ]);

  for (const id of Object.keys(PETS)) {
    updateSettings({ activePet: id });
    await new Promise((r) => setTimeout(r, 1000));
    const image = await petWindow.webContents.capturePage();
    fs.writeFileSync(path.join(smokeDir, `pet-${id}.png`), image.toPNG());
  }

  // Settings window populated with the real UI (pet cards + live previews).
  settingsWindow.show();
  await waitForJs(settingsWindow.webContents, "document.body?.dataset.ready === '1'");
  await new Promise((r) => setTimeout(r, 700)); // previews animate a few frames
  const settingsImage = await settingsWindow.webContents.capturePage();
  fs.writeFileSync(path.join(smokeDir, 'settings.png'), settingsImage.toPNG());

  console.log('SMOKE_OK');
  app.exit(0);
}

// ---- Lifecycle ----

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (settingsWindow) {
      settingsWindow.show();
      settingsWindow.focus();
    }
  });

  void app.whenReady().then(async () => {
    store = new SettingsStore();
    registerIpc();
    createAllWindows();

    if (SMOKE_MODE) {
      try {
        await runSmoke();
      } catch (err) {
        smokeFail(err);
      }
    }
  });

  app.on('window-all-closed', () => {
    // Tray app: keep running until Quit is chosen.
    if (quitting) app.quit();
  });

  app.on('before-quit', () => {
    quitting = true;
    roam?.stop();
    tray?.destroy();
  });
}
