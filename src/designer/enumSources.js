/**
 * Enum option providers for SchemaForm.
 *
 * Sourced from the game's data modules so dropdowns stay in sync with
 * whatever is actually available at build time. These helpers are pure
 * reads — the designer panel never mutates the imported modules.
 */

import ENEMIES from '../data/enemies.js';
import { ITEMS }  from '../data/items.js';
import WORLDS from '../data/worlds.js';

export function enemyIdOptions() {
  return Object.keys(ENEMIES).map((id) => ({ value: id, label: `${id} — ${ENEMIES[id].name}` }));
}

export function itemIdOptions() {
  const all = [];
  for (const cat of Object.keys(ITEMS)) {
    for (const it of ITEMS[cat]) {
      all.push({ value: it.id, label: `${it.id} — ${it.name}` });
    }
  }
  return all;
}

export function spriteOptions() {
  // Eagerly enumerate every PNG under public/sprites/enemies at build time.
  // Only filenames are needed — stripping path + extension for the value.
  const files = import.meta.glob('/public/sprites/enemies/*.png', { eager: true, as: 'url' });
  const bases = new Set();
  for (const path of Object.keys(files)) {
    const file = path.split('/').pop().replace(/\.png$/, '');
    // Enemies use pairs: `{name}-idle.png` + `{name}-attack.png`.
    // Collapse to the base name so sprite dropdown shows one option per pair.
    const base = file.replace(/-(idle|attack)$/, '');
    bases.add(base);
  }
  return ['', ...Array.from(bases).sort()]
    .filter((b) => b !== '')
    .map((b) => ({ value: b, label: b }));
}

export function worldIdOptions() {
  return WORLDS.map((w) => ({ value: w.id, label: `${w.id} — ${w.name}` }));
}

export function rarityOptions() {
  return ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];
}
