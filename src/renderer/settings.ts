// Settings window renderer — Wave 1 placeholder shell: dark modern styling
// foundation, custom titlebar close button, read-only settings dump.

import type { Settings } from '../shared/types';
import type { SettingsApi } from '../preload/settings';

declare global {
  interface Window {
    settingsApi: SettingsApi;
  }
}

function render(settings: Settings): void {
  const dl = document.getElementById('settings');
  if (!dl) return;
  dl.textContent = '';
  for (const [key, value] of Object.entries(settings)) {
    const dt = document.createElement('dt');
    dt.textContent = key;
    const dd = document.createElement('dd');
    dd.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
    dl.append(dt, dd);
  }
}

async function boot(): Promise<void> {
  document.getElementById('close')?.addEventListener('click', () => {
    window.settingsApi.closeWindow();
  });
  render(await window.settingsApi.getSettings());
  window.settingsApi.onSettingsChanged(render);
}

void boot();
