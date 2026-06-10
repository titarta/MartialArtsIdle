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

// Map the game's i18next locale code -> the Polyglyph project's language code
// where they differ. The game uses generic `pt`/`zh`; the Polyglyph project
// targets the specific variants pt-BR (Brazilian Portuguese) and zh-CN
// (Simplified Chinese). Translate/pull talk to Polyglyph in its codes; locale
// files are still written under the game's codes.
const POLYGLYPH_LANG = { pt: 'pt-BR', zh: 'zh-CN' };
const toPg = (code) => POLYGLYPH_LANG[code] ?? code;

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
    signal: AbortSignal.timeout(30000), // never hang on a half-open connection (e.g. backend restart)
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

// ── status (local counts + live Polyglyph state when configured) ─────────────
async function status() {
  let total = 0;
  for (const ns of NAMESPACES) {
    const n = Object.keys(readSource(ns)).length;
    total += n;
    console.log(`  ${ns}: ${n} source strings`);
  }
  console.log(`  TOTAL: ${total} EN source strings`);
  console.log(`  target: ${SLUG || '(no slug set)'} @ ${BASE || '(no base url set)'}`);

  const want = languages.filter(l => l.code !== 'en').map(l => l.code);
  if (!BASE || !KEY || !SLUG) {
    console.log(`  languages to translate: ${want.join(', ')}`);
    return;
  }
  try {
    const r = await api('GET', `/api/plugin/status?projectSlug=${encodeURIComponent(SLUG)}`);
    console.log(`\n  Polyglyph "${r.project.slug}" (source: ${r.project.sourceLanguage}) — ${r.totalStrings} strings`);
    for (const l of r.languages) {
      console.log(`    ${l.code}: ${l.enabled ? 'enabled ' : 'DISABLED'} | ${l.approved} approved, ${l.translated} drafted, ${l.untranslated} untranslated (${l.approvedPct}%)`);
    }
    // Project-level settings injected into every translation — confirm they
    // survived (a wiped brief/glossary means translations lose the game context).
    console.log(`\n  brief: ${r.project.brief ? `set (${r.project.brief.length} chars)` : 'NOT SET'}`);
    try {
      const g = await api('GET', `/api/plugin/glossary?projectSlug=${encodeURIComponent(SLUG)}`);
      console.log(`  glossary: ${g.terms?.length ?? 0} terms`);
    } catch (e) {
      console.log(`  glossary: (unavailable: ${e.message})`);
    }
    const enabled = new Set(r.languages.filter(l => l.enabled).map(l => l.code));
    const missing = want.filter(c => !enabled.has(toPg(c)));
    if (missing.length) {
      console.log(`\n  >> Add + enable these in the Polyglyph project settings, then re-run translate: ${missing.join(', ')}`);
    } else {
      console.log(`\n  All ${want.length} target languages are enabled. Ready for: npm run i18n:translate`);
    }
  } catch (e) {
    console.log(`  (live status unavailable: ${e.message})`);
  }
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
async function pull(langArg, includeDrafts = false) {
  requireConfig();
  const targets = (langArg ? [langArg] : languages.map(l => l.code)).filter(c => c !== 'en');
  const approved = includeDrafts ? 'false' : 'true';
  console.log(`Pulling ${includeDrafts ? 'AI drafts + approved' : 'approved-only'} translations for: ${targets.join(', ')}`);
  for (const lang of targets) {
    const r = await api('GET',
      `/api/plugin/pull?projectSlug=${encodeURIComponent(SLUG)}&language=${encodeURIComponent(toPg(lang))}&onlyApproved=${approved}`);
    const byNs = Object.fromEntries(NAMESPACES.map(ns => [ns, {}]));
    let count = 0;
    for (const s of (r.strings ?? [])) {
      (byNs[s.namespace] ??= {})[s.key] = s.value;
      count += 1;
    }
    if (count === 0) { console.log(`  ${lang}: 0 strings (left unchanged, falls back to EN)`); continue; }
    const dir = path.join(LOCALES_DIR, lang);
    fs.mkdirSync(dir, { recursive: true });
    for (const ns of NAMESPACES) {
      fs.writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(unflatten(byNs[ns] ?? {}), null, 2) + '\n', 'utf8');
    }
    console.log(`  ${lang}: wrote ${count} strings`);
  }
  console.log('Done. Restart the dev server (or rebuild) to see the new translations.');
}

// ── translate (trigger AI drafting + poll to completion) ─────────────────────
async function translate(langArg, force = false) {
  requireConfig();
  const targets = (langArg ? [langArg] : languages.map((l) => l.code)).filter((c) => c !== 'en');
  // --force re-translates EVERY string (passing all keys) instead of only the
  // untranslated ones, so drafts made before the glossary/brief get redone.
  let keys;
  if (force) {
    keys = [];
    for (const ns of NAMESPACES) for (const key of Object.keys(readSource(ns))) keys.push({ namespace: ns, key });
  }
  console.log(`Triggering AI translation (${force ? `FORCE: all ${keys.length} strings, re-translates drafts` : 'all untranslated'}) for: ${targets.join(', ')}`);

  const pending = new Map(); // jobId -> { lang, last }
  for (const lang of targets) {
    const r = await api('POST', '/api/plugin/translate', { projectSlug: SLUG, language: toPg(lang), ...(force ? { keys } : {}) });
    pending.set(r.jobId, { lang, last: '' });
    console.log(`  ${lang}: job ${r.jobId} queued [mode: ${r.mode ?? '?'}]`);
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

// ── glossary (set brief, upsert terms, AI-fill per-language values) ──────────
async function glossary() {
  requireConfig();
  const cfg = JSON.parse(fs.readFileSync(path.resolve('scripts/i18n-glossary.json'), 'utf8'));
  if (cfg.brief) {
    await api('POST', '/api/plugin/project', { projectSlug: SLUG, brief: cfg.brief });
    console.log('Set project brief / game context.');
  }
  const r = await api('POST', '/api/plugin/glossary', { projectSlug: SLUG, terms: cfg.terms });
  console.log(`Glossary upserted: ${r.created} created, ${r.updated} updated (${r.total} total).`);
  console.log('AI-filling per-language values (one suggest call per term)...');
  for (const term of cfg.terms) {
    try {
      const s = await api('POST', '/api/plugin/glossary/suggest',
        { projectSlug: SLUG, sourceTerm: term.sourceTerm, context: term.context ?? null, apply: true });
      const entries = Object.entries(s.translations || {});
      const sample = entries.slice(0, 3).map(([l, v]) => `${l}=${v}`).join(', ');
      console.log(`  ${term.sourceTerm}: ${entries.length} langs${sample ? ` (${sample}${entries.length > 3 ? ', …' : ''})` : ''}`);
    } catch (e) {
      console.log(`  ${term.sourceTerm}: suggest failed — ${e.message}`);
    }
  }
  console.log('\nGlossary ready. Re-translate so it applies:  npm run i18n:translate -- --force');
}

// ── dispatch ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];
const drafts = args.includes('--drafts');
const force = args.includes('--force');
const lang = args.slice(1).find((a) => !a.startsWith('--'));
try {
  if (cmd === 'push') await push();
  else if (cmd === 'glossary') await glossary();
  else if (cmd === 'translate') await translate(lang, force);
  else if (cmd === 'pull') await pull(lang, drafts);
  else if (cmd === 'status') await status();
  else {
    console.error('Usage: node scripts/polyglyph-sync.mjs <push|glossary|translate|pull|status> [lang] [--drafts] [--force]');
    process.exit(1);
  }
} catch (err) {
  console.error('\nError:', err.message);
  process.exit(1);
}
