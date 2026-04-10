import { useState, useEffect } from 'react';
import { exportSave, importSave, wipeSave } from '../systems/save';

// Soul stat unlocks at Saint realm (index 24)
const SAINT_INDEX = 24;

function fmt(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ─── SVG Sprites ─────────────────────────────────────────────────────────────

function EssenceSprite({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      {/* Hexagonal crystal body */}
      <polygon
        points="22,3 38,12 38,32 22,41 6,32 6,12"
        fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.8"
      />
      {/* Inner facet lines */}
      <line x1="22" y1="3"  x2="22" y2="41" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.45"/>
      <line x1="6"  y1="22" x2="38" y2="22" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.45"/>
      <line x1="6"  y1="12" x2="38" y2="32" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.3"/>
      <line x1="38" y1="12" x2="6"  y2="32" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.3"/>
      {/* Inner diamond facet */}
      <polygon
        points="22,13 30,22 22,31 14,22"
        fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1"
      />
      {/* Glowing center */}
      <circle cx="22" cy="22" r="3.5" fill="#e0f2fe"/>
      <circle cx="22" cy="22" r="1.5" fill="#fff"/>
    </svg>
  );
}

function SoulSprite({ size = 44, locked = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" opacity={locked ? 0.3 : 1}>
      {/* Dashed outer ring */}
      <circle cx="22" cy="22" r="19" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="3 2.5" fill="#1e1b4b"/>
      {/* 6 lotus petals — each is an ellipse rotated around center */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="22" cy="10" rx="3.5" ry="6.5"
          fill="#4c1d95" stroke="#a855f7" strokeWidth="0.9"
          transform={`rotate(${deg} 22 22)`}
        />
      ))}
      {/* Center iris */}
      <circle cx="22" cy="22" r="6.5" fill="#6d28d9" stroke="#ddd6fe" strokeWidth="1.2"/>
      {/* Pupil highlight */}
      <circle cx="22" cy="22" r="2.5" fill="#f5f3ff"/>
      <circle cx="20.5" cy="20.5" r="1" fill="#fff" opacity="0.7"/>
    </svg>
  );
}

function BodySprite({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      {/* Mountain base */}
      <polygon points="22,4 41,41 3,41" fill="#431407" stroke="#f97316" strokeWidth="1.8"/>
      {/* Inner relief */}
      <polygon points="22,14 32,33 12,33" fill="#7c2d12" stroke="#fb923c" strokeWidth="0.9"/>
      {/* Snow cap */}
      <polygon points="22,4 27.5,17 16.5,17" fill="#fed7aa" opacity="0.85"/>
      {/* Peak shine */}
      <line x1="22" y1="4" x2="22" y2="11" stroke="#fff" strokeWidth="1.5" opacity="0.6"/>
      {/* Base line glow */}
      <line x1="3" y1="41" x2="41" y2="41" stroke="#f97316" strokeWidth="1" opacity="0.35"/>
    </svg>
  );
}

// ─── Triangle connector SVG overlay ──────────────────────────────────────────
// Container is 280×230. Circle centers:
//   Soul    → (140, 44)
//   Essence → ( 44, 186)
//   Body    → (236, 186)
const STAT_COLORS = { soul: '#a855f7', essence: '#38bdf8', body: '#f97316' };
const TRANSITION  = { transition: 'stroke 0.25s, stroke-width 0.25s' };

function TriangleLines({ activeStat }) {
  const lineProps = (a, b) => {
    const lit = activeStat === a || activeStat === b;
    return {
      stroke: lit ? (STAT_COLORS[activeStat] ?? '#2a2a4a') : '#2a2a4a',
      strokeWidth: lit ? 1.8 : 1.2,
      strokeDasharray: '6 4',
      style: TRANSITION,
    };
  };

  return (
    <svg
      className="stat-triangle-lines"
      viewBox="0 0 280 230"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="140" y1="44" x2="44"  y2="186" {...lineProps('soul', 'essence')} />
      <line x1="140" y1="44" x2="236" y2="186" {...lineProps('soul', 'body')} />
      <line x1="44"  y1="186" x2="236" y2="186" {...lineProps('essence', 'body')} />
    </svg>
  );
}

// ─── Single stat circle ───────────────────────────────────────────────────────
function StatCircle({ label, value, locked, glowColor, active, onEnter, onLeave, onClick, children }) {
  return (
    <div
      className={`stat-circle${active ? ' stat-circle-active' : ''}${locked ? ' stat-circle-locked' : ''}`}
      style={{ '--glow': glowColor }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {children}
      <span className="stat-circle-name">{label}</span>
      <span className="stat-circle-val" style={{ color: locked ? 'var(--text-muted)' : glowColor }}>
        {locked ? '???' : fmt(value)}
      </span>
    </div>
  );
}

// ─── Detail panel (shown on hover / tap) ─────────────────────────────────────
function DetailPanel({ stat, qi, law, realmIndex }) {
  const locked = stat === 'soul' && realmIndex < SAINT_INDEX;

  const configs = {
    essence: {
      title: 'Essence',
      subtitle: 'Elemental Power',
      color: '#38bdf8',
      mult: law.essenceMult,
      multKey: 'essence_mult',
      effects: [
        'Drives elemental attacks (fire, water, ice…)',
        'Contributes to DEF alongside Body',
      ],
    },
    soul: {
      title: 'Soul',
      subtitle: 'Spiritual Power',
      color: '#c084fc',
      mult: law.soulMult,
      multKey: 'soul_mult',
      effects: [
        'Drives mental / spiritual attacks',
        'Powers Secret Techniques',
        'Contributes to Intuition',
      ],
      lockMsg: 'Unlocks at Saint realm',
    },
    body: {
      title: 'Body',
      subtitle: 'Physical Power',
      color: '#f97316',
      mult: law.bodyMult,
      multKey: 'body_mult',
      effects: [
        'Drives physical attacks',
        'Contributes to DEF alongside Essence',
      ],
    },
  };

  const cfg = configs[stat];
  const val = Math.floor(qi * cfg.mult);

  return (
    <div className="stat-detail-panel" style={{ '--panel-color': cfg.color }}>
      <div className="sdp-header">
        <span className="sdp-title" style={{ color: cfg.color }}>{cfg.title}</span>
        <span className="sdp-subtitle">{cfg.subtitle}</span>
      </div>
      <div className="sdp-divider" />
      {locked ? (
        <p className="sdp-locked">{cfg.lockMsg}</p>
      ) : (
        <>
          <div className="sdp-formula">
            <code className="sdp-code">
              Qi × {cfg.multKey}
            </code>
            <code className="sdp-code sdp-calc">
              {fmt(qi)} × {cfg.mult} = <strong style={{ color: cfg.color }}>{fmt(val)}</strong>
            </code>
            <span className="sdp-source">via {law.name}</span>
          </div>
          <div className="sdp-divider" />
          <ul className="sdp-effects">
            {cfg.effects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function StatsScreen({ cultivation }) {
  const { qiRef, activeLaw, realmName, realmIndex } = cultivation;

  const [qi, setQi]             = useState(Math.floor(qiRef.current));
  const [activeStat, setActive] = useState(null);

  // Save section state
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [message, setMessage]       = useState(null);

  // Live qi update every 250 ms
  useEffect(() => {
    const id = setInterval(() => setQi(Math.floor(qiRef.current)), 250);
    return () => clearInterval(id);
  }, [qiRef]);

  const isSoulLocked = realmIndex < SAINT_INDEX;
  const essence = Math.floor(qi * activeLaw.essenceMult);
  const soul    = Math.floor(qi * activeLaw.soulMult);
  const body    = Math.floor(qi * activeLaw.bodyMult);
  const def     = essence + body;
  const intuition = isSoulLocked ? null : soul;

  const toggle = (stat) => setActive((s) => (s === stat ? null : stat));
  const enter  = (stat) => setActive(stat);
  const leave  = ()     => setActive(null);

  const flash = (text, isError) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const encoded = exportSave();
    if (!encoded) { flash('No save data found', true); return; }
    navigator.clipboard.writeText(encoded).then(
      () => flash('Save copied to clipboard!', false),
      () => { setImportText(encoded); setShowImport(true); flash('Copy the text manually', false); }
    );
  };

  const handleImport = () => {
    if (!importText.trim()) { flash('Paste your save string first', true); return; }
    const result = importSave(importText);
    if (result.ok) {
      flash('Save imported! Reloading…', false);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      flash(result.error, true);
    }
  };

  const handleWipe = () => {
    if (window.confirm('Are you sure? This will delete ALL progress!')) {
      wipeSave();
      flash('Save wiped! Reloading…', false);
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="screen stats-screen">
      <h1>Character Stats</h1>
      <p className="subtitle">{realmName}</p>

      {/* ── Primary Stats Triangle ── */}
      <div className="stat-triangle-container">
        <TriangleLines activeStat={activeStat} />

        {/* Soul — top center */}
        <div
          className="stat-circle-wrap stat-wrap-soul"
          onMouseEnter={() => enter('soul')}
          onMouseLeave={leave}
          onClick={() => toggle('soul')}
        >
          <StatCircle
            label="Soul"
            value={soul}
            locked={isSoulLocked}
            glowColor="#c084fc"
            active={activeStat === 'soul'}
          >
            <SoulSprite size={40} locked={isSoulLocked} />
          </StatCircle>
        </div>

        {/* Essence — bottom left */}
        <div
          className="stat-circle-wrap stat-wrap-essence"
          onMouseEnter={() => enter('essence')}
          onMouseLeave={leave}
          onClick={() => toggle('essence')}
        >
          <StatCircle
            label="Essence"
            value={essence}
            locked={false}
            glowColor="#38bdf8"
            active={activeStat === 'essence'}
          >
            <EssenceSprite size={40} />
          </StatCircle>
        </div>

        {/* Body — bottom right */}
        <div
          className="stat-circle-wrap stat-wrap-body"
          onMouseEnter={() => enter('body')}
          onMouseLeave={leave}
          onClick={() => toggle('body')}
        >
          <StatCircle
            label="Body"
            value={body}
            locked={false}
            glowColor="#f97316"
            active={activeStat === 'body'}
          >
            <BodySprite size={40} />
          </StatCircle>
        </div>
      </div>

      {/* ── Hover / tap detail panel ── */}
      <div className={`stat-detail-wrap${activeStat ? ' sdw-visible' : ''}`}>
        {activeStat && (
          <DetailPanel
            stat={activeStat}
            qi={qi}
            law={activeLaw}
            realmIndex={realmIndex}
          />
        )}
      </div>

      {/* ── Secondary Stats ── */}
      <div className="secondary-stats">
        <p className="secondary-stats-title">Secondary Stats</p>
        <div className="secondary-stat-row">
          <span className="secondary-stat-label">DEF</span>
          <span className="secondary-stat-formula">Essence + Body</span>
          <span className="secondary-stat-value">{fmt(def)}</span>
        </div>
        <div className="secondary-stat-row">
          <span className="secondary-stat-label">Intuition</span>
          <span className="secondary-stat-formula">from Soul</span>
          <span className="secondary-stat-value" style={{ color: isSoulLocked ? 'var(--text-muted)' : undefined }}>
            {isSoulLocked ? 'Locked' : fmt(intuition)}
          </span>
        </div>
      </div>

      {/* ── Save Data ── */}
      <div className="save-section">
        <h2>Save Data</h2>
        {message && (
          <div className={`save-message ${message.isError ? 'save-error' : 'save-success'}`}>
            {message.text}
          </div>
        )}
        <div className="save-buttons">
          <button className="save-btn" onClick={handleExport}>Export Save</button>
          <button className="save-btn" onClick={() => setShowImport(!showImport)}>Import Save</button>
          <button className="save-btn save-btn-danger" onClick={handleWipe}>Wipe Save</button>
        </div>
        {showImport && (
          <div className="import-area">
            <textarea
              className="import-input"
              placeholder="Paste your save string here…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={3}
            />
            <button className="save-btn" onClick={handleImport}>Load Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsScreen;
