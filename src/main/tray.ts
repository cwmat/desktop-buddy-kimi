// System tray: icon is a 16x16 paw glyph rendered in code to a PNG buffer
// (no asset files). Menu: Pets radio submenu, Give Treat, Settings, Quit.

import { Menu, Tray, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import type { PetMeta } from '../pets/types';
import { pngFromPixelMap } from './png';

const PAW_MAP = [
  '................',
  '..XX..XX..XX....',
  '..XX..XX..XX....',
  '..XX..XX..XX....',
  '................',
  '....XXXXXX......',
  '...XXXXXXXX.....',
  '..XXXXXXXXXX....',
  '..XXXXXXXXXX....',
  '..XXXXXXXXXX....',
  '...XXXXXXXX.....',
  '....XXXXXX......',
  '................',
  '................',
  '................',
  '................',
];

const PAW_PALETTE = { X: '#e8913a' };

export interface TrayCallbacks {
  onSelectPet: (id: string) => void;
  onTreat: () => void;
  onSettings: () => void;
  onPalette: () => void;
  onQuit: () => void;
}

export class TrayController {
  private tray: Tray | null = null;
  private readonly pets: PetMeta[];
  private activePet: string;
  private readonly callbacks: TrayCallbacks;

  constructor(pets: PetMeta[], activePet: string, callbacks: TrayCallbacks) {
    this.pets = pets;
    this.activePet = activePet;
    this.callbacks = callbacks;
  }

  create(): void {
    let image;
    try {
      image = nativeImage.createFromBuffer(pngFromPixelMap(PAW_MAP, PAW_PALETTE));
    } catch (err) {
      // Tray icon is decorative — never let it kill the app.
      console.error('tray: icon render failed:', err);
      image = nativeImage.createEmpty();
    }
    this.tray = new Tray(image);
    this.tray.setToolTip('Desktop Buddy');
    this.rebuildMenu();
  }

  setActivePet(id: string): void {
    this.activePet = id;
    this.rebuildMenu();
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  private rebuildMenu(): void {
    if (!this.tray) return;
    const petItems: MenuItemConstructorOptions[] = this.pets.map((pet) => ({
      label: `${pet.name} (${pet.species})`,
      type: 'radio',
      checked: pet.id === this.activePet,
      click: () => this.callbacks.onSelectPet(pet.id),
    }));
    const menu = Menu.buildFromTemplate([
      ...petItems,
      { type: 'separator' },
      { label: 'Give Treat', click: () => this.callbacks.onTreat() },
      { label: 'Settings', click: () => this.callbacks.onSettings() },
      { label: 'Command Palette', accelerator: 'Ctrl+K', click: () => this.callbacks.onPalette() },
      { type: 'separator' },
      { label: 'Quit', click: () => this.callbacks.onQuit() },
    ]);
    this.tray.setContextMenu(menu);
  }
}
