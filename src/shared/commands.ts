// Command registry for the command palette. Pure builders — the renderer maps
// actions to IPC. Labels embed current state ("Click-through: off").

import type { RoamMode, Settings } from './types';
import type { PetMeta } from '../pets/types';

export type CommandAction =
  | { type: 'setPet'; petId: string }
  | { type: 'treat' }
  | { type: 'roamMode'; mode: RoamMode }
  | { type: 'scale'; scale: number }
  | { type: 'toggleClickThrough' }
  | { type: 'toggleLaunchOnLogin' }
  | { type: 'openSettings' }
  | { type: 'resetPosition' }
  | { type: 'quit' };

export interface CommandSpec {
  id: string;
  label: string;
  section: 'Pet' | 'Behavior' | 'Appearance' | 'System';
  action: CommandAction;
}

const ROAM_LABELS: Record<RoamMode, string> = {
  off: 'Stay put',
  always: 'Always wander',
  idle: "Only when I'm idle",
};

function onOff(v: boolean): string {
  return v ? 'on' : 'off';
}

/** Build the full command list for the current state. Current selections are
 *  marked "(current)"; toggles show their live value in the label. */
export function buildCommands(settings: Settings, pets: readonly PetMeta[]): CommandSpec[] {
  const commands: CommandSpec[] = [];

  for (const pet of pets) {
    commands.push({
      id: `pet:${pet.id}`,
      label: `Swap to ${pet.name} (${pet.species})${pet.id === settings.activePet ? ' (current)' : ''}`,
      section: 'Pet',
      action: { type: 'setPet', petId: pet.id },
    });
  }
  commands.push({
    id: 'pet:treat',
    label: 'Give Treat',
    section: 'Pet',
    action: { type: 'treat' },
  });

  for (const mode of ['off', 'always', 'idle'] as const) {
    commands.push({
      id: `roam:${mode}`,
      label: `Roam: ${ROAM_LABELS[mode]}${mode === settings.roamMode ? ' (current)' : ''}`,
      section: 'Behavior',
      action: { type: 'roamMode', mode },
    });
  }

  for (const scale of [1, 2, 3, 4]) {
    commands.push({
      id: `scale:${scale}`,
      label: `Scale ${scale}×${scale === settings.scale ? ' (current)' : ''}`,
      section: 'Appearance',
      action: { type: 'scale', scale },
    });
  }
  commands.push({
    id: 'clickthrough',
    label: `Click-through: ${onOff(settings.clickThrough)}`,
    section: 'Appearance',
    action: { type: 'toggleClickThrough' },
  });

  commands.push({
    id: 'login',
    label: `Launch on login: ${onOff(settings.launchOnLogin)}`,
    section: 'System',
    action: { type: 'toggleLaunchOnLogin' },
  });
  commands.push({
    id: 'settings:open',
    label: 'Open Settings',
    section: 'System',
    action: { type: 'openSettings' },
  });
  commands.push({
    id: 'position:reset',
    label: 'Reset pet position',
    section: 'System',
    action: { type: 'resetPosition' },
  });
  commands.push({
    id: 'app:quit',
    label: 'Quit Desktop Buddy',
    section: 'System',
    action: { type: 'quit' },
  });

  return commands;
}
