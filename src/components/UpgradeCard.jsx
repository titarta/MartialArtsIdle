import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
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
 * Resolve the visual identity of an upgrade card. Every upgrade has
 * a dedicated sprite in public/ui/upgrade_*.png; the upgradeIconSrc()
 * utility maps each category/mechanic/producer-double to its file and
 * gracefully falls back to upgrade_default.png if art is missing.
 * The Inscribed Tablet uses these real icons rather than calligraphy
 * glyphs so the card reads as a CONCRETE upgrade, not a stylized stamp.
 */
function identityFor(upgrade) {
  return { kind: 'sprite', src: upgradeIconSrc(upgrade) };
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
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const affordable = unlocked && qi >= upgrade.cost;
  const ident = identityFor(upgrade);
  const name = gt('upgrades', upgrade.id, 'name', upgrade.name);
  const desc = gt('upgrades', upgrade.id, 'desc', upgrade.desc);

  return (
    <div className={`it${unlocked ? '' : ' it-locked'}`}>
      <div className="it-frame" aria-hidden="true">
        {ident.kind === 'sprite' ? (
          <img className="it-emblem" src={ident.src} alt="" draggable="false" onError={handleIconError} />
        ) : (
          <span className={`it-glyph${ident.accent ? ' it-glyph-accent' : ''}`}>{ident.char}</span>
        )}
      </div>
      <div className="it-name">{name}</div>
      <div className="it-desc">{desc}</div>
      <button
        type="button"
        className={`it-cost${unlocked ? (affordable ? '' : ' it-cost-dim') : ' it-cost-sealed'}`}
        onClick={() => onBuy(upgrade.id)}
        disabled={!affordable}
      >
        {unlocked ? `${fmt(upgrade.cost)} Qi` : t('upgrade.locked')}
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
  const gt = useGameText();
  const ident = identityFor(upgrade);
  const name = gt('upgrades', upgrade.id, 'name', upgrade.name);
  const desc = gt('upgrades', upgrade.id, 'desc', upgrade.desc);
  return (
    <div
      className="it-chip"
      title={desc}
      aria-label={`${name} — ${desc}`}
    >
      {ident.kind === 'sprite' ? (
        <img className="it-chip-icon" src={ident.src} alt="" draggable="false" onError={handleIconError} />
      ) : (
        <span className="it-chip-glyph" aria-hidden="true">{ident.char}</span>
      )}
      <span className="it-chip-name">{name}</span>
    </div>
  );
}
