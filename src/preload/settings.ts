// Preload for the settings window. Sandbox-compatible CommonJS.

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC } from '../shared/types';
import type { Settings } from '../shared/types';
import type { PetDefinition, PetMeta } from '../pets/types';

export interface SettingsApi {
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
  listPets(): Promise<PetMeta[]>;
  /** Full definition (sprites included) for live preview canvases. */
  getPet(id: string): Promise<PetDefinition>;
  closeWindow(): void;
  onSettingsChanged(cb: (settings: Settings) => void): () => void;
  /** Main asks the settings window to open the command palette. */
  onPaletteOpen(cb: () => void): () => void;
  resetPosition(): void;
  quit(): void;
  /** Forward a treat to the pet overlay. */
  treat(): void;
}

const api: SettingsApi = {
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  setSettings: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch),
  listPets: () => ipcRenderer.invoke(IPC.petsList),
  getPet: (id) => ipcRenderer.invoke(IPC.petsDetail, id),
  closeWindow: () => ipcRenderer.send(IPC.windowsToggleSettings),
  onSettingsChanged: (cb) => {
    const listener = (_event: IpcRendererEvent, settings: Settings) => cb(settings);
    ipcRenderer.on(IPC.settingsChanged, listener);
    return () => {
      ipcRenderer.removeListener(IPC.settingsChanged, listener);
    };
  },
  onPaletteOpen: (cb) => {
    const listener = () => cb();
    ipcRenderer.on(IPC.paletteOpen, listener);
    return () => {
      ipcRenderer.removeListener(IPC.paletteOpen, listener);
    };
  },
  resetPosition: () => ipcRenderer.send(IPC.appResetPosition),
  quit: () => ipcRenderer.send(IPC.appQuit),
  treat: () => ipcRenderer.send(IPC.petTreat),
};

contextBridge.exposeInMainWorld('settingsApi', api);
