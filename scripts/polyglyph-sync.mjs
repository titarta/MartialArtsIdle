/**
 * polyglyph-sync.mjs — sync this game's locale files with the Polyglyph TMS.
 *
 *   node scripts/polyglyph-sync.mjs push          push EN source (ui + game) up
 *   node scripts/polyglyph-sync.mjs pull          pull APPROVED translations for every language
 *   node scripts/polyglyph-sync.mjs pull zh       pull one language
 *   node scripts/polyglyph-sync.mjs status        show source string counts (no network)
 *
 * Workflow:  push  →  (Polyglyph dashboard: run AI translation + review/approve)  →  pull
 *   The AI-draft trigger lives in the dashboard (Clerk-authed); the plugin API
 *   used here is API-key authed and only does push (source upsert) + pull
 *   (approved export). `pull` defaults to onlyApproved=true, so an un-reviewed
 *   draft can never land in the repo — untranslated keys just fall back to EN.
 *
 * Config — put these in a gitignored .env at the repo root (see .env.example):
 *   POLYGLYPH_BASE_URL      e.g. http://localhost:3000
 *   POLYGLYPH_API_KEY       the X-Polyglyph-Key value
 *   POLYGLYPH_PROJECT_SLUG  the project slug in Polyglyph
 *
 * The i18next key (dot path, e.g. `shop.packages.blood_lotus_1`) is the
 * Polyglyph `key`; the file (`ui` / `game`) is the `namespace`.
 */
import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = path.resolve('src/i18n/locales');
const NAMESPACES = ['ui', 'game'];

// ── .env (tiny parser, no dependency) ────────────────────────────────────────
function loadEnv() {
  const out = { ...process.env };
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trimStart().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
}
const ENV = loadEnv();
const BASE = (ENV.POLYGLYPH_BASE_URL || '').replace(/\/+$/, '');
const KEY = ENV.POLYGLYPH_API_KEY || '';
const SLUG = ENV.POLYGLYPH_PROJECT_SLUG || '';

const languages = JSON.parse(fs.readFileSync(path.resolve('src/i18n/languages.json'), 'utf8'));

// ── flatten / unflatten nested locale JSON <-> dot-keyed map ──────────────────
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = String(v ?? '');
  }
  return out;
}
function unflatten(flat) {
  const out = {};
  for (const [dot, val] of Object.entries(flat)) {
    const parts = dot.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) cur = (cur[parts[i]] ??= {});
    cur[parts[parts.length - 1]] = val;
  }
  return out;
}

function readSource(ns) {
  return flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en', `${ns}.json`), 'utf8')));
}

function requireConfig() {
  if (!BASE || !KEY || !SLUG) {
    console.error('Missing config. Create a .env (see .env.example) with:\n' +
      '  POLYGLYPH_BASE_URL=...\n  POLYGLYPH_API_KEY=...\n  POLYGLYPH_PROJECT_SLUG=...');
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: { 'X-Polyglyph-Key': KEY, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data === 'object' && data?.error ? data.error : (text || res.statusText);
    throw new Error(`${method} ${urlPath} -> ${res.status} ${msg}`);
  }
  return data;
}

// ── status (offline) ─────────────────────────────────────────────────────────
function status() {
  let total = 0;
  for (const ns of NAMESPACES) {
    const n = Object.keys(readSource(ns)).length;
    total += n;
    console.log(`  ${ns}: ${n} source strings`);
  }
  console.log(`  TOTAL: ${total} EN source strings`);
  console.log(`  languages to translate: ${languages.filter(l => l.code !== 'en').map(l => l.code).join(', ')}`);
  console.log(`  target: ${SLUG || '(no slug set)'} @ ${BASE || '(no base url set)'}`);
}

// ── push ─────────────────────────────────────────────────────────────────────
async function push() {
  requireConfig();
  const strings = [];
  for (const ns of NAMESPACES) {
    for (const [key, sourceText] of Object.entries(readSource(ns))) {
      strings.push({ namespace: ns, key, sourceText, context: `${ns}/${key.split('.')[0]}` });
    }
  }
  console.log(`Pushing ${strings.length} source strings to "${SLUG}" ...`);
  // Each push batch is one Prisma interactive transaction on the server (5s
  // default timeout). Keep batches small so the sequential upserts finish well
  // under that limit; 300 timed out, 50 is comfortable.
  const BATCH = 50;
  let created = 0, updated = 0;
  for (let i = 0; i < strings.length; i += BATCH) {
    const chunk = strings.slice(i, i + BATCH);
    const r = await api('POST', '/api/plugin/push', { projectSlug: SLUG, strings: chunk });
    created += r.created ?? 0;
    updated += r.updated ?? 0;
    console.log(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(strings.length / BATCH)}: +${r.created} new, ${r.updated} updated`);
  }
  console.log(`Done. ${created} created, ${updated} updated, ${created + updated} total.`);
  console.log('Next: open the Polyglyph dashboard, run AI translation per language, review/approve, then `npm run i18n:pull`.');
}

// ── pull ─────────────────────────────────────────────────────────────────────
async function pull(langArg) {
  requireConfig();
  const targets = (langArg ? [langArg] : languages.map(l => l.code)).filter(c => c !== 'en');
  console.log(`Pulling approved translations for: ${targets.join(', ')}`);
  for (const lang of targets) {
    const r = await api('GET',
      `/api/plugin/pull?projectSlug=${encodeURIComponent(SLUG)}&language=${encodeURIComponent(lang)}&onlyApproved=true`);
    const byNs = Object.fromEntries(NAMESPACES.map(ns => [ns, {}]));
    let count = 0;
    for (const s of (r.strings ?? [])) {
      (byNs[s.namespace] ??= {})[s.key] = s.value;
      count += 1;
    }
    if (count === 0) { console.log(`  ${lang}: 0 approved (left unchanged, falls back to EN)`); continue; }
    const dir = path.join(LOCALES_DIR, lang);
    fs.mkdirSync(dir, { recursive: true });
    for (const ns of NAMESPACES) {
      fs.writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(unflatten(byNs[ns] ?? {}), null, 2) + '\n', 'utf8');
    }
    console.log(`  ${lang}: wrote ${count} approved strings`);
  }
  console.log('Done. Restart the dev server (or rebuild) to see the new translations.');
}

// ── translate (trigger AI drafting + poll to completion) ─────────────────────
async function translate(langArg) {
  requireConfig();
  const targets = (langArg ? [langArg] : languages.map((l) => l.code)).filter((c) => c !== 'en');
  console.log(`Triggering AI translation (all untranslated strings) for: ${targets.join(', ')}`);

  const pending = new Map(); // jobId -> { lang, last }
  for (const lang of targets) {
    const r = await api('POST', '/api/plugin/translate', { projectSlug: SLUG, language: lang });
    pending.set(r.jobId, { lang, last: '' });
    console.log(`  ${lang}: job ${r.jobId} queued`);
  }

  console.log('Waiting for jobs to finish (Ctrl-C is safe — the server keeps working)...');
  while (pending.size > 0) {
    await sleep(3000);
    for (const [jobId, info] of [...pending]) {
      let job;
      try { ({ job } = await api('GET', `/api/plugin/jobs/${jobId}`)); }
      catch (e) { console.log(`  ${info.lang}: poll error (${e.message}) — retrying`); continue; }
      const prog = job.total ? `${job.completed}/${job.total}` : 'queued';
      if (prog !== info.last) { console.log(`  ${info.lang}: ${prog} [${job.status}]`); info.last = prog; }
      if (job.status === 'COMPLETED') { console.log(`  ${info.lang}: DONE (${job.completed}/${job.total})`); pending.delete(jobId); }
      else if (job.status === 'FAILED') { console.log(`  ${info.lang}: FAILED — ${job.error ?? 'unknown'}`); pending.delete(jobId); }
    }
  }
  console.log('\nAll jobs finished. Drafts saved as AI_DRAFT. Review/approve in the dashboard, then `npm run i18n:pull`.');
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'push') await push();
  else if (cmd === 'translate') await translate(arg);
  else if (cmd === 'pull') await pull(arg);
  else if (cmd === 'status') status();
  else {
    console.error('Usage: node scripts/polyglyph-sync.mjs <push|translate|pull|status> [lang]');
    process.exit(1);
  }
} catch (err) {
  console.error('\nError:', err.message);
  process.exit(1);
}
