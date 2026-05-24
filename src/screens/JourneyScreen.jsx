import JourneyBody from '../components/JourneyBody';

/**
 * Journey — full screen (post nav-audit).
 *
 * The realm-arc chronicle was a tab inside the old ProgressHubModal alongside
 * Achievements + Stats. The audit promoted it: Journey is the lore-rich
 * place-you-live-in surface, while Achievements / Stats are check-on
 * surfaces best left as modal chips. Routed via navigate('journey') and
 * surfaced in the bottom nav with the 📜 glyph.
 *
 * Layout: standard screen chrome (lacquer panel, sectioned scroll body),
 * Cinzel title, then the existing JourneyBody — the realm list logic is
 * unchanged from when it was a tab body.
 */
function JourneyScreen({ realmIndex }) {
  return (
    <div className="journey-screen">

      <div className="js-screen-head">
        <div className="js-screen-title-block">
          <div className="js-screen-title">
            <span className="js-title-icon" aria-hidden="true">📜</span>
            Journey
          </div>
          <div className="js-screen-sub">Chronicle of every realm crossed</div>
        </div>
      </div>

      <div className="js-screen-body">
        <JourneyBody realmIndex={realmIndex} />
      </div>

    </div>
  );
}

export default JourneyScreen;
