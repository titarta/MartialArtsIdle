/**
 * gen_game_i18n.mjs — regenerate src/i18n/locales/en/game.json from the data modules.
 *
 * The `game` i18n namespace holds CONTENT keyed by id (item/spark/upgrade/etc.
 * names + descriptions). The data modules (src/data/*) are the single source of
 * truth — this script walks their exports and emits the English source that
 * gets pushed to Polyglyph for translation. Components resolve at render via the
 * `useGameText` hook with the data English as the runtime fallback, so EN never
 * breaks even between regenerations.
 *
 * Re-run after editing any data module:  node scripts/gen_game_i18n.mjs
 * Uses Vite's ssrLoadModule so import.meta.env + .override.json config imports
 * resolve exactly as they do in the app.
 *
 * Only STRING-valued fields are captured (effect:{}, color, cost, sprites… are
 * skipped automatically). Add a new content type by adding one extract() line.
 */
import { createServer } from 'vite';
import fs from 'node:fs';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => vite.ssrLoadModule(p);

const out = {};
function put(section, id, field, val) {
  if (typeof val !== 'string') return;
  if (!val.trim()) return;
  (out[section] ??= {})[id] ??= {};
  out[section][id][field] = val;
}
/** entries: [key, entity][]. idKey '__key__' uses the entry key (object key or array index). */
function extract(section, entries, idKey, fields) {
  for (const [k, e] of entries) {
    if (!e || typeof e !== 'object') continue;
    const id = idKey === '__key__' ? String(k) : (e[idKey] ?? String(k));
    for (const f of fields) put(section, id, f, e[f]);
  }
}
const arr = (a) => (a ?? []).map((e, i) => [i, e]);
const obj = (o) => Object.entries(o ?? {});

// ── Producers / upgrades ─────────────────────────────────────────────────────
extract('producers', arr((await load('/src/data/producers.js')).default), 'id', ['name', 'desc']);
extract('upgrades',  arr((await load('/src/data/upgrades.js')).default),  'id', ['name', 'desc']);

// ── Qi Sparks (cards + detail copy) ──────────────────────────────────────────
const sparks = await load('/src/data/qiSparks.js');
extract('qiSparks',  arr(sparks.QI_SPARKS), 'id', ['name', 'description']);
extract('sparkCopy', obj(sparks.SPARK_COPY), '__key__', ['effectText', 'exampleText', 'loreText']);

// ── Blood Lotus spend shop ───────────────────────────────────────────────────
const shop = await load('/src/data/shopItems.js');
extract('shopItems',   arr(shop.SHOP_ITEMS),   'id', ['name', 'desc']);
extract('shopBundles', arr(shop.SHOP_BUNDLES), 'id', ['name', 'desc']);

// ── Meridian Furnace minigame ────────────────────────────────────────────────
const furnace = await load('/src/data/furnace.js');
extract('furnaceMaterials',   obj(furnace.MATERIALS),          'id',      ['name']);
extract('furnacePills',       obj(furnace.PILLS),              'id',      ['name', 'desc']);
extract('furnaceFoundations', obj(furnace.FOUNDATIONS),        'id',      ['name', 'desc']);
extract('furnaceHeat',        arr(furnace.HEAT_QUALITY_TIERS), '__key__', ['label']);

// ── Spirit Garden minigame ───────────────────────────────────────────────────
const garden = await load('/src/data/spiritGarden.js');
extract('gardenPlants',  arr(garden.SEEDS),            'id', ['name']);
extract('gardenPlants',  arr(garden.LOCKED_SEEDS_META), 'id', ['name']);
extract('gardenRecipes', arr(garden.RECIPES),          'id', ['name']);

// ── Achievements / minigame registry / eternal tree / roster ranks ───────────
extract('achievements',  arr((await load('/src/data/achievements.js')).ACHIEVEMENTS), 'id',      ['title', 'desc']);
extract('minigames',     obj((await load('/src/data/minigames.js')).MINIGAMES),       '__key__', ['name', 'tagline', 'mode']);
extract('eternalTree',   arr((await load('/src/data/reincarnationTree.js')).NODES),   'id',      ['label', 'description']);
extract('discipleTiers', arr((await load('/src/data/discipleMerge.js')).TIERS),       '__key__', ['rank']);

// ── Tutorials / rarity labels ────────────────────────────────────────────────
extract('tutorials', obj((await load('/src/data/tutorialCards.js')).default), '__key__', ['kicker', 'title', 'body', 'ctaText']);
extract('rarity',    obj((await load('/src/data/materials.js')).RARITY),      '__key__', ['label']);

// ── Realm names / stage labels / chapter titles ──────────────────────────────
// Keyed by the English string itself (realm name / stage label) so render sites
// resolve with gt('realmNames', realm.name, 'name', realm.name). Names + stages
// repeat across the 56-entry REALMS ladder, so we de-dupe to the unique set.
const realmsMod = await load('/src/data/realms.js');
for (const name of (realmsMod.REALM_NAMES ?? [])) put('realmNames', name, 'name', name);
const stageSet = new Set();
for (const r of (realmsMod.default ?? [])) if (r.stage) stageSet.add(r.stage);
for (const s of stageSet) put('realmStages', s, 'label', s);
extract('chapters', arr(realmsMod.CHAPTERS), 'id', ['title']);

await vite.close();

// Stable, sorted output for clean diffs.
const sortDeep = (o) => (o && typeof o === 'object' && !Array.isArray(o))
  ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sortDeep(o[k])]))
  : o;
const sorted = sortDeep(out);

fs.writeFileSync('src/i18n/locales/en/game.json', JSON.stringify(sorted, null, 2) + '\n', 'utf8');

let strings = 0;
const report = Object.entries(sorted).map(([s, ents]) => {
  const n = Object.values(ents).reduce((a, e) => a + Object.keys(e).length, 0);
  strings += n;
  return `  ${s}: ${Object.keys(ents).length} entries, ${n} strings`;
});
console.log('en/game.json written.\n' + report.join('\n') + `\nTOTAL: ${Object.keys(sorted).length} sections, ${strings} strings`);
