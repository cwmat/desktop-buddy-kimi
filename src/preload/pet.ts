// Preload for the pet window: typed, minimal IPC surface. Sandbox-compatible
// (CommonJS, contextBridge only, no nodeIntegration).

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC } from '../shared/types';
import type { PetState, Settings } from '../shared/types';
import type { PetDefinition } from '../pets/types';

export interface PetApi {
  getSettings(): Promise<Settings>;
  getPet(): Promise<PetDefinition>;
  onPetChanged(cb: (pet: PetDefinition) => void): () => void;
  onPlayState(cb: (state: PetState) => void): () => void;
  onSettingsChanged(cb: (settings: Settings) => void): () => void;
  drag(dx: number, dy: number, end: boolean): void;
}

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: PetApi = {
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  getPet: () => ipcRenderer.invoke(IPC.petCurrent),
  onPetChanged: (cb) => subscribe<PetDefinition>(IPC.petChanged, cb),
  onPlayState: (cb) => subscribe<PetState>(IPC.petState, cb),
  onSettingsChanged: (cb) => subscribe<Settings>(IPC.settingsChanged, cb),
  drag: (dx, dy, end) => ipcRenderer.send(IPC.petDrag, { dx, dy, end }),
};

contextBridge.exposeInMainWorld('petApi', api);
