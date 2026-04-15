import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadPat, savePat, clearPat } from '../designer/pat.js';
import { checkToken, getFile, putTextFile, REPO_OWNER, REPO_NAME, BRANCH } from '../designer/github.js';
import languagesJson from '../i18n/languages.json';

// Reference locale — always English, bundled at build time
import enUi   from '../i18n/locales/en/ui.json';
import enGame from '../i18n/locales/en/game.json';

import '../designer/designer.css';

// ── Constants ────────────────────────────────────────────────────────────────

const NAMESPACES = [
  { id: 'ui',   label: 'UI',   ref: enUi   },
  { id: 'game', label: 'Game', ref: enGame },
];

const LANGUAGES_PATH = 'src/i18n/languages.json';

function localePath(code, ns) {
  return `src/i18n/locales/${code}/${ns}.json`;
}

// ── Flatten / unflatten ──────────────────────────────────────────────────────

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v ?? '');
    }
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [dotKey, val] of Object.entries(flat)) {
    const parts = dotKey.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  }
  return out;
}

function sectionsOf(refJson) {
  return Object.keys(refJson).map((k) => ({
    id:    k,
    label: k.charAt(0).toUpperCase() + k.slice(1),
    count: Object.keys(flatten({ [k]: refJson[k] })).length,
  }));
}

function stateKey(code, ns) { return `${code}__${ns}`; }

function emptyEntry() {
  return { baseline: {}, edited: {}, sha: null, loading: false, error: null };
}

// Build initial locale state for a given list of target languages
function buildInitialState(langs) {
  const s = {};
  for (const lang of langs) {
    for (const ns of NAMESPACES) {
      s[stateKey(lang.code, ns.id)] = emptyEntry();
    }
  }
  return s;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Localizer() {
  const [pat, setPat]                     = useState(loadPat);
  const [tokenStatus, setTokenStatus]     = useState({ ok: false, reason: 'untested' });
  const [tokenBusy, setTokenBusy]         = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(!loadPat());
  const [commitBusy, setCommitBusy]       = useState(false);
  const [commitMsg, setCommitMsg]         = useState(null);
  const [addLangOpen, setAddLangOpen]     = useState(false);

  // Language list — starts from bundled languages.json (all non-EN entries)
  const [languages, setLanguages]         = useState(() =>
    languagesJson.filter((l) => l.code !== 'en')
  );
  // SHA of languages.json on GitHub — needed to update it
  const [langFileSha, setLangFileSha]     = useState(null);

  // Active nav state
  const [activeLang, setActiveLang]       = useState(() =>
    languagesJson.find((l) => l.code !== 'en')?.code ?? 'pt'
  );
  const [activeNs, setActiveNs]           = useState('ui');
  const [activeSection, setActiveSection] = useState(Object.keys(enUi)[0]);
  const [search, setSearch]               = useState('');

  // Per-(lang, ns) locale state
  const [localeState, setLocaleState]     = useState(() =>
    buildInitialState(languagesJson.filter((l) => l.code !== 'en'))
  );

  // Track which lang/ns combos we've already kicked off a load for
  const loadedKeys = useRef(new Set());

  // ── Token check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pat) { setTokenStatus({ ok: false, reason: 'empty' }); return; }
    let cancelled = false;
    setTokenBusy(true);
    checkToken(pat).then((res) => {
      if (!cancelled) { setTokenStatus(res); setTokenBusy(false); }
    });
    return () => { cancelled = true; };
  }, [pat]);

  // ── Load languages.json from GitHub (to get its SHA for future updates) ──
  useEffect(() => {
    if (!tokenStatus.ok) return;
    getFile(pat, LANGUAGES_PATH).then((file) => {
      if (file.exists) setLangFileSha(file.sha);
    });
  }, [pat, tokenStatus.ok]);

  // ── Load locale files for all known languages ────────────────────────────
  const loadLocaleFiles = useCallback((langs, currentPat) => {
    let cancelled = false;
    for (const lang of langs) {
      for (const ns of NAMESPACES) {
        const key = stateKey(lang.code, ns.id);
        if (loadedKeys.current.has(key)) continue;
        loadedKeys.current.add(key);

        setLocaleState((s) => ({ ...s, [key]: { ...(s[key] ?? emptyEntry()), loading: true, error: null } }));
        getFile(currentPat, localePath(lang.code, ns.id)).then((file) => {
          if (cancelled) return;
          const flat = file.exists ? flatten(JSON.parse(file.content)) : {};
          setLocaleState((s) => ({
            ...s,
            [key]: { baseline: flat, edited: { ...flat }, sha: file.sha, loading: false, error: null },
          }));
        }).catch((err) => {
          if (cancelled) return;
          setLocaleState((s) => ({ ...s, [key]: { ...(s[key] ?? emptyEntry()), loading: false, error: err.message } }));
        });
      }
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!tokenStatus.ok) return;
    return loadLocaleFiles(languages, pat);
  }, [pat, tokenStatus.ok, languages, loadLocaleFiles]);

  // ── Dirty map ────────────────────────────────────────────────────────────
  const dirtyMap = useMemo(() => {
    const perLang = {};
    let total = 0;
    for (const lang of languages) {
      let n = 0;
      for (const ns of NAMESPACES) {
        const key = stateKey(lang.code, ns.id);
        const s   = localeState[key];
        if (!s) continue;
        for (const k of new Set([...Object.keys(s.baseline), ...Object.keys(s.edited)])) {
          if ((s.baseline[k] ?? '') !== (s.edited[k] ?? '')) n++;
        }
      }
      perLang[lang.code] = n;
      total += n;
    }
    return { perLang, total };
  }, [localeState, languages]);

  // ── Edit handler ─────────────────────────────────────────────────────────
  const handleEdit = useCallback((code, ns, k, v) => {
    const key = stateKey(code, ns);
    setLocaleState((s) => ({
      ...s,
      [key]: { ...s[key], edited: { ...s[key].edited, [k]: v } },
    }));
  }, []);

  // ── Discard ──────────────────────────────────────────────────────────────
  const discardAll = useCallback(() => {
    if (!confirm(`Discard all ${dirtyMap.total} unsaved changes?`)) return;
    setLocaleState((s) => {
      const next = { ...s };
      for (const lang of languages) {
        for (const ns of NAMESPACES) {
          const key = stateKey(lang.code, ns.id);
          if (next[key]) next[key] = { ...next[key], edited: { ...next[key].baseline } };
        }
      }
      return next;
    });
    setCommitMsg({ type: 'info', text: 'Changes discarded.' });
  }, [dirtyMap.total, languages]);

  // ── Commit translations ───────────────────────────────────────────────────
  const commitAll = useCallback(async () => {
    if (dirtyMap.total === 0 || !tokenStatus.ok) return;
    setCommitBusy(true);
    setCommitMsg({ type: 'info', text: 'Committing…' });

    const results = [];
    for (const lang of languages) {
      for (const ns of NAMESPACES) {
        const key = stateKey(lang.code, ns.id);
        const s   = localeState[key];
        if (!s) continue;

        const allKeys = new Set([...Object.keys(s.baseline), ...Object.keys(s.edited)]);
        const dirty   = [...allKeys].filter((k) => (s.baseline[k] ?? '') !== (s.edited[k] ?? ''));
        if (dirty.length === 0) continue;

        const payload = JSON.stringify(unflatten(s.edited), null, 2) + '\n';
        const message = `i18n(${lang.code}): update ${ns.id} — ${dirty.length} string${dirty.length === 1 ? '' : 's'}`;
        const res = await putTextFile(pat, { path: localePath(lang.code, ns.id), content: payload, sha: s.sha, message });
        results.push({ key, lang: lang.code, ns: ns.id, res });
        if (!res.ok) break;
      }
    }

    const failed = results.find((r) => !r.res.ok);
    setCommitBusy(false);

    if (failed) {
      setCommitMsg({
        type: 'error',
        text: failed.res.conflict
          ? `${failed.lang}/${failed.ns}: upstream changed. Reload to pull latest.`
          : `${failed.lang}/${failed.ns}: commit failed (${failed.res.status}).`,
        canReload: failed.res.conflict,
      });
      return;
    }

    setCommitMsg({
      type: 'success',
      text: `Committed ${results.length} file${results.length === 1 ? '' : 's'} to ${REPO_OWNER}/${REPO_NAME}.`,
    });
    setLocaleState((s) => {
      const next = { ...s };
      for (const r of results) {
        if (r.res.ok) next[r.key] = { ...next[r.key], baseline: { ...next[r.key].edited }, sha: r.res.sha };
      }
      return next;
    });
  }, [dirtyMap.total, languages, localeState, pat, tokenStatus.ok]);

  // ── Add language ──────────────────────────────────────────────────────────
  const handleAddLanguage = useCallback(async ({ code, label }) => {
    const trimCode  = code.trim().toLowerCase();
    const trimLabel = label.trim();
    if (!trimCode || !trimLabel) return;
    if (languages.some((l) => l.code === trimCode)) {
      alert(`Language "${trimCode}" already exists.`);
      return;
    }

    setAddLangOpen(false);
    setCommitMsg({ type: 'info', text: `Creating language "${trimLabel}" (${trimCode})…` });

    // Optimistically add to UI
    const newLang = { code: trimCode, label: trimLabel };
    setLanguages((prev) => [...prev, newLang]);
    const uiKey   = stateKey(trimCode, 'ui');
    const gameKey = stateKey(trimCode, 'game');
    setLocaleState((s) => ({
      ...s,
      [uiKey]:   emptyEntry(),
      [gameKey]: emptyEntry(),
    }));
    setActiveLang(trimCode);

    if (!tokenStatus.ok) {
      setCommitMsg({ type: 'info', text: `Language "${trimLabel}" added locally. Authenticate to commit locale files to GitHub.` });
      return;
    }

    // Commit empty locale files
    const emptyPayload = '{}\n';
    const results = [];
    for (const ns of NAMESPACES) {
      const res = await putTextFile(pat, {
        path:    localePath(trimCode, ns.id),
        content: emptyPayload,
        sha:     null,
        message: `i18n: add ${trimCode} locale (${ns.id})`,
      });
      results.push({ ns: ns.id, res });
      if (!res.ok) break;
    }

    const failed = results.find((r) => !r.res.ok);
    if (failed) {
      setCommitMsg({ type: 'error', text: `Failed to create ${trimCode}/${failed.ns} on GitHub (${failed.res.status}).` });
      return;
    }

    // Update locale state with new SHAs
    setLocaleState((s) => {
      const next = { ...s };
      for (const r of results) {
        const key = stateKey(trimCode, r.ns);
        next[key] = { ...next[key], sha: r.res.sha };
      }
      return next;
    });

    // Commit updated languages.json
    const allLangs = [...languagesJson.filter((l) => l.code !== 'en'), ...languages.filter((l) => !languagesJson.some((j) => j.code === l.code)), newLang];
    // Build the full list including EN at the top
    const fullList = [
      { code: 'en', label: 'English' },
      ...allLangs.filter((l) => l.code !== 'en'),
    ];
    const langPayload = JSON.stringify(fullList, null, 2) + '\n';
    const langRes = await putTextFile(pat, {
      path:    LANGUAGES_PATH,
      content: langPayload,
      sha:     langFileSha,
      message: `i18n: add ${trimCode} (${trimLabel}) to languages.json`,
    });

    if (langRes.ok) {
      setLangFileSha(langRes.sha);
      setCommitMsg({ type: 'success', text: `Language "${trimLabel}" (${trimCode}) created. Pull locally and restart the dev server to see it in the game.` });
    } else {
      setCommitMsg({ type: 'error', text: `Locale files created but languages.json update failed (${langRes.status}). Update it manually.` });
    }
  }, [languages, pat, tokenStatus.ok, langFileSha]);

  // ── Derived view data ────────────────────────────────────────────────────
  const activeNsObj   = NAMESPACES.find((n) => n.id === activeNs);
  const refFlat       = useMemo(() => flatten(activeNsObj?.ref ?? {}), [activeNs]);
  const activeStateEntry = localeState[stateKey(activeLang, activeNs)] ?? emptyEntry();
  const sections      = useMemo(() => sectionsOf(activeNsObj?.ref ?? {}), [activeNs]);

  const visibleKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Object.keys(refFlat).filter((k) => {
      if (!k.startsWith(activeSection + '.')) return false;
      if (!q) return true;
      return (
        k.toLowerCase().includes(q) ||
        (refFlat[k] ?? '').toLowerCase().includes(q) ||
        (activeStateEntry.edited[k] ?? '').toLowerCase().includes(q)
      );
    });
  }, [refFlat, activeSection, search, activeStateEntry.edited]);

  const dirtyInView = useMemo(
    () => visibleKeys.filter((k) => (activeStateEntry.baseline[k] ?? '') !== (activeStateEntry.edited[k] ?? '')).length,
    [visibleKeys, activeStateEntry],
  );

  const activeLangLabel = languages.find((l) => l.code === activeLang)?.label ?? activeLang;

  return (
    <div className="dz-root">
      {/* Header */}
      <header className="dz-header">
        <div className="dz-header-title">
          <span className="dz-logo">⊞</span>
          <span>Localizer</span>
          <span className="dz-repo">{REPO_OWNER}/{REPO_NAME}@{BRANCH}</span>
        </div>
        <div className="dz-header-actions">
          {tokenStatus.ok && <span className="dz-user">✓ {tokenStatus.login}</span>}
          {!tokenStatus.ok && tokenStatus.reason !== 'untested' && (
            <span className="dz-user dz-user-bad">⚠ {authReasonLabel(tokenStatus.reason)}</span>
          )}
          <button className="dz-btn dz-btn-ghost" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      {/* Body */}
      <div className="dz-body">
        {/* Sidebar */}
        <nav className="dz-nav" style={{ width: 210, flexShrink: 0 }}>
          {/* Language tabs */}
          <div style={{ padding: '8px 8px 4px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {languages.map((l) => (
                <button
                  key={l.code}
                  className={`dz-btn ${activeLang === l.code ? 'dz-btn-primary' : 'dz-btn-ghost'}`}
                  style={{ flex: '1 1 auto', padding: '4px 6px', fontSize: 12 }}
                  onClick={() => setActiveLang(l.code)}
                  title={l.label}
                >
                  {l.code.toUpperCase()}
                  {dirtyMap.perLang[l.code] > 0 && (
                    <span className="dz-dirty-pill" style={{ marginLeft: 4, fontSize: 10 }}>
                      {dirtyMap.perLang[l.code]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              className="dz-btn dz-btn-ghost"
              style={{ width: '100%', fontSize: 12, borderStyle: 'dashed' }}
              onClick={() => setAddLangOpen(true)}
            >
              + Add language
            </button>
          </div>

          {/* Namespace + sections */}
          {NAMESPACES.map((ns) => {
            const nsSections = sectionsOf(ns.ref);
            return (
              <div key={ns.id}>
                <div className="dz-nav-section">{ns.label}</div>
                {nsSections.map((sec) => {
                  const isActive = activeNs === ns.id && activeSection === sec.id;
                  const sk = stateKey(activeLang, ns.id);
                  const st = localeState[sk] ?? emptyEntry();
                  const secFlat  = flatten({ [sec.id]: ns.ref[sec.id] });
                  const secDirty = Object.keys(secFlat).filter(
                    (k) => (st.baseline[k] ?? '') !== (st.edited[k] ?? '')
                  ).length;

                  return (
                    <button
                      key={sec.id}
                      className={`dz-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => { setActiveNs(ns.id); setActiveSection(sec.id); setSearch(''); }}
                    >
                      <span>{sec.label}</span>
                      {secDirty > 0 && <span className="dz-dirty-pill">{secDirty}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Main editor */}
        <main className="dz-main" style={{ padding: '16px 20px' }}>
          {activeStateEntry.loading && (
            <div className="dz-loading">Loading {activeLang}/{activeNs}…</div>
          )}
          {activeStateEntry.error && (
            <div className="dz-error">Failed to load: {activeStateEntry.error}</div>
          )}
          {!activeStateEntry.loading && !activeStateEntry.error && (
            <StringTable
              langLabel={activeLangLabel}
              visibleKeys={visibleKeys}
              refFlat={refFlat}
              edited={activeStateEntry.edited}
              search={search}
              onSearch={setSearch}
              onEdit={(k, v) => handleEdit(activeLang, activeNs, k, v)}
              dirtyInView={dirtyInView}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="dz-footer">
        <div className="dz-footer-info">
          {commitMsg ? (
            <span className={`dz-msg dz-msg-${commitMsg.type}`}>
              {commitMsg.text}
              {commitMsg.canReload && (
                <button className="dz-btn dz-btn-link" onClick={() => location.reload()}>Reload</button>
              )}
            </span>
          ) : (
            <span className="dz-unsaved">{dirtyMap.total} unsaved change{dirtyMap.total === 1 ? '' : 's'}</span>
          )}
        </div>
        <div className="dz-footer-actions">
          <button
            className="dz-btn dz-btn-ghost"
            onClick={discardAll}
            disabled={dirtyMap.total === 0 || commitBusy}
          >Discard all</button>
          <button
            className="dz-btn dz-btn-primary"
            onClick={commitAll}
            disabled={dirtyMap.total === 0 || !tokenStatus.ok || commitBusy}
            title={!tokenStatus.ok ? 'Add a PAT with push access in Settings to commit' : ''}
          >
            {commitBusy ? 'Committing…' : `Commit to ${BRANCH}`}
          </button>
        </div>
      </footer>

      {/* Modals */}
      {settingsOpen && (
        <SettingsModal
          pat={pat}
          tokenStatus={tokenStatus}
          tokenBusy={tokenBusy}
          onSave={(p) => { savePat(p); setPat(p); }}
          onClear={() => { clearPat(); setPat(''); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {addLangOpen && (
        <AddLanguageModal
          existingCodes={['en', ...languages.map((l) => l.code)]}
          onConfirm={handleAddLanguage}
          onClose={() => setAddLangOpen(false)}
        />
      )}
    </div>
  );
}

// ── String table ─────────────────────────────────────────────────────────────

function StringTable({ langLabel, visibleKeys, refFlat, edited, search, onSearch, onEdit, dirtyInView }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          className="dz-input"
          style={{ flex: 1, fontFamily: 'inherit' }}
          placeholder="Search keys or strings…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <span className="dz-unsaved" style={{ whiteSpace: 'nowrap' }}>
          {visibleKeys.length} key{visibleKeys.length === 1 ? '' : 's'}
          {dirtyInView > 0 && ` · ${dirtyInView} changed`}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={rowStyle}>
          <div style={{ ...keyColStyle,  ...colHeaderStyle }}>Key</div>
          <div style={{ ...enColStyle,   ...colHeaderStyle }}>English (reference)</div>
          <div style={{ ...tgtColStyle,  ...colHeaderStyle }}>{langLabel}</div>
        </div>

        {visibleKeys.length === 0 && (
          <div className="dz-loading">No strings match "{search}"</div>
        )}

        {visibleKeys.map((k) => {
          const enVal  = refFlat[k] ?? '';
          const tgtVal = edited[k]  ?? '';
          const isEmpty  = tgtVal === '';
          const changed  = tgtVal !== enVal && !isEmpty;

          return (
            <div key={k} style={{ ...rowStyle, background: isEmpty ? 'rgba(248,81,73,0.06)' : undefined }}>
              <div style={keyColStyle}>
                <code style={keyCodeStyle}>{k.split('.').slice(1).join('.')}</code>
              </div>
              <div style={enColStyle}>
                <span style={{ fontSize: 13, color: 'var(--dz-text)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {enVal}
                </span>
              </div>
              <div style={tgtColStyle}>
                <input
                  className="dz-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    borderColor: isEmpty ? 'var(--dz-error)' : changed ? 'var(--dz-accent)' : undefined,
                  }}
                  value={tgtVal}
                  onChange={(e) => onEdit(k, e.target.value)}
                  placeholder={enVal}
                  spellCheck
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '220px 1fr 1fr',
  gap: 8,
  alignItems: 'start',
  padding: '6px 4px',
  borderBottom: '1px solid var(--dz-border)',
};
const colHeaderStyle = {
  padding: '4px 6px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--dz-text-dim)',
};
const keyColStyle  = { display: 'flex', alignItems: 'center', minWidth: 0 };
const enColStyle   = { display: 'flex', alignItems: 'center', minWidth: 0 };
const tgtColStyle  = { minWidth: 0 };
const keyCodeStyle = {
  fontFamily: 'ui-monospace, Fira Code, monospace',
  fontSize: 11,
  color: 'var(--dz-text-dim)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// ── Add Language modal ────────────────────────────────────────────────────────

function AddLanguageModal({ existingCodes, onConfirm, onClose }) {
  const [code,  setCode]  = useState('');
  const [label, setLabel] = useState('');
  const codeRef = useRef(null);

  useEffect(() => { codeRef.current?.focus(); }, []);

  const codeClean = code.trim().toLowerCase();
  const conflict  = existingCodes.includes(codeClean);
  const valid     = codeClean.length >= 2 && codeClean.length <= 8 && /^[a-z]+$/.test(codeClean) && label.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!valid || conflict) return;
    onConfirm({ code: codeClean, label: label.trim() });
  }

  return (
    <div className="dz-modal-backdrop" onClick={onClose}>
      <div className="dz-modal" onClick={(e) => e.stopPropagation()}>
        <header className="dz-modal-header">
          <h2>Add Language</h2>
          <button className="dz-btn dz-btn-ghost" onClick={onClose}>×</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="dz-modal-body">
            <label className="dz-field">
              <span className="dz-field-label">Language code</span>
              <input
                ref={codeRef}
                className="dz-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                placeholder="es, fr, de, zh, ja…"
                maxLength={8}
                spellCheck={false}
                autoComplete="off"
              />
              <span className="dz-field-help">
                ISO 639-1 code (2–3 letters). This becomes the folder name under <code>locales/</code> and the identifier used by i18next.
              </span>
              {conflict && <span className="dz-msg dz-msg-error">"{codeClean}" already exists.</span>}
            </label>

            <label className="dz-field">
              <span className="dz-field-label">Display name</span>
              <input
                className="dz-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Español, Français, Deutsch…"
                spellCheck={false}
                autoComplete="off"
              />
              <span className="dz-field-help">
                Shown in the in-game language selector. Use the native name (e.g. "Español" not "Spanish").
              </span>
            </label>

            <div style={{
              padding: '10px 12px',
              background: 'var(--dz-bg)',
              border: '1px solid var(--dz-border)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--dz-text-dim)',
              lineHeight: 1.55,
            }}>
              This will:
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Create <code>src/i18n/locales/{codeClean || '??'}/ui.json</code></li>
                <li>Create <code>src/i18n/locales/{codeClean || '??'}/game.json</code></li>
                <li>Update <code>src/i18n/languages.json</code></li>
              </ul>
              Pull the changes locally and restart the dev server to see the language in the game.
            </div>
          </div>
          <footer className="dz-modal-footer">
            <button type="button" className="dz-btn dz-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="dz-btn dz-btn-primary" disabled={!valid || conflict}>
              Create language
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ── Settings modal ────────────────────────────────────────────────────────────

function SettingsModal({ pat, tokenStatus, tokenBusy, onSave, onClear, onClose }) {
  const [draft, setDraft] = useState(pat);
  return (
    <div className="dz-modal-backdrop" onClick={onClose}>
      <div className="dz-modal" onClick={(e) => e.stopPropagation()}>
        <header className="dz-modal-header">
          <h2>Settings</h2>
          <button className="dz-btn dz-btn-ghost" onClick={onClose}>×</button>
        </header>
        <div className="dz-modal-body">
          <label className="dz-field">
            <span className="dz-field-label">GitHub Personal Access Token</span>
            <input
              type="password"
              className="dz-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="github_pat_…"
              spellCheck={false}
              autoComplete="off"
            />
            <span className="dz-field-help">
              Fine-grained PAT with <code>Contents: Read and write</code> on <code>{REPO_OWNER}/{REPO_NAME}</code>.
              Stored in this tab's sessionStorage only.
            </span>
          </label>
          <div className="dz-token-status">
            {tokenBusy && <span className="dz-msg dz-msg-info">Verifying…</span>}
            {!tokenBusy && tokenStatus.ok && (
              <span className="dz-msg dz-msg-success">
                ✓ Authenticated as {tokenStatus.login} · push access to {tokenStatus.repoFullName}
              </span>
            )}
            {!tokenBusy && !tokenStatus.ok && tokenStatus.reason !== 'untested' && tokenStatus.reason !== 'empty' && (
              <span className="dz-msg dz-msg-error">{authReasonDetail(tokenStatus.reason)}</span>
            )}
          </div>
        </div>
        <footer className="dz-modal-footer">
          <button className="dz-btn dz-btn-ghost" onClick={onClear}>Forget PAT</button>
          <button className="dz-btn dz-btn-primary" onClick={() => { onSave(draft); onClose(); }}>Save</button>
        </footer>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authReasonLabel(reason) {
  switch (reason) {
    case 'empty':            return 'No PAT';
    case 'unauthorized':     return 'Bad PAT';
    case 'repo-not-visible': return 'Repo hidden';
    case 'no-push':          return 'No push access';
    case 'network':          return 'Network error';
    default:                 return reason;
  }
}

function authReasonDetail(reason) {
  switch (reason) {
    case 'unauthorized':     return 'Token was rejected by GitHub. Check it was copied correctly.';
    case 'repo-not-visible': return `Token does not grant access to ${REPO_OWNER}/${REPO_NAME}.`;
    case 'no-push':          return 'Token lacks push access. Regenerate with Contents: Read and write.';
    case 'network':          return 'Could not reach api.github.com — check your connection.';
    default:                 return `Unexpected error: ${reason}`;
  }
}
