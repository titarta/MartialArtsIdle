/**
 * PillRefinement — the Meridian Furnace alchemy screen.
 *
 * Three-layer crafting loop on top of the Spirit Garden:
 *
 *   Layer 1  REFINE     3 plants    →  1 Material        (15 min)
 *   Layer 2  COMBINE    3 Materials →  1 Pill            (1 hr)
 *   Layer 3  TRANSCEND  3 Pills     →  1 Foundation Pill (6 hr, permanent)
 *
 * Cauldrons process one cook at a time. Heat is a shared pool that
 * regenerates at a rate scaling with the Meridian Furnace producer count.
 * Higher heat investment = higher output magnitude (×1, ×1.5, ×2, ×3
 * tiers).
 *
 * Note on hooking: the App-level useFurnace owns the heat-regen tick and
 * the Foundation aggregation. This screen calls useFurnace AGAIN with no
 * arguments, which is safe because the hook reads from the same
 * localStorage key — both copies stay in sync via the persistence layer.
 * Cauldron count + heat regen rate are pulled from the App-level hook by
 * way of the live state; this hook reads from localStorage on every tick.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  MATERIALS, PILLS, FOUNDATIONS,
  LAYER_DEF, HEAT_QUALITY_TIERS,
  heatQualityLabel,
  resolveMaterial, resolvePill, resolveFoundation,
  PILL_TO_FOUNDATION,
} from '../../data/furnace';
import useFurnace from '../../hooks/useFurnace';

const BASE = import.meta.env.BASE_URL;
const url = (s) => (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;

function fmtCountdown(ms) {
  if (ms <= 0) return 'ready';
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function fmtHeat(now, cap) {
  return `${Math.floor(now)} / ${Math.floor(cap)}`;
}

// ── Layout primitives ──────────────────────────────────────────────────────
function HeatBar({ heat, cap, regenPerSec }) {
  const pct = Math.max(0, Math.min(100, (heat / cap) * 100));
  const hot = pct >= 75;
  return (
    <div className={`pr-heat ${hot ? 'pr-heat-hot' : ''}`}>
      <div className="pr-heat-label">
        <span className="pr-heat-lbl">Heat</span>
        <span className="pr-heat-amt">{fmtHeat(heat, cap)}</span>
        <span className="pr-heat-regen">+{(regenPerSec * 60).toFixed(1)}/min</span>
      </div>
      <div className="pr-heat-track" aria-hidden="true">
        <div className="pr-heat-fill" style={{ width: `${pct}%` }}>
          <span className="pr-heat-shimmer" />
          <span className="pr-heat-embers" />
        </div>
      </div>
    </div>
  );
}

function CauldronTile({ cauldron, idx, locked, now }) {
  const isCooking = cauldron?.state === 'cooking';
  const remaining = isCooking ? Math.max(0, cauldron.finishAt - now) : 0;
  return (
    <div className={`pr-cauldron ${isCooking ? 'pr-cauldron-cooking' : ''} ${locked ? 'pr-cauldron-locked' : ''}`}>
      <span className="pr-cauldron-rim" aria-hidden="true" />
      <span className="pr-cauldron-glow" aria-hidden="true" />
      <span className="pr-cauldron-feet" aria-hidden="true" />
      <div className="pr-cauldron-idx">{idx + 1}</div>
      {locked ? (
        <div className="pr-cauldron-locked-text">—</div>
      ) : isCooking ? (
        <>
          <div className="pr-cauldron-layer" data-layer={cauldron.layer}>{cauldron.layer}</div>
          <div className="pr-cauldron-time">{fmtCountdown(remaining)}</div>
          <div className="pr-cauldron-heat">{cauldron.heat}</div>
        </>
      ) : (
        <div className="pr-cauldron-idle">idle</div>
      )}
    </div>
  );
}

// ── Heat selector ─────────────────────────────────────────────────────────
// Calligraphic glyph per tier — these surface a Chinese character above the
// numeric heat value so each tier reads as its own alchemical seal.
const HEAT_TIER_GLYPHS = ['生', '溫', '煉', '極']; // raw · warm · refined · peak

function HeatSelector({ heat, setHeat, min, cap }) {
  return (
    <div className="pr-heat-pick">
      <span className="pr-heat-pick-lbl">Fire</span>
      <div className="pr-heat-dials">
        {HEAT_QUALITY_TIERS.map((tier, idx) => {
          const allowed = tier.heat >= min && tier.heat <= cap;
          const isOn = heat === tier.heat;
          return (
            <button
              key={tier.heat}
              type="button"
              className={`pr-heat-btn pr-heat-tier-${idx} ${isOn ? 'pr-heat-btn-on' : ''}`}
              onClick={() => setHeat(tier.heat)}
              disabled={!allowed}
              title={`${tier.label} — ×${tier.mult} magnitude`}
            >
              <span className="pr-heat-glyph" aria-hidden="true">{HEAT_TIER_GLYPHS[idx]}</span>
              <span className="pr-heat-tier-lbl">{tier.label}</span>
              <span className="pr-heat-tier-num">{tier.heat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Layer 1 — REFINE tab ──────────────────────────────────────────────────
function RefineTab({ furnace, heatCapNow, onRefine }) {
  const plantIds = useMemo(
    () => Object.entries(furnace.plants).filter(([, n]) => n > 0).map(([id]) => id),
    [furnace.plants]
  );
  const [selected, setSelected] = useState([]);
  const [heat, setHeat] = useState(LAYER_DEF.refine.minHeat);

  const pick = (id) => { if (selected.length < 3) setSelected((s) => [...s, id]); };
  const drop = (i) => setSelected((s) => s.filter((_, k) => k !== i));

  const predicted = selected.length === 3 ? resolveMaterial(selected) : null;
  const predictedMat = predicted ? MATERIALS[predicted] : null;
  const heatOk = heat >= LAYER_DEF.refine.minHeat && (furnace.heat || 0) >= heat;
  const canFire = selected.length === 3 && heatOk;

  const fire = () => {
    if (!canFire) return;
    const r = onRefine(selected, heat);
    if (r?.ok) {
      setSelected([]);
      setHeat(LAYER_DEF.refine.minHeat);
    }
  };

  return (
    <div className="pr-tab">
      <div className="pr-tab-head">
        <h3>Refine — 3 plants → 1 Material</h3>
        <span className="pr-tab-cook">Cook: 15 min</span>
      </div>
      <div className="pr-pantry">
        {plantIds.length === 0 && (
          <div className="pr-empty">No plants in pantry. Send some from the Spirit Garden basket.</div>
        )}
        {plantIds.map((id) => (
          <button key={id} type="button" className="pr-pantry-tile" onClick={() => pick(id)} disabled={selected.length >= 3}>
            <img src={url(`/sprites/plants/${id}.png`)} alt="" className="pr-pantry-sprite" />
            <span className="pr-pantry-id">{id.replace(/_/g, ' ')}</span>
            <span className="pr-pantry-count">×{furnace.plants[id]}</span>
          </button>
        ))}
      </div>
      <div className="pr-slots">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pr-slot" onClick={() => selected[i] && drop(i)}>
            {selected[i]
              ? <span className="pr-slot-filled">{selected[i].replace(/_/g, ' ')}</span>
              : <span className="pr-slot-empty">+</span>}
          </div>
        ))}
      </div>
      <div className={`pr-predict ${predictedMat ? 'pr-predict-on' : ''}`}>
        <span className="pr-predict-seal" aria-hidden="true">煉</span>
        <span className="pr-predict-lbl">Will yield</span>
        <strong className="pr-predict-name">{predictedMat?.name ?? '— select 3 ingredients —'}</strong>
        {predictedMat && (
          <span className="pr-predict-sub">Refined from {(predictedMat.plant || 'mixed').replace(/_/g, ' ')}.</span>
        )}
      </div>
      <HeatSelector heat={heat} setHeat={setHeat} min={LAYER_DEF.refine.minHeat} cap={Math.min(heatCapNow, furnace.heat ?? 0)} />
      <button type="button" className="pr-fire" disabled={!canFire} onClick={fire}>
        <span className="pr-fire-glow" aria-hidden="true" />
        <span className="pr-fire-glyph" aria-hidden="true">火</span>
        <span className="pr-fire-label">Ignite — Refine ({heatQualityLabel(heat)})</span>
      </button>
    </div>
  );
}

// ── Layer 2 — COMBINE tab ─────────────────────────────────────────────────
function CombineTab({ furnace, heatCapNow, onCombine }) {
  const materialIds = useMemo(
    () => Object.entries(furnace.materials).filter(([, n]) => n > 0).map(([id]) => id),
    [furnace.materials]
  );
  const [selected, setSelected] = useState([]);
  const [heat, setHeat] = useState(LAYER_DEF.combine.minHeat);

  const pick = (id) => { if (selected.length < 3) setSelected((s) => [...s, id]); };
  const drop = (i) => setSelected((s) => s.filter((_, k) => k !== i));

  const predicted = selected.length === 3 ? resolvePill(selected) : null;
  const predictedPill = predicted ? PILLS[predicted] : null;
  const heatOk = heat >= LAYER_DEF.combine.minHeat && (furnace.heat || 0) >= heat;
  const canFire = selected.length === 3 && heatOk;

  const fire = () => {
    if (!canFire) return;
    const r = onCombine(selected, heat);
    if (r?.ok) {
      setSelected([]);
      setHeat(LAYER_DEF.combine.minHeat);
    }
  };

  return (
    <div className="pr-tab">
      <div className="pr-tab-head">
        <h3>Combine — 3 Materials → 1 Pill</h3>
        <span className="pr-tab-cook">Cook: 1 hr</span>
      </div>
      <div className="pr-pantry">
        {materialIds.length === 0 && (
          <div className="pr-empty">No materials yet. Refine some plants first.</div>
        )}
        {materialIds.map((id) => {
          const m = MATERIALS[id];
          return (
            <button key={id} type="button" className="pr-pantry-tile" onClick={() => pick(id)} disabled={selected.length >= 3}>
              <span className="pr-pantry-orb" style={{ background: m?.color || '#888' }} />
              <span className="pr-pantry-id">{m?.name ?? id}</span>
              <span className="pr-pantry-count">×{furnace.materials[id]}</span>
            </button>
          );
        })}
      </div>
      <div className="pr-slots">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pr-slot" onClick={() => selected[i] && drop(i)}>
            {selected[i]
              ? <span className="pr-slot-filled">{MATERIALS[selected[i]]?.name ?? selected[i]}</span>
              : <span className="pr-slot-empty">+</span>}
          </div>
        ))}
      </div>
      <div className={`pr-predict ${predictedPill ? 'pr-predict-on' : ''}`}>
        <span className="pr-predict-seal" aria-hidden="true">丹</span>
        <span className="pr-predict-lbl">Will yield</span>
        <strong className="pr-predict-name">{predictedPill?.name ?? '— select 3 materials —'}</strong>
        {predictedPill?.desc && <span className="pr-predict-sub">{predictedPill.desc}</span>}
      </div>
      <HeatSelector heat={heat} setHeat={setHeat} min={LAYER_DEF.combine.minHeat} cap={Math.min(heatCapNow, furnace.heat ?? 0)} />
      <button type="button" className="pr-fire" disabled={!canFire} onClick={fire}>
        <span className="pr-fire-glow" aria-hidden="true" />
        <span className="pr-fire-glyph" aria-hidden="true">丹</span>
        <span className="pr-fire-label">Ignite — Combine ({heatQualityLabel(heat)})</span>
      </button>
    </div>
  );
}

// ── Layer 3 — TRANSCEND tab ───────────────────────────────────────────────
function TranscendTab({ furnace, onTranscend, onConsume }) {
  const realPillIds = useMemo(
    () => Object.entries(furnace.pills).filter(([id, n]) => n > 0 && !id.startsWith('capsule:')).map(([id]) => id),
    [furnace.pills]
  );
  // Foundation capsules — produced when transcend completes but Foundation
  // slots are full. Stored as 'capsule:foundationId:heat' entries in the
  // pills bag. Surfaced here so the player knows they exist; they auto-apply
  // when a Foundation slot opens (reincarnation today; manual swap in a
  // future commit).
  const capsules = useMemo(
    () => Object.entries(furnace.pills)
      .filter(([id, n]) => n > 0 && id.startsWith('capsule:'))
      .map(([id, n]) => {
        const [, foundationId] = id.split(':');
        return { id, count: n, foundationId };
      }),
    [furnace.pills]
  );
  const transcendable = realPillIds.filter(id => !!PILL_TO_FOUNDATION[id]);
  const [selected, setSelected] = useState([]);

  const pick = (id) => { if (selected.length < 3) setSelected((s) => [...s, id]); };
  const drop = (i) => setSelected((s) => s.filter((_, k) => k !== i));

  const predicted = selected.length === 3 ? resolveFoundation(selected) : null;
  const predictedFound = predicted ? FOUNDATIONS[predicted] : null;
  const heat = LAYER_DEF.transcend.minHeat;
  const heatOk = (furnace.heat || 0) >= heat;
  const canFire = selected.length === 3 && heatOk && !!predicted;

  const fire = () => {
    if (!canFire) return;
    const r = onTranscend(selected, heat);
    if (r?.ok) setSelected([]);
  };

  return (
    <div className="pr-tab">
      <div className="pr-tab-head">
        <h3>Transcend — 3 of the same Pill → 1 Foundation Pill (permanent)</h3>
        <span className="pr-tab-cook">Cook: 6 hr · Heat: 60</span>
      </div>
      <div className="pr-pantry">
        {realPillIds.length === 0 && (
          <div className="pr-empty">No pills on the shelf. Combine some materials first.</div>
        )}
        {realPillIds.map((id) => {
          const p = PILLS[id];
          const canTrans = transcendable.includes(id);
          return (
            <div key={id} className="pr-pantry-tile pr-pantry-tile-pill">
              <span className="pr-pantry-id">{p?.name ?? id}</span>
              <span className="pr-pantry-count">×{furnace.pills[id]}</span>
              <div className="pr-pantry-actions">
                <button type="button" onClick={() => onConsume(id)}>Consume</button>
                {canTrans && (
                  <button type="button" disabled={selected.length >= 3} onClick={() => pick(id)}>+ Slot</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="pr-slots">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pr-slot" onClick={() => selected[i] && drop(i)}>
            {selected[i]
              ? <span className="pr-slot-filled">{PILLS[selected[i]]?.name ?? selected[i]}</span>
              : <span className="pr-slot-empty">+</span>}
          </div>
        ))}
      </div>
      <div className={`pr-predict pr-predict-divine ${predictedFound ? 'pr-predict-on' : ''}`}>
        <span className="pr-predict-seal" aria-hidden="true">超</span>
        <span className="pr-predict-lbl">Permanent boon</span>
        <strong className="pr-predict-name">{predictedFound?.name ?? '— select 3 identical pills —'}</strong>
        {predictedFound?.desc && <span className="pr-predict-sub">{predictedFound.desc}</span>}
      </div>
      <button type="button" className="pr-fire pr-fire-transcend" disabled={!canFire} onClick={fire}>
        <span className="pr-fire-glow" aria-hidden="true" />
        <span className="pr-fire-glyph" aria-hidden="true">超</span>
        <span className="pr-fire-label">Transcend</span>
      </button>
      {capsules.length > 0 && (
        <div className="pr-capsules">
          <div className="pr-capsules-h">
            Pending Foundation capsules ({capsules.length})
          </div>
          <div className="pr-capsules-note">
            Foundation slots full when these crafted — they will auto-apply
            on reincarnation.
          </div>
          <div className="pr-capsules-grid">
            {capsules.map((c) => {
              const fdef = FOUNDATIONS[c.foundationId];
              return (
                <div key={c.id} className="pr-capsule">
                  <span className="pr-capsule-name">{fdef?.name ?? c.foundationId}</span>
                  <span className="pr-capsule-count">×{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function PillRefinement(_props) {
  const f = useFurnace();
  const [tab, setTab] = useState('refine');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pr-screen">
      <HeatBar heat={f.furnace.heat || 0} cap={f.heatCapNow} regenPerSec={f.heatRegenPerSecNow} />
      <div className="pr-cauldrons">
        {f.furnace.cauldrons.map((c, i) => (
          <CauldronTile key={i} cauldron={c} idx={i} locked={i >= f.cauldronCount} now={now} />
        ))}
      </div>
      <div className="pr-foundations">
        <div className="pr-foundations-head">
          <span className="pr-foundations-glyph" aria-hidden="true">基</span>
          <span className="pr-foundations-title">Foundation</span>
          <span className="pr-foundations-count">{f.furnace.foundations.length}/3</span>
        </div>
        <div className="pr-foundations-slots">
          {[0, 1, 2].map((i) => {
            const fnd = f.furnace.foundations[i];
            const fdef = fnd ? FOUNDATIONS[fnd.id] : null;
            return (
              <div key={i} className={`pr-foundation-medal ${fnd ? 'pr-foundation-medal-on' : ''}`} title={fdef?.desc ?? 'Empty Foundation slot — transcend a pill to fill.'}>
                <span className="pr-foundation-rope" aria-hidden="true" />
                <span className="pr-foundation-seal" aria-hidden="true">{fdef ? '丹' : '○'}</span>
                {fnd && (
                  <span className="pr-foundation-mag">+{((fnd.magnitude || 0) * 100).toFixed(1)}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="pr-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'refine'}    className={`pr-tab-btn pr-tab-refine    ${tab === 'refine'    ? 'pr-tab-on' : ''}`} onClick={() => setTab('refine')}>
          <span className="pr-tab-glyph" aria-hidden="true">火</span>
          <span className="pr-tab-name">Refine</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'combine'}   className={`pr-tab-btn pr-tab-combine   ${tab === 'combine'   ? 'pr-tab-on' : ''}`} onClick={() => setTab('combine')}>
          <span className="pr-tab-glyph" aria-hidden="true">丹</span>
          <span className="pr-tab-name">Combine</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'transcend'} className={`pr-tab-btn pr-tab-transcend ${tab === 'transcend' ? 'pr-tab-on' : ''}`} onClick={() => setTab('transcend')}>
          <span className="pr-tab-glyph" aria-hidden="true">超</span>
          <span className="pr-tab-name">Transcend</span>
        </button>
      </div>
      {tab === 'refine'    && <RefineTab    furnace={f.furnace} heatCapNow={f.heatCapNow} onRefine={f.refine} />}
      {tab === 'combine'   && <CombineTab   furnace={f.furnace} heatCapNow={f.heatCapNow} onCombine={f.combine} />}
      {tab === 'transcend' && <TranscendTab furnace={f.furnace} onTranscend={f.transcend} onConsume={f.consume} />}
    </div>
  );
}
