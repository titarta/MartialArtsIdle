/**
 * PillRefinement.jsx — placeholder.
 *
 * The original pill brewing minigame depended on the old herb/recipe pill
 * system that was retired with the v1 Cookie-Clicker pivot. A new pill
 * design is TBD. Until then the producer hooks render this banner so the
 * minigame slot still resolves cleanly.
 *
 * Same prop shape as the other minigames ({ ratePerSec, onAward }) so
 * the dispatch table in MiniGameMode does not need to special-case it.
 */
export default function PillRefinement(_props) {
  return (
    <div className="mg-result" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Pill Refinement
      </div>
      <div style={{ opacity: 0.75 }}>Coming Soon</div>
    </div>
  );
}
