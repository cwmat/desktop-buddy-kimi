// Tiny JSON settings store backed by app.getPath('userData')/settings.json.
// Merge/validation logic lives in ../shared/settings (pure, unit-tested).

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_SETTINGS } from '../shared/types';
import type { Settings } from '../shared/types';
import { applyPatch, mergeSettings } from '../shared/settings';

export type SettingsListener = (settings: Settings) => void;

export class SettingsStore {
  private settings: Settings;
  private readonly listeners = new Set<SettingsListener>();
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.load();
  }

  private load(): Settings {
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return mergeSettings(DEFAULT_SETTINGS, raw);
    } catch {
      return mergeSettings(DEFAULT_SETTINGS, null);
    }
  }

  get(): Settings {
    return structuredClone(this.settings);
  }

  set(patch: unknown): Settings {
    this.settings = applyPatch(this.settings, patch);
    this.persist();
    for (const listener of this.listeners) listener(this.get());
    return this.get();
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('settings: persist failed:', err);
    }
  }
}
