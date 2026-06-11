/**
 * apply-ui-strings.mjs — seed hand-authored UI-chrome translations from
 * scripts/i18n-ui-strings.json into all 9 locale ui.json files.
 *
 * Run:  node scripts/apply-ui-strings.mjs
 *
 * Idempotent. Re-run after a Polyglyph pull --drafts if AI drafts overwrite
 * any of these keys. EN is untouched (its values live directly in en/ui.json).
 *
 * Manifest format:
 *   { "section.dottedKey": { "zh": "...", "ja": "...", ... }, ... }
 * The leading "_comment" key is skipped.
 */
import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = path.resolve('src/i18n/locales');
const manifest = JSON.parse(fs.readFileSync(path.resolve('scripts/i18n-ui-strings.json'), 'utf8'));
const LANGS = ['zh', 'ja', 'ko', 'pt', 'es', 'fr', 'de', 'it', 'ru'];

function setDeep(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = (cur[parts[i]] ??= {});
  cur[parts[parts.length - 1]] = value;
}

const sortDeep = (o) => (o && typeof o === 'object' && !Array.isArray(o))
  ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sortDeep(o[k])]))
  : o;

const entries = Object.entries(manifest).filter(([k]) => k !== '_comment');

for (const lang of LANGS) {
  const file = path.join(LOCALES_DIR, lang, 'ui.json');
  if (!fs.existsSync(file)) { console.warn(`  ${lang}: ui.json not found, skipping`); continue; }
  const ui = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const [dotPath, byLang] of entries) {
    const value = byLang[lang];
    if (typeof value !== 'string') continue;
    setDeep(ui, dotPath, value);
    count += 1;
  }
  fs.writeFileSync(file, JSON.stringify(sortDeep(ui), null, 2) + '\n', 'utf8');
  console.log(`  ${lang}: set ${count} keys`);
}
console.log('\nDone. Reload the dev server to see the new translations.');
