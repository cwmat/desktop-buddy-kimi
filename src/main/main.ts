// Main process: single instance, pet window + settings window + tray, IPC,
// live-apply settings, manual drag, smoke mode.

import { app, ipcMain, powerMonitor, screen } from 'electron';
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PETS, petMetaList } from '../pets';
import type { PetDefinition } from '../pets/types';
import { windowSizeFor } from '../sprite/engine';
import { IPC, PET_STATES } from '../shared/types';
import type { PetState, Settings } from '../shared/types';
import { SettingsStore } from './store';
import { createPetWindow, createSettingsWindow } from './windows';
import { TrayController } from './tray';

const SMOKE_MODE = process.argv.includes('--smoke');

let petWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: TrayController | null = null;
let store: SettingsStore;
let quitting = false;

function currentPet(): PetDefinition {
  const settings = store.get();
  return PETS[settings.activePet] ?? PETS.biscuit;
}

function resizePetWindow(): void {
  if (!petWindow) return;
  const size = windowSizeFor(currentPet(), store.get().scale);
  petWindow.setSize(size.width, size.height);
}

function applySettings(next: Settings, prev: Settings): void {
  if (next.scale !== prev.scale) {
    resizePetWindow();
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
  petWindow?.webContents.send(IPC.settingsChanged, next);
  settingsWindow?.webContents.send(IPC.settingsChanged, next);
}

function updateSettings(patch: Partial<Settings>): Settings {
  const prev = store.get();
  const next = store.set(patch);
  applySettings(next, prev);
  return next;
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

function registerIpc(): void {
  ipcMain.handle(IPC.settingsGet, (): Settings => store.get());

  ipcMain.handle(IPC.settingsSet, (_e: IpcMainInvokeEvent, patch: Partial<Settings>): Settings => {
    return updateSettings(patch ?? {});
  });

  ipcMain.handle(IPC.petsList, () => petMetaList());
  ipcMain.handle(IPC.petCurrent, () => currentPet());

  ipcMain.on(IPC.petTreat, () => {
    petWindow?.webContents.send(IPC.petState, 'eat' satisfies PetState);
  });

  ipcMain.on(IPC.petState, (_e: IpcMainEvent, state: PetState) => {
    if (!PET_STATES.includes(state)) return;
    petWindow?.webContents.send(IPC.petState, state);
  });

  ipcMain.on(IPC.petDrag, (_e: IpcMainEvent, payload: { dx?: number; dy?: number; end?: boolean }) => {
    if (!petWindow) return;
    const [x, y] = petWindow.getPosition();
    const nx = Math.round(x + (payload?.dx ?? 0));
    const ny = Math.round(y + (payload?.dy ?? 0));
    petWindow.setPosition(nx, ny);
    if (payload?.end) {
      store.set({ homePosition: { x: nx, y: ny } });
    }
  });

  ipcMain.on(IPC.windowsToggleSettings, () => toggleSettingsWindow());
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

  tray = new TrayController(petMetaList(), settings.activePet, {
    onSelectPet: (id) => updateSettings({ activePet: id }),
    onTreat: () => petWindow?.webContents.send(IPC.petState, 'eat' satisfies PetState),
    onSettings: () => toggleSettingsWindow(),
    onQuit: () => {
      quitting = true;
      app.quit();
    },
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

async function runSmoke(): Promise<void> {
  const smokeDir = path.join(app.getAppPath(), 'smoke');
  fs.mkdirSync(smokeDir, { recursive: true });

  if (!petWindow || !settingsWindow) {
    smokeFail(new Error('windows were not created'));
    return;
  }

  // Wait for both renderers to finish loading.
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

  settingsWindow.show();
  await new Promise((r) => setTimeout(r, 500));
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

    // Idle-time polling groundwork (roam modes land in a later wave).
    void powerMonitor.getSystemIdleTime();
    void screen.getPrimaryDisplay();

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
    tray?.destroy();
  });
}
