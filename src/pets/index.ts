import type { PetDefinition, PetMeta } from './types';
import biscuit from './biscuit';
import mochi from './mochi';
import nova from './nova';
import pixel from './pixel';

export const PETS: Record<string, PetDefinition> = { biscuit, mochi, nova, pixel };

export function petMetaList(): PetMeta[] {
  return Object.values(PETS).map(({ id, name, species, blurb }) => ({ id, name, species, blurb }));
}

export { biscuit, mochi, nova, pixel };
export type { PetDefinition, PetMeta } from './types';
