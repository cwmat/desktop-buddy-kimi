// Window factories for the pet overlay and the settings window.

import { BrowserWindow, nativeImage, screen } from 'electron';
import * as path from 'node:path';
import { windowSizeFor } from '../sprite/engine';
import type { PetDefinition } from '../pets/types';
import type { Settings } from '../shared/types';
import { buildIconRgba } from './icon';
import { encodePng } from './png';

export function defaultPetPosition(size: { width: number; height: number }): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea;
  return {
    x: Math.round(area.x + (area.width - size.width) / 2),
    y: area.y + area.height - size.height,
  };
}

export function createPetWindow(pet: PetDefinition, settings: Settings): BrowserWindow {
  const size = windowSizeFor(pet, settings.scale);
  const pos = settings.homePosition ?? defaultPetPosition(size);
  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    x: pos.x,
    y: pos.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'pet.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'pet.html'));
  return win;
}

export function createSettingsWindow(isQuitting: () => boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 560,
    height: 640,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#14141b',
    // Taskbar/alt-tab icon. Generated in code — no asset file needed at runtime.
    icon: nativeImage.createFromBuffer(encodePng(64, 64, buildIconRgba(64))),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'settings.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.on('close', (event) => {
    // Frameless utility window: closing hides it; it lives until the app quits.
    if (!isQuitting()) {
      event.preventDefault();
      win.hide();
    }
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
  return win;
}
