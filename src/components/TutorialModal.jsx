/**
 * TutorialModal — Sanctum-styled "inscribed scroll" tutorial card.
 *
 * Reusable for any "you just unlocked X — here's how it works" moment. The
 * first user is the crystal-evolution → new-mechanic flow, but the shape is
 * intentionally generic (title + body + optional icon + CTA + Ma Shan Zheng
 * glyph) so it can be dropped in for future onboarding beats.
 *
 * Visual identity (Sanctum v42 redesign):
 *   . Dark lacquer body with brass border + carved corners (matches the
 *     Petition Tablet and toast plaques)
 *   . 3px vermillion banner ribbon along the top edge (ceremonial accent)
 *   . Large Ma Shan Zheng calligraphic glyph as a faded watermark behind
 *     the copy — gives the card its identity even without an icon
 *   . Brass-bordered medallion frame for the optional iconSrc
 *   . Cinzel kicker in brass small caps + Cinzel title in cream
 *   . Brass-bordered CTA matching the REFINE button vocabulary
 *   . Unified .modal-close X top-right (consistent with every other modal)
 *
 * Tier-tinted accent: callers can pass { glowA, glowB } to add a coloured
 * inner glow (e.g. crystal-evolution tutorial uses the tier palette so the
 * celebration → tutorial sequence reads as one visual beat).
 *
 * Lifecycle: caller queues the modal via useEventQueue(). Closing fires
 * onDone, which dismisses the queue entry and lets the next event play.
 */
function TutorialModal({
  title,
  body,
  ctaText = 'Got it',
  iconSrc,
  kicker = 'Unlocked',
  glyph  = '道',  // default Dao / Way
  glowA,
  glowB,
  onDone,
}) {
  // Tier-tinted accent. When the modal is triggered by a crystal evolution,
  // the caller passes the tier's palette so the inner glow matches the
  // celebration that just played.
  const style = (glowA || glowB) ? {
    '--tut-a': glowA ?? 'rgba(220, 175, 110, 0.85)',
    '--tut-b': glowB ?? 'rgba(120, 80, 38, 0.45)',
  } : undefined;
  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label={title} style={style}>
      <div className="tutorial-card">
        {/* Vermillion ribbon — same ceremonial accent as the toast plaque. */}
        <span className="tutorial-ribbon" aria-hidden="true" />

        {/* Unified modal-close (matches every other Sanctum surface). */}
        <button
          type="button"
          className="modal-close tutorial-close"
          aria-label="Dismiss"
          onClick={onDone}
        >✕</button>

        {/* Calligraphic glyph watermark — large, faded, sits behind copy. */}
        <span className="tutorial-glyph" aria-hidden="true">{glyph}</span>

        {/* Optional icon medallion (brass-framed). */}
        {iconSrc && (
          <div className="tutorial-icon-wrap">
            <img src={iconSrc} alt="" className="tutorial-icon" draggable="false" />
          </div>
        )}

        <div className="tutorial-kicker">{kicker}</div>
        <h2 className="tutorial-title">{title}</h2>
        <p  className="tutorial-body">{body}</p>

        <button className="tutorial-cta" onClick={onDone} autoFocus>
          <span className="tutorial-cta-label">{ctaText}</span>
          <span className="tutorial-cta-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

export default TutorialModal;
