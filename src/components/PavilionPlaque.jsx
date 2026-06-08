import { useMemo, useRef, useEffect, useState } from 'react';
import { fmt, fmtRate } from '../utils/format';
import { getSpriteTier, resolveSprite, resolveTierFor, SPRITE_TIERS } from '../data/producers';
import AudioManager from '../audio/AudioManager';

const BASE = import.meta.env.BASE_URL;

/** Render a sprite — emoji glyph as text, `/`-prefixed string as <img>. */
function Sprite({ sprite, className }) {
  if (typeof sprite === 'string' && sprite.startsWith('/')) {
    return (
      <img
        src={`${BASE}${sprite.replace(/^\//, '')}`}
        alt=""
        className={className}
        draggable={false}
      />
    );
  }
  return <span className={className} aria-hidden="true">{sprite}</span>;
}

/**
 * PavilionPlaque — the producer card in the Estate Pavilions redesign.
 *
 * Each producer is a NAMED PLACE on the player's cultivation grounds. The
 * card is a tributary plaque hung at the pavilion gate. Anatomy (L → R):
 *
 *   [vermillion rail] [framed emblem] [Cinzel lintel + tier row + rate] [tribute cartouche]
 *
 * Locked producers stay visible as SEALED SHRINES: same plaque chassis,
 * bamboo lattice across the frame, wax seal stamped with "封" (seal),
 * dashed "Sealed · R{N}" cartouche where the realm number reads first.
 *
 * The right-edge slot is intentionally agnostic: today it carries the
 * Tribute ×N · cost cartouche. When mini-games unlock the cartouche
 * shrinks and an "Enter Pavilion →" CTA stacks above without redesigning
 * the chassis.
 *
 * Behaviour preserved verbatim from the old ProducerLane:
 *   - Tier resolution + threshold celebration
 *   - Buy with the player's active multiplier
 *   - Cost discount (Tinker's Bargain) applied to displayed AND spent qi
 *   - Detail modal opens on emblem tap
 *   - Affordability gates the buy button
 */
export default function PavilionPlaque({
  producer,
  owned,
  unlocked,
  buyMode,
  qi,
  producers,
  onBuy,
  onShowDetail,
  costDiscount = 0,
  // tree.modifiers from useReincarnationTree. Used for tier gating —
  // discipleTranscendUnlocked flips the disciple's Transcended (idx 4)
  // cap on/off. Defaults to empty so component works in isolation tests.
  treeMods = {},
}) {
  // Resolve current tier + sprite. Tier null when 0 owned. resolveTierFor
  // respects the producer's transcendedNode gate (disc_transcend for the
  // disciple) so Transcended doesn't appear before the node is purchased.
  const tier = unlocked ? resolveTierFor(producer, owned, treeMods) : null;
  const spriteIdx = tier?.idx ?? 0;
  // resolveSprite falls back to the producer's highest available sprite so
  // tiers added later (e.g. transcended) don't drop other producers to Bronze.
  const sprite = resolveSprite(producer, spriteIdx) ?? '◆';

  // Threshold-crossing celebration. Watch tier transitions; on change,
  // briefly toggle .pp-celebrate so CSS plays the burst animation.
  const prevTierNameRef = useRef(tier?.name ?? null);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const next = tier?.name ?? null;
    const prev = prevTierNameRef.current;
    // Derive the rank order from SPRITE_TIERS so adding a new tier (e.g.
    // 'transcended' in 2026-06-08) automatically gets the tier-up sound +
    // celebrate animation. Hardcoded ['bronze','silver','gold','mythic']
    // returned indexOf=-1 for any new tier and silently no-op'd.
    const ranks = SPRITE_TIERS.map(t => t.name);
    const prevRank = ranks.indexOf(prev);
    const nextRank = ranks.indexOf(next);
    if (nextRank > prevRank && next != null) {
      setCelebrating(true);
      try { AudioManager.playSfx('producer_tier_up'); } catch {}
      const t = setTimeout(() => setCelebrating(false), 1400);
      prevTierNameRef.current = next;
      return () => clearTimeout(t);
    }
    prevTierNameRef.current = next;
  }, [tier?.name]);

  // Resolve the effective buy count for the active mode (1 | 10 | 100).
  // Affordability is enforced by the button-enable check below.
  const resolvedCount = useMemo(() => {
    if (!unlocked) return 0;
    return buyMode;
  }, [buyMode, unlocked]);

  const displayCost = useMemo(() => {
    if (!unlocked) return 0;
    const n = Math.max(1, resolvedCount);
    const raw = producers.getCost(producer.id, n);
    if (costDiscount > 0) {
      return Math.max(1, Math.ceil(raw * (1 - costDiscount)));
    }
    return raw;
  }, [producer.id, producers, resolvedCount, unlocked, costDiscount]);

  // ── LOCKED: sealed shrine variant ────────────────────────────────────
  // The wax seal + bamboo lattice + dashed "Sealed · R{N}" cartouche
  // turn the placeholder slot into a PROMISE. Realm number reads first.
  if (!unlocked) {
    const minRealm = producer.unlock?.minRealmIndex ?? '?';
    const teaserSprite = producer.sprites?.[0] ?? '🔒';
    return (
      <article className="pp pp-locked">
        <span className="pp-rail" aria-hidden="true" />
        <button
          type="button"
          className="pp-frame pp-frame-btn"
          onClick={() => onShowDetail?.(producer)}
          aria-label={`${producer.name} details (sealed)`}
        >
          <Sprite sprite={teaserSprite} className="pp-emblem pp-emblem-locked" />
          <span className="pp-seal" aria-hidden="true">
            <span className="pp-seal-glyph">封</span>
          </span>
        </button>
        <div className="pp-lintel">
          <div className="pp-name">{producer.name}</div>
          <div className="pp-tier-row">
            <span className="pp-owned pp-owned-sealed">— sealed shrine —</span>
          </div>
          <div className="pp-gate">Unsealed at <b>realm {minRealm}</b></div>
        </div>
        <div className="pp-sealed-cart" aria-disabled="true">
          <span className="pp-sealed-lab">Sealed</span>
          <span className="pp-sealed-realm">R{minRealm}</span>
        </div>
      </article>
    );
  }

  // ── UNLOCKED: tribute plaque ─────────────────────────────────────────
  const affordable = resolvedCount > 0 && qi >= displayCost;
  const totalQiPerSec = owned * producer.startQiPerSec;
  const tierName = tier?.name ?? null;
  const tierLabel = tier?.label ?? null;
  const tierClass = tier ? `pp-tier-${tier.name}` : '';
  const frameTierClass = tierName === 'gold' ? 'pp-frame-gold' :
                        tierName === 'mythic' ? 'pp-frame-mythic' : '';

  return (
    <article className={`pp ${tierClass} ${frameTierClass}${celebrating ? ' pp-celebrate' : ''}`}>
      <span className="pp-rail" aria-hidden="true" />
      <button
        type="button"
        className="pp-frame pp-frame-btn"
        onClick={() => onShowDetail?.(producer)}
        aria-label={`${producer.name} details`}
      >
        <Sprite sprite={sprite} className="pp-emblem" />
      </button>
      <div className="pp-lintel">
        <div className="pp-name">{producer.name}</div>
        <div className="pp-tier-row">
          {tierLabel && (
            <span className={`pp-tier-badge pp-tier-${tierName}`}>{tierLabel}</span>
          )}
          {owned > 0 && <span className="pp-owned">×{owned} owned</span>}
        </div>
        {owned > 0 ? (
          <div className="pp-rate">Yields <b>{fmtRate(totalQiPerSec)} Qi/s</b></div>
        ) : (
          <div className="pp-rate">Yields <b>{fmtRate(producer.startQiPerSec)} Qi/s</b> per unit</div>
        )}
      </div>
      <div className="pp-cart">
        <button
          type="button"
          className={`pp-cart-btn${affordable ? '' : ' pp-cart-dim'}`}
          onClick={() => onBuy(producer.id, resolvedCount)}
          disabled={!affordable}
        >
          <span className="pp-cart-mult">Tribute ×{buyMode}</span>
          <span className="pp-cart-cost">{fmt(displayCost)} Qi</span>
        </button>
      </div>
    </article>
  );
}
