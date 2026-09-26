// Preload for the settings window. Sandbox-compatible CommonJS.

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC } from '../shared/types';
import type { Settings } from '../shared/types';
import type { PetMeta } from '../pets/types';

export interface SettingsApi {
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
  listPets(): Promise<PetMeta[]>;
  closeWindow(): void;
  onSettingsChanged(cb: (settings: Settings) => void): () => void;
}

const api: SettingsApi = {
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  setSettings: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch),
  listPets: () => ipcRenderer.invoke(IPC.petsList),
  closeWindow: () => ipcRenderer.send(IPC.windowsToggleSettings),
  onSettingsChanged: (cb) => {
    const listener = (_event: IpcRendererEvent, settings: Settings) => cb(settings);
    ipcRenderer.on(IPC.settingsChanged, listener);
    return () => {
      ipcRenderer.removeListener(IPC.settingsChanged, listener);
    };
  },
};

contextBridge.exposeInMainWorld('settingsApi', api);
