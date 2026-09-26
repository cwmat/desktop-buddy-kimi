// Shared types + constants, importable from main, preload, and renderer.

export type RoamMode = 'off' | 'always' | 'idle';

export type PetState = 'idle' | 'walk' | 'happy' | 'eat' | 'sleep';

export const PET_STATES: readonly PetState[] = ['idle', 'walk', 'happy', 'eat', 'sleep'];

export interface Settings {
  activePet: string; // pet id
  scale: number; // 1 | 2 | 3 | 4
  roamMode: RoamMode;
  idleThresholdSec: number; // default 120
  clickThrough: boolean; // default false
  launchOnLogin: boolean; // default false
  homePosition: { x: number; y: number } | null;
}

export const DEFAULT_SETTINGS: Settings = {
  activePet: 'biscuit',
  scale: 2,
  roamMode: 'off',
  idleThresholdSec: 120,
  clickThrough: false,
  launchOnLogin: false,
  homePosition: null,
};

// IPC channel names (single source of truth).
export const IPC = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsChanged: 'settings:changed',
  petTreat: 'pet:treat',
  petState: 'pet:state',
  petChanged: 'pet:changed',
  petDrag: 'pet:drag',
  petsList: 'pets:list',
  petCurrent: 'pet:current',
  windowsToggleSettings: 'windows:toggleSettings',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
