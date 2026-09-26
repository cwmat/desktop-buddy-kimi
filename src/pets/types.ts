import type { PetState } from '../shared/types';
import type { Animation, Grid, Palette } from '../sprite/engine';

export interface PetDefinition {
  id: string;
  name: string;
  species: string;
  blurb: string;
  grid: Grid;
  palette: Palette;
  animations: Record<PetState, Animation>;
}

/** Renderer-safe metadata (no sprite data). */
export interface PetMeta {
  id: string;
  name: string;
  species: string;
  blurb: string;
}
