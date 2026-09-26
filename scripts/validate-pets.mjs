// Validates every pet sprite file against the sprite engine's rules.
// Run: node scripts/validate-pets.mjs  (uses Node's native TS type stripping)
import { validateAnimations } from '../src/sprite/engine.ts';

const PET_IDS = ['biscuit', 'mochi', 'nova', 'pixel'];
const MAX_COLORS = 8;

let failures = 0;

for (const id of PET_IDS) {
  try {
    const mod = await import(`../src/pets/${id}.ts`);
    const pet = mod.default;
    if (!pet || pet.id !== id) throw new Error(`default export missing or id mismatch (expected '${id}')`);
    const colors = Object.keys(pet.palette);
    if (colors.length > MAX_COLORS) {
      throw new Error(`palette has ${colors.length} colors (max ${MAX_COLORS})`);
    }
    for (const ch of colors) {
      if (ch === '.' || ch === ' ') throw new Error(`palette must not contain transparent char '${ch}'`);
      if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(pet.palette[ch])) {
        throw new Error(`palette['${ch}'] is not a hex color: ${pet.palette[ch]}`);
      }
    }
    validateAnimations(pet.animations, pet.palette, pet.grid);
    const counts = Object.entries(pet.animations)
      .map(([state, a]) => `${state}:${a.frames.length}`)
      .join(' ');
    console.log(`OK  ${id} (${pet.name}, ${pet.species}) palette:${colors.length} grid:${pet.grid.width}x${pet.grid.height} ${counts}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${id}: ${err.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} pet(s) invalid`);
  process.exit(1);
}
console.log('All pets valid.');
