import { fmt } from '../utils/format';
import { upgradeIconSrc } from '../utils/upgradeIcons';

const BASE = import.meta.env.BASE_URL ?? '/';
const PLACEHOLDER_SRC = `${BASE}ui/upgrade_default.png`;

// Swap broken icons to the transparent placeholder so missing art never shows
// a broken-image glyph. Self-resets the handler so we don't loop if the
// placeholder itself is missing.
function handleIconError(e) {
  if (e.currentTarget.src.endsWith('/upgrade_default.png')) return;
  e.currentTarget.src = PLACEHOLDER_SRC;
}

/**
 * Inscribed Tablet — Ma Shan Zheng glyph per upgrade category. The
 * producer-doubles keep their producer sprite (the established
 * "doubling this Garden / Furnace / Pillar" identity); every other
 * category gets a calligraphy glyph in the framed inset so the
 * tablet vocabulary reads consistently across the grid.
 */
const CATEGORY_GLYPH = {
  crystal_tap:    '珠', // pearl / qi-orb tap
  focus_mult:     '息', // breath / focus
  offline_rate:   '眠', // sleep / offline accrual
  offline_cap:    '時', // time / duration
};

// Mechanic-tier glyphs — one per mechanic. Mechanic ids appear inside
// upgrade ids like `u_crystal_reservoir_t1`; extract and look up.
const MECHANIC_GLYPH = {
  crystal_reservoir:  '蓄', // store / reservoir
  divine_qi:          '神', // divine / spirit
  crystal_click:      '击', // strike / click
  pattern_click:      '連', // chain / pattern
  consecutive_focus:  '持', // sustain / hold
};

function mechanicIdOf(upgrade) {
  return upgrade.id.replace(/^u_/, '').replace(/_t\d+$/, '');
}

/**
 * Resolve the visual identity of an upgrade card.
 * Returns either { kind: 'sprite', src } (producer-doubles) or
 * { kind: 'glyph', char, accent } (calligraphy stamp).
 */
function identityFor(upgrade) {
  if (upgrade.category === 'producer_double') {
    return { kind: 'sprite', src: upgradeIconSrc(upgrade) };
  }
  if (upgrade.category === 'mechanic_tier') {
    const mid = mechanicIdOf(upgrade);
    return { kind: 'glyph', char: MECHANIC_GLYPH[mid] ?? '修', accent: false };
  }
  return { kind: 'glyph', char: CATEGORY_GLYPH[upgrade.category] ?? '修', accent: true };
}

/**
 * InscribedTablet — the upgrade card in the Estate Pavilions redesign.
 *
 * A vertical framed inset (same chassis as the pavilion plaque emblem),
 * Cinzel name, system-sans one-line effect, vermillion cost cartouche
 * at the bottom. The frame holds either the producer sprite (for
 * producer-doubles) or a calligraphy glyph (every other category).
 *
 * Owned upgrades render in the compact chip pile below the grid; this
 * component renders unowned variants only. Owned chips are drawn by
 * `OwnedUpgradeChip` below.
 *
 * Props match the old UpgradeCard so CultivationScreen drops in cleanly:
 *   - upgrade:    upgrade definition (from data/upgrades.js)
 *   - unlocked:   purchase condition met?
 *   - qi:         live qi snapshot (display-only)
 *   - onBuy:      (id) => void — caller spends qi atomically
 */
export default function InscribedTablet({ upgrade, unlocked, qi, onBuy }) {
  const affordable = unlocked && qi >= upgrade.cost;
  const ident = identityFor(upgrade);

  return (
    <div className={`it${unlocked ? '' : ' it-locked'}`}>
      <div className="it-frame" aria-hidden="true">
        {ident.kind === 'sprite' ? (
          <img className="it-emblem" src={ident.src} alt="" draggable="false" onError={handleIconError} />
        ) : (
          <span className={`it-glyph${ident.accent ? ' it-glyph-accent' : ''}`}>{ident.char}</span>
        )}
      </div>
      <div className="it-name">{upgrade.name}</div>
      <div className="it-desc">{upgrade.desc}</div>
      <button
        type="button"
        className={`it-cost${unlocked ? (affordable ? '' : ' it-cost-dim') : ' it-cost-sealed'}`}
        onClick={() => onBuy(upgrade.id)}
        disabled={!affordable}
      >
        {unlocked ? `${fmt(upgrade.cost)} Qi` : 'Locked'}
      </button>
    </div>
  );
}

/**
 * Compact owned-upgrade chip — Ma Shan Zheng glyph (or producer sprite
 * thumbnail for producer-doubles) + name. Lets the Inscribed section
 * pack many tablets into a few rows without consuming the buyable
 * grid's visual budget.
 */
export function OwnedUpgradeChip({ upgrade }) {
  const ident = identityFor(upgrade);
  return (
    <div
      className="it-chip"
      title={upgrade.desc}
      aria-label={`${upgrade.name} — ${upgrade.desc}`}
    >
      {ident.kind === 'sprite' ? (
        <img className="it-chip-icon" src={ident.src} alt="" draggable="false" onError={handleIconError} />
      ) : (
        <span className="it-chip-glyph" aria-hidden="true">{ident.char}</span>
      )}
      <span className="it-chip-name">{upgrade.name}</span>
    </div>
  );
}
