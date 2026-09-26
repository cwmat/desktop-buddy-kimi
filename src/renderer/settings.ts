// Settings window renderer: pet cards with live idle previews, behavior /
// appearance / system controls applying live over IPC, and the Ctrl+K
// command palette (fuzzy search over the shared command registry).

import { Animator, drawFrame } from '../sprite/engine';
import { fuzzyFilter } from '../shared/fuzzy';
import type { ScoredItem } from '../shared/fuzzy';
import { buildCommands } from '../shared/commands';
import type { CommandAction, CommandSpec } from '../shared/commands';
import type { Settings } from '../shared/types';
import type { PetDefinition, PetMeta } from '../pets/types';
import type { SettingsApi } from '../preload/settings';

declare global {
  interface Window {
    settingsApi: SettingsApi;
  }
}

let settings: Settings;
let pets: PetMeta[] = [];
const petDefs = new Map<string, PetDefinition>();

// Live idle previews, one animator per pet card.
interface Preview {
  id: string;
  ctx: CanvasRenderingContext2D;
  animator: Animator;
  pixelSize: number;
  last: string[] | null;
}
const previews: Preview[] = [];

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`settings: missing #${id}`);
  return node as T;
}

function formatIdle(sec: number): string {
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m${sec % 60 ? ` ${sec % 60}s` : ''}`;
}

// ---- Pet cards ----

function buildPetCards(): void {
  const grid = el('pet-grid');
  grid.textContent = '';
  previews.length = 0;

  for (const meta of pets) {
    const def = petDefs.get(meta.id);
    if (!def) continue;

    const card = document.createElement('button');
    card.className = 'pet-card';
    card.dataset.pet = meta.id;

    const canvas = document.createElement('canvas');
    const pixelSize = 3; // 16px grid -> 48px preview
    canvas.width = def.grid.width * pixelSize;
    canvas.height = def.grid.height * pixelSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    const metaBox = document.createElement('div');
    metaBox.className = 'meta';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = meta.name;
    const species = document.createElement('div');
    species.className = 'species';
    species.textContent = meta.species;
    const blurb = document.createElement('div');
    blurb.className = 'blurb';
    blurb.textContent = meta.blurb;
    metaBox.append(name, species, blurb);
    card.append(canvas, metaBox);

    card.addEventListener('click', () => {
      void window.settingsApi.setSettings({ activePet: meta.id });
    });

    grid.appendChild(card);
    previews.push({ id: meta.id, ctx, animator: new Animator(def.animations), pixelSize, last: null });
  }
}

function syncPetCards(): void {
  document.querySelectorAll<HTMLElement>('.pet-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.pet === settings.activePet);
  });
}

let previewLast = performance.now();

function previewLoop(now: number): void {
  const dt = now - previewLast;
  previewLast = now;
  for (const p of previews) {
    const frame = p.animator.update(dt); // idle loop
    if (frame !== p.last) {
      p.last = frame;
      const def = petDefs.get(p.id);
      if (def) drawFrame(p.ctx, frame, def.palette, p.pixelSize);
    }
  }
  requestAnimationFrame(previewLoop);
}

// ---- Control sync ----

const ROAM_MODES: { mode: Settings['roamMode']; label: string }[] = [
  { mode: 'off', label: 'Stay put' },
  { mode: 'always', label: 'Always wander' },
  { mode: 'idle', label: 'When idle' },
];

// The segmented control is populated from JS — markup ships it empty.
function buildRoamSeg(): void {
  const seg = el('roam-seg');
  seg.textContent = '';
  for (const { mode, label } of ROAM_MODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.mode = mode;
    btn.addEventListener('click', () => {
      void window.settingsApi.setSettings({ roamMode: mode });
    });
    seg.appendChild(btn);
  }
}

function syncControls(): void {
  document.querySelectorAll<HTMLButtonElement>('#roam-seg button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === settings.roamMode);
  });

  const threshold = el<HTMLInputElement>('idle-slider');
  threshold.value = String(settings.idleThresholdSec);
  threshold.disabled = settings.roamMode !== 'idle';
  el('idle-val').textContent = formatIdle(settings.idleThresholdSec);

  el<HTMLInputElement>('scale-slider').value = String(settings.scale);
  el('scale-val').textContent = `${settings.scale}×`;
  el('clickthrough-toggle').setAttribute('aria-checked', String(settings.clickThrough));
  el('login-toggle').setAttribute('aria-checked', String(settings.launchOnLogin));

  syncPetCards();
}

// ---- Command palette ----

let paletteOpen = false;
let paletteSelection = 0;
let paletteItems: ScoredItem<CommandSpec>[] = [];

function runAction(action: CommandAction): void {
  const api = window.settingsApi;
  switch (action.type) {
    case 'setPet':
      void api.setSettings({ activePet: action.petId });
      break;
    case 'treat':
      api.treat();
      break;
    case 'roamMode':
      void api.setSettings({ roamMode: action.mode });
      break;
    case 'scale':
      void api.setSettings({ scale: action.scale });
      break;
    case 'toggleClickThrough':
      void api.setSettings({ clickThrough: !settings.clickThrough });
      break;
    case 'toggleLaunchOnLogin':
      void api.setSettings({ launchOnLogin: !settings.launchOnLogin });
      break;
    case 'openSettings':
      break; // already here
    case 'resetPosition':
      api.resetPosition();
      break;
    case 'quit':
      api.quit();
      break;
  }
}

function renderPaletteList(): void {
  const list = el('palette-list');
  list.textContent = '';
  if (paletteItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cmd-empty';
    empty.textContent = 'No matching commands';
    list.appendChild(empty);
    return;
  }
  paletteItems.forEach((scored, i) => {
    const item = document.createElement('div');
    item.className = `cmd${i === paletteSelection ? ' active' : ''}`;
    const label = document.createElement('span');
    label.className = 'cmd-label';
    // Wrap matched characters in <mark> (CSS accents them).
    const text = scored.item.label;
    const marks = new Set(scored.positions);
    let markEl: HTMLElement | null = null;
    for (let ci = 0; ci < text.length; ci++) {
      if (marks.has(ci)) {
        if (!markEl) {
          markEl = document.createElement('mark');
          label.appendChild(markEl);
        }
        markEl.textContent += text[ci];
      } else {
        markEl = null;
        label.appendChild(document.createTextNode(text[ci]));
      }
    }
    const kind = document.createElement('span');
    kind.className = 'cmd-section';
    kind.textContent = scored.item.section;
    item.append(label, kind);
    item.addEventListener('mouseenter', () => {
      paletteSelection = i;
      renderPaletteList();
    });
    item.addEventListener('click', () => {
      runAction(scored.item.action);
      closePalette();
    });
    list.appendChild(item);
  });
}

function refreshPalette(query: string): void {
  const commands = buildCommands(settings, pets);
  paletteItems = fuzzyFilter(query, commands, (c) => c.label);
  paletteSelection = Math.min(paletteSelection, Math.max(0, paletteItems.length - 1));
  renderPaletteList();
  const selected = document.querySelector('.cmd.active');
  selected?.scrollIntoView({ block: 'nearest' });
}

function openPalette(): void {
  paletteOpen = true;
  el('palette').classList.add('open');
  const input = el<HTMLInputElement>('palette-input');
  input.value = '';
  paletteSelection = 0;
  refreshPalette('');
  input.focus();
}

function closePalette(): void {
  paletteOpen = false;
  el('palette').classList.remove('open');
  el<HTMLInputElement>('palette-input').blur();
}

function wirePalette(): void {
  const input = el<HTMLInputElement>('palette-input');
  input.addEventListener('input', () => {
    paletteSelection = 0;
    refreshPalette(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paletteSelection = Math.min(paletteSelection + 1, paletteItems.length - 1);
      renderPaletteList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paletteSelection = Math.max(paletteSelection - 1, 0);
      renderPaletteList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = paletteItems[paletteSelection];
      if (picked) {
        runAction(picked.item.action);
        closePalette();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (paletteOpen) closePalette();
      else openPalette();
    } else if (e.key === 'Escape' && paletteOpen) {
      closePalette();
    }
  });

  document.getElementById('palette-btn')?.addEventListener('click', () => {
    if (paletteOpen) closePalette();
    else openPalette();
  });
}

// ---- Boot ----

async function boot(): Promise<void> {
  document.getElementById('close')?.addEventListener('click', () => {
    window.settingsApi.closeWindow();
  });

  settings = await window.settingsApi.getSettings();
  pets = await window.settingsApi.listPets();
  const defs = await Promise.all(pets.map((p) => window.settingsApi.getPet(p.id)));
  for (const def of defs) {
    if (def) petDefs.set(def.id, def);
  }

  buildPetCards();
  buildRoamSeg();
  syncControls();

  // Controls → live apply.
  el<HTMLInputElement>('idle-slider').addEventListener('input', (e) => {
    const sec = Number((e.target as HTMLInputElement).value);
    el('idle-val').textContent = formatIdle(sec);
    void window.settingsApi.setSettings({ idleThresholdSec: sec });
  });
  el<HTMLInputElement>('scale-slider').addEventListener('input', (e) => {
    const n = Number((e.target as HTMLInputElement).value);
    el('scale-val').textContent = `${n}×`;
    void window.settingsApi.setSettings({ scale: n });
  });
  el('clickthrough-toggle').addEventListener('click', () => {
    void window.settingsApi.setSettings({ clickThrough: !settings.clickThrough });
  });
  el('login-toggle').addEventListener('click', () => {
    void window.settingsApi.setSettings({ launchOnLogin: !settings.launchOnLogin });
  });
  el('reset-position').addEventListener('click', () => window.settingsApi.resetPosition());

  wirePalette();
  window.settingsApi.onPaletteOpen(() => openPalette());

  window.settingsApi.onSettingsChanged((next) => {
    settings = next;
    syncControls();
    if (paletteOpen) refreshPalette(el<HTMLInputElement>('palette-input').value);
  });

  // Smoke-mode readiness signal: real UI populated.
  document.body.dataset.ready = '1';

  requestAnimationFrame((now) => {
    previewLast = now;
    requestAnimationFrame(previewLoop);
  });
}

void boot();
