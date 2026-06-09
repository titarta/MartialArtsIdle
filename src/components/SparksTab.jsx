import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
import {
  QI_SPARK_BY_ID,
  SPARK_RARITY,
  SPARK_COPY,
  TRINITY_SPARK_IDS,
  TRINITY_CONVERGENCE_MULT,
} from '../data/qiSparks';
import { PRODUCERS_BY_ID } from '../data/producers';
import { fmtRate } from '../utils/format';

const BASE = import.meta.env.BASE_URL;

/**
 * SparksTab — "Karmic Charms" presentation of the player's spirit inventory.
 *
 * Two surfaces live here:
 *   1. The TAB — 2-up grid of charm tokens (Charm component). Each token is a
 *      jewel-like talisman: dark recessed mount + icon, Cinzel name in rarity
 *      color, top-right gem dot, optional ✦ for trinity pieces, ember motes
 *      on legendaries, stack badge on stacked permanents.
 *   2. The DETAIL MODAL (CharmDetail component, opens on tap) — hero-led
 *      inspect view: 92px mount with rarity halo, faint calligraphy character
 *      behind the icon (heroGlyph from SPARK_COPY, falls back to 神), Cinzel
 *      name + horizontal-rule rarity banner. Body sections: Effect / Currently
 *      / Example / Lore, each with a Cinzel uppercase eyebrow + gold rule.
 *      Lore is italic between hairline rules. Footer 印 stamp.
 *
 * Out of scope here (intentionally untouched):
 *   - Timed sparks — they live exclusively on the HomeScreen ActiveBuffsChip
 *     popover. Filtered out below.
 *   - The choice reveal (QiSparkChoiceModal.jsx) — separate component,
 *     separate redesign pass.
 */

const DEFAULT_HERO_GLYPH = '神';

/** Sprite-or-emoji icon. */
function Icon({ icon, fallback = '✦', className }) {
  const ic = icon ?? fallback;
  if (typeof ic === 'string' && ic.startsWith('/')) {
    return <img className={`${className}-img`} src={`${BASE}${ic.replace(/^\//, '')}`} alt="" draggable={false} />;
  }
  return <span className={`${className}-emoji`} aria-hidden="true">{ic}</span>;
}

/**
 * Resolve the display icon for a spark id. Priority:
 *   1. SPARK_COPY[id].icon — explicit override (producer sprite for
 *      legendaries, themed emoji for common/uncommon)
 *   2. mechanic-tier cards reuse the same medallion icon the upgrades
 *      shop already shows (ui/upgrade_<mechanicId>.png — Crystal
 *      Reservoir, Divine Qi, etc.)
 *   3. fallback to ✦
 */
function iconFor(sparkId) {
  const copy = SPARK_COPY[sparkId];
  if (copy?.icon) return copy.icon;
  const card = QI_SPARK_BY_ID[sparkId];
  if (card?.kind === 'mechanic' && card.mechanicId) {
    return `/ui/upgrade_${card.mechanicId}.png`;
  }
  return '✦';
}

/** Resolve the calligraphy character drawn behind the icon in the modal hero. */
function heroGlyphFor(sparkId) {
  const copy = SPARK_COPY[sparkId];
  return copy?.heroGlyph || DEFAULT_HERO_GLYPH;
}

/** Tiny markdown-ish bold parser for **strong** → <strong>. */
function renderRich(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/**
 * Compute a one-line "Currently: …" string describing the live contribution
 * of a spark. Returns null if there's nothing meaningful to show.
 *
 * The tab card has tight horizontal room (~30 chars before truncation), so
 * the strings here are tuned to read on one line. The detail modal renders
 * the same value but can wrap freely.
 */
function describeContribution(spark, card, ctx, t) {
  const eff = card?.effect;
  if (!eff) return null;
  const { ownedMap, rate } = ctx;
  const stacks = spark.stacks ?? 1;
  const pname = (pid) => PRODUCERS_BY_ID[pid]?.name ?? pid;

  switch (eff.type) {
    // ── Timed / event-count common buffs ────────────────────────────
    case 'qi_mult': {
      const bonus = eff.value;
      const extra = rate * bonus;
      return `+${Math.round(bonus * 100)}% qi/s → ≈ ${fmtRate(extra)} qi/s extra`;
    }
    case 'focus_mult_bonus':
      return `+${Math.round(eff.value * 100)}% Focus multiplier (active while holding Focus)`;
    // ── Permanent stacked uncommons ─────────────────────────────────
    case 'qi_flat_per_stack':
      return `+${eff.value * stacks} base qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'qi_mult_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'focus_mult_bonus_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% Focus mult${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'gate_reduction_per_stack':
      return `−${Math.round(eff.value * stacks * 100)}% major-realm gate cost${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'offline_qi_mult_per_stack':
      return `+${Math.round(eff.value * stacks * 100)}% offline qi${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    case 'qi_mult_per_breakthrough_per_stack': {
      const accrued = spark.breakthroughsAccrued ?? 0;
      const totalPct = Math.round(eff.value * stacks * accrued * 100);
      return `+${totalPct}% qi/s (${stacks}× × ${accrued} BT)`;
    }
    // ── Legendary producer-synergy ──────────────────────────────────
    case 'producer_self_mult':
      return `${pname(eff.target)} ×${eff.mult}`;
    case 'producer_count_mult': {
      const src = ownedMap[eff.source] ?? 0;
      const mult = 1 + src * eff.perEach;
      return `${src} × ${pname(eff.source)} → ×${mult.toFixed(2)}`;
    }
    case 'producer_count_threshold_mult': {
      const src = ownedMap[eff.source] ?? 0;
      return src >= eff.threshold
        ? `Active → ${pname(eff.target)} ×${eff.mult}`
        : `Dormant — need ${eff.threshold} ${pname(eff.source)}`;
    }
    case 'producer_pair_synergy': {
      const a = ownedMap[eff.producerA] ?? 0;
      const b = ownedMap[eff.producerB] ?? 0;
      const pairs = Math.min(a, b);
      const mult = 1 + pairs * (eff.mult - 1);
      return pairs > 0
        ? `${pairs} pair${pairs > 1 ? 's' : ''} → both ×${mult.toFixed(2)}`
        : `No pairs (need ≥1 of each)`;
    }
    case 'producer_pair_global_mult': {
      const a = ownedMap[eff.producerA] ?? 0;
      const b = ownedMap[eff.producerB] ?? 0;
      const pairs = Math.min(a, b);
      const totalPct = Math.round(pairs * (eff.mult - 1) * 100);
      return pairs > 0
        ? `${pairs} pair${pairs > 1 ? 's' : ''} → +${totalPct}% global qi/s`
        : `No pairs (need ≥1 of each)`;
    }
    case 'phoenix_reborn': {
      const phStacks = spark.phoenixRebornStacks ?? 0;
      return phStacks > 0
        ? `${phStacks} rebirth${phStacks > 1 ? 's' : ''} → others ×${Math.pow(2, phStacks)}`
        : t ? t('sparks.waitingNextRealm') : 'Waiting on next major realm';
    }
    // ── Dial-9 additions ────────────────────────────────────────────
    case 'producer_flat_per_unit':
      return `+${eff.value} per-unit qi/s on every producer`;
    case 'qi_mult_per_focus_second_per_stack': {
      let focusSeconds = 0;
      try {
        const v = Number(JSON.parse(localStorage.getItem('mai_qi_sparks_focus_seconds_run')));
        if (Number.isFinite(v)) focusSeconds = v;
      } catch {}
      const perStack = Math.min(eff.perStackCap ?? Infinity, (eff.value ?? 0) * focusSeconds);
      const totalPct = Math.round(perStack * stacks * 100);
      return `${focusSeconds}s held → +${totalPct}% qi/s${stacks > 1 ? ` (${stacks} stacks)` : ''}`;
    }
    case 'producer_cost_discount': {
      const charges = spark.chargesRemaining ?? 0;
      const pct = Math.round((eff.fraction ?? 0) * 100);
      return charges > 0
        ? `−${pct}% producer cost · ${charges} buy${charges > 1 ? 's' : ''} left`
        : t ? t('sparks.bargainSpent') : 'Bargain spent';
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARM — the small token card (tab grid item)
// ─────────────────────────────────────────────────────────────────────────────

function Charm({ spark, ctx, isTrinityActive, onOpen }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const card = QI_SPARK_BY_ID[spark.sparkId];
  if (!card) return null;
  const name = gt('qiSparks', spark.sparkId, 'name', card.name);
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const icon = iconFor(spark.sparkId);
  const isMechanic = card.kind === 'mechanic';
  const isLegendary = card.rarity === 'legendary';
  const isTrinityPiece = card.trinityPiece === true;

  const contribution = describeContribution(spark, card, ctx, t);
  const stacks = spark.stacks ?? 1;
  const showStackBadge = card.kind === 'permanent' && stacks > 1;

  // Mechanic-kind sparks extend the rarity ramp with a soft cyan tint so the
  // player can tell mechanic unlocks apart from rolled rarities. The CSS uses
  // var(--r) as the unifying knob — set per-instance, no rarity-specific
  // classes required.
  const rarityToken = isMechanic ? 'var(--r-mechanic)' : rarity.color;
  const rarityClass = isMechanic ? 'charm-r-mechanic' : `charm-r-${card.rarity}`;

  // Trinity pieces glow brighter once the full convergence is active.
  const trinityActive = isTrinityPiece && isTrinityActive;

  return (
    <button
      type="button"
      className={`charm ${rarityClass}${isLegendary ? ' charm-legendary' : ''}${trinityActive ? ' charm-trinity-active' : ''}`}
      style={{ '--r': rarityToken }}
      onClick={() => onOpen(spark)}
      aria-label={`${name} — ${t('sparks.tapForDetails')}`}
    >
      <span className="charm-rarity-mark" aria-hidden="true" />
      {isTrinityPiece && <span className="charm-trinity" aria-hidden="true">✦</span>}
      {showStackBadge && <span className="charm-stack">×{stacks}</span>}
      <div className="charm-mount">
        <Icon icon={icon} className="charm-icon" />
      </div>
      <div className="charm-name">{name}</div>
      {contribution && <div className="charm-line">{contribution}</div>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARM DETAIL — hero-led inspect modal
// ─────────────────────────────────────────────────────────────────────────────

function CharmDetail({ spark, ctx, isTrinityActive, onClose }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const card = QI_SPARK_BY_ID[spark?.sparkId];
  if (!card) return null;
  const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
  const copy = SPARK_COPY[spark.sparkId];
  const icon = iconFor(spark.sparkId);
  const glyph = heroGlyphFor(spark.sparkId);
  const name = gt('qiSparks', spark.sparkId, 'name', card.name);
  const effectText = copy?.effectText != null
    ? gt('sparkCopy', spark.sparkId, 'effectText', copy.effectText)
    : gt('qiSparks', spark.sparkId, 'description', card.description ?? '');
  const exampleHtml = copy?.exampleText != null ? gt('sparkCopy', spark.sparkId, 'exampleText', copy.exampleText) : null;
  const loreHtml = copy?.loreText != null ? gt('sparkCopy', spark.sparkId, 'loreText', copy.loreText) : null;
  const contribution = describeContribution(spark, card, ctx, t);

  const isMechanic = card.kind === 'mechanic';
  const rarityToken = isMechanic ? 'var(--r-mechanic)' : rarity.color;
  const rarityLabel = isMechanic ? t('sparks.mechanicLabel') : rarity.label;
  const rarityClass = isMechanic ? 'charm-detail-r-mechanic' : `charm-detail-r-${card.rarity}`;

  // Portal to <body> so the fixed overlay escapes .screen-container's
  // `transform: translateZ(0)` stacking trap. Rendered inline, the overlay
  // is confined to that transformed ancestor and the positioned .cs-qi-strip
  // header pokes through on top of it. Matches the app's modal convention
  // (DetailModal, ActiveBuffsChip, tooltips all portal to document.body).
  return createPortal(
    <div
      className="charm-detail-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`charm-detail-panel ${rarityClass}`}
        style={{ '--r': rarityToken }}
        role="dialog"
        aria-modal="true"
        aria-label={name}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.closeAriaLabel')}>✕</button>

        <header className="charm-detail-hero" data-glyph={glyph}>
          <div className="charm-detail-hero-mount">
            <Icon icon={icon} className="charm-detail-hero-icon" />
          </div>
          <h2 className="charm-detail-hero-name">{name}</h2>
          <div className="charm-detail-hero-rarity">{rarityLabel}</div>
        </header>

        <div className="charm-detail-body">
          <section className="charm-detail-section">
            <div className="charm-detail-label">{t('sparks.detailEffect')}</div>
            <div className="charm-detail-text">{renderRich(effectText)}</div>
          </section>

          {contribution && (
            <section className="charm-detail-section">
              <div className="charm-detail-label">{t('sparks.detailCurrently')}</div>
              <div className="charm-detail-currently">{contribution}</div>
            </section>
          )}

          {exampleHtml && (
            <section className="charm-detail-section">
              <div className="charm-detail-label">{t('sparks.detailExample')}</div>
              <div className="charm-detail-text" dangerouslySetInnerHTML={{ __html: exampleHtml }} />
            </section>
          )}

          {loreHtml && (
            <section className="charm-detail-section">
              <div className="charm-detail-label">{t('sparks.detailLore')}</div>
              <div className="charm-detail-lore">{loreHtml}</div>
            </section>
          )}

          {isTrinityActive && card.trinityPiece && (
            <div className="charm-detail-trinity-note">
              {t('sparks.trinityActive', { n: Math.round((TRINITY_CONVERGENCE_MULT - 1) * 100) })}
            </div>
          )}

          <footer className="charm-detail-footer">
            <span className="charm-detail-stamp">印</span>
            <span>{t('sparks.charmFooter', { label: rarityLabel })}</span>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION wrapper — rarity-themed header with lantern bar
// ─────────────────────────────────────────────────────────────────────────────

function CharmSection({ label, sublabel, count, sectionColor, children }) {
  if (!count) return null;
  return (
    <section className="charm-section" style={{ '--section-color': sectionColor }}>
      <header className="charm-section-header">
        <span className="charm-section-label">{label}</span>
        {sublabel && <span className="charm-section-sub">{sublabel}</span>}
        <span className="charm-section-count">{count}</span>
      </header>
      <div className="charm-grid">{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function SparksTab({ qiSparks, producers, cultivation }) {
  const { t } = useTranslation('ui');
  const [now, setNow] = useState(Date.now());
  const [rate, setRate] = useState(() => cultivation?.rateRef?.current ?? 0);
  const [openSpark, setOpenSpark] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setRate(cultivation?.rateRef?.current ?? 0);
    }, 250);
    return () => clearInterval(id);
  }, [cultivation?.rateRef]);

  // Close detail on Escape
  useEffect(() => {
    if (!openSpark) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpenSpark(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSpark]);

  // Timed sparks (expiresAt) live on the HomeScreen ActiveBuffsChip popover
  // exclusively. Filtering them out here avoids duplicating the same buff in
  // two places. This tab is the canonical view for PERSISTENT build state.
  const activeSparks = qiSparks?.activeSparks ?? [];
  const live = activeSparks.filter(s => !s.expiresAt);

  // Group by rarity / kind for sectioning
  const groups = { legendary: [], uncommon: [], mechanic: [] };
  for (const s of live) {
    const card = QI_SPARK_BY_ID[s.sparkId];
    if (!card) continue;
    if (card.rarity === 'legendary') groups.legendary.push(s);
    else if (card.kind === 'mechanic') groups.mechanic.push(s);
    else groups.uncommon.push(s);
  }
  // Pin trinity pieces to the front of the legendary list so the set chase
  // reads visually from left to right when partially complete.
  groups.legendary.sort((a, b) => {
    const ai = TRINITY_SPARK_IDS.indexOf(a.sparkId);
    const bi = TRINITY_SPARK_IDS.indexOf(b.sparkId);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return 0;
  });

  const isTrinityActive = TRINITY_SPARK_IDS.every(id => live.some(s => s.sparkId === id));
  const ctx = { now, rate, ownedMap: producers?.owned ?? {}, qiSparks };

  if (live.length === 0) {
    return (
      <div className="st-empty">
        <div className="st-empty-title">{t('sparks.emptyTitle')}</div>
        <div className="st-empty-text">{t('sparks.emptyText')}</div>
      </div>
    );
  }

  // Re-resolve the open spark from `live` each render so the modal's
  // contribution math stays in sync with parent updates.
  const openSparkLive = openSpark
    ? live.find(s => s.instanceId === openSpark.instanceId) ?? null
    : null;

  return (
    <div className="charm-root">
      {isTrinityActive && (
        <div className="st-trinity-banner">
          <span className="stb-mark">✦</span>
          <span className="stb-label">{t('sparks.trinityLabel')}</span>
          <span className="stb-bonus">{t('sparks.globalQiBonus', { n: Math.round((TRINITY_CONVERGENCE_MULT - 1) * 100) })}</span>
          <span className="stb-mark">✦</span>
        </div>
      )}

      <CharmSection
        label={t('sparks.sectionLegendary')}
        sublabel={t('sparks.sectionLegendarySub')}
        count={groups.legendary.length}
        sectionColor="var(--r-legendary)"
      >
        {groups.legendary.map(s => (
          <Charm key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </CharmSection>

      <CharmSection
        label={t('sparks.sectionPermanent')}
        sublabel={t('sparks.sectionPermanentSub')}
        count={groups.uncommon.length}
        sectionColor="var(--r-uncommon)"
      >
        {groups.uncommon.map(s => (
          <Charm key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </CharmSection>

      <CharmSection
        label={t('sparks.sectionMechanics')}
        sublabel={t('sparks.sectionMechanicsSub')}
        count={groups.mechanic.length}
        sectionColor="var(--r-mechanic)"
      >
        {groups.mechanic.map(s => (
          <Charm key={s.instanceId} spark={s} ctx={ctx} isTrinityActive={isTrinityActive} onOpen={setOpenSpark} />
        ))}
      </CharmSection>

      {openSparkLive && (
        <CharmDetail
          spark={openSparkLive}
          ctx={ctx}
          isTrinityActive={isTrinityActive}
          onClose={() => setOpenSpark(null)}
        />
      )}
    </div>
  );
}
