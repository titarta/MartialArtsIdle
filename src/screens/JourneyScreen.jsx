import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameText } from '../i18n/gameText';
import JourneyBody from '../components/JourneyBody';
import REALMS, {
  CHAPTERS,
  chapterForRealmNameIndex,
  toRoman,
  getMajorBreakthroughRate,
  isMajorTransition,
} from '../data/realms';
import { loadGraphics } from '../systems/graphics';

const BASE = import.meta.env.BASE_URL;

const REALM_ICONS = {
  'Tempered Body':          `${BASE}ui/realms/tempered_body.png`,
  'Qi Transformation':      `${BASE}ui/realms/qi_transformation.png`,
  'True Element':           `${BASE}ui/realms/true_element.png`,
  'Separation & Reunion':   `${BASE}ui/realms/separation_reunion.png`,
  'Immortal Ascension':     `${BASE}ui/realms/immortal_ascension.png`,
  'Saint':                  `${BASE}ui/realms/saint.png`,
  'Saint King':             `${BASE}ui/realms/saint_king.png`,
  'Origin Returning':       `${BASE}ui/realms/origin_returning.png`,
  'Origin King':            `${BASE}ui/realms/origin_king.png`,
  'Void King':              `${BASE}ui/realms/void_king.png`,
  'Dao Source':             `${BASE}ui/realms/dao_source.png`,
  'Emperor Realm':          `${BASE}ui/realms/emperor_realm.png`,
  'Open Heaven':            `${BASE}ui/realms/open_heaven.png`,
};

// Fallback Cinzel-compatible glyph if the chapter ever lacks one in CHAPTERS.
const FALLBACK_GLYPH = '道';

function fmtQi(n) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(Math.floor(n));
}

function fmtRate(n) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  if (n >= 10)   return n.toFixed(0);
  return n.toFixed(1);
}

/**
 * HeroHeader — the locked Chronicle hero. Reads live values off cultivation
 * refs every 250ms so the qi progress bar and qi/s readouts stay current
 * without re-rendering the whole screen on every tick.
 *
 * The gate marker on the bar surfaces the qi/s minimum required for the
 * NEXT major breakthrough (currently buried in the breakthrough modal).
 * Showing it on Journey makes the wall visible while the player can still
 * plan around it. The pulse animation respects `vfxEnabled` from the
 * graphics settings — disabled by adding a `jc-hero-no-pulse` class on
 * the icon frame.
 */
function HeroHeader({ cultivation, vfxEnabled }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(t => (t + 1) % 1000), 250);
    return () => clearInterval(id);
  }, []);

  const realmIndex = cultivation.realmIndex ?? 0;
  const realm = REALMS[realmIndex] ?? null;
  const realmMajor = realm?.name ?? '';
  const realmStage = realm?.stage ?? '';
  const totalRealms = REALMS.length;

  const realmNameIndex = (() => {
    const seen = new Set();
    let nameIdx = -1;
    for (let i = 0; i <= realmIndex; i++) {
      const n = REALMS[i]?.name;
      if (n && !seen.has(n)) { seen.add(n); nameIdx += 1; }
    }
    return Math.max(0, nameIdx);
  })();
  const chapter = chapterForRealmNameIndex(realmNameIndex);
  const chapterRomanCurrent = chapter ? toRoman(chapter.id) : '—';
  const totalChapters = CHAPTERS.length;
  const chapterGlyph = chapter?.glyph ?? FALLBACK_GLYPH;

  // Live qi readouts via refs. Refs are mutated each cultivation tick;
  // we sample at 250ms which is well under the 1Hz tick rate.
  const qiProgress = cultivation.qiEarnedThisRealmRef?.current ?? 0;
  const qiCost     = cultivation.costRef?.current ?? (REALMS[realmIndex + 1]?.cost ?? 0);
  const qiRate     = cultivation.rateRef?.current ?? 0;
  const liveGateRate = cultivation.gateRef?.current ?? 0;
  // If no gate is active right now (mid-realm), still surface the gate for
  // the NEXT major transition so the player can see the wall coming.
  const projectedGate = isMajorTransition(realmIndex)
    ? getMajorBreakthroughRate(realmIndex)
    : 0;
  const gateRate = liveGateRate > 0 ? liveGateRate : projectedGate;

  const progressPct = qiCost > 0
    ? Math.min(100, Math.max(0, (qiProgress / qiCost) * 100))
    : 0;
  // Gate marker position on the bar — projects qi/s gate as % of cost.
  // The gate is measured in qi/s but the bar is qi accumulation; we
  // can't translate one to the other directly. Instead we show a small
  // marker at the spot the rate-bar would *cross* the gate, which is
  // visually meaningful: it sits at the gate% under the same bar width.
  // For now we anchor it at the right edge (the breakthrough moment).
  // The gate readout below the bar gives the numerical context.

  const icon = realmMajor ? REALM_ICONS[realmMajor] : null;
  const respectsMotion = (typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    || false;
  const wantPulse = !!vfxEnabled && !respectsMotion;

  return (
    <div className="jc-hero" data-vfx={wantPulse ? 'on' : 'off'}>
      {/* Calligraphy watermark — a single chapter glyph (e.g. "圣" Saint),
          pinned top-right at low opacity so it reads as texture. */}
      <span className="jc-hero-glyph" aria-hidden="true">{chapterGlyph}</span>

      <div className="jc-hero-row">
        <div className={`jc-hero-icon-wrap${wantPulse ? '' : ' jc-hero-no-pulse'}`}>
          {icon
            ? <img src={icon} alt="" className="jc-hero-icon" draggable="false" />
            : <span className="jc-hero-icon-fallback">{chapterGlyph}</span>}
        </div>
        <div className="jc-hero-text">
          <span className="jc-hero-eyebrow">{t('journey.currentRealm')}</span>
          <span className="jc-hero-name">{realmMajor ? gt('realmNames', realmMajor, 'name', realmMajor) : ''}</span>
          {realmStage && <span className="jc-hero-stage">{gt('realmStages', realmStage, 'label', realmStage)}</span>}
          <span className="jc-hero-chapter">
            {t('journey.chapterEyebrow', { cur: chapterRomanCurrent, total: toRoman(totalChapters), stage: realmIndex + 1, stages: totalRealms })}
          </span>
        </div>
      </div>

      {qiCost > 0 && (
        <div className="jc-hero-meter">
          <div className="jc-hero-meter-head">
            <span>{t('journey.nextBreakthrough')}</span>
            <span><b>{fmtQi(qiProgress)}</b> / {fmtQi(qiCost)} {t('common.qiSuffix')}</span>
          </div>
          <div className="jc-hero-bar">
            <div
              className="jc-hero-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
            {gateRate > 0 && (
              // Pin the gate marker to the right end of the bar — it's the
              // wall at the breakthrough moment. The text below carries
              // the qi/s number; the mark is just a visual anchor.
              <span className="jc-hero-bar-gate" aria-hidden="true" />
            )}
          </div>
          {/* Two-row gate readout. Splits the single "NO GATE  Now 4.2K QI/S"
              line into label/value pairs so each datum parses on its own.
              When a gate IS present, the value tone shifts via .jc-hero-gate
              for a colored anchor; the no-gate state stays muted. The
              "below-threshold" warn case lights the gate row when the
              player's current rate hasn't cleared it yet. */}
          <dl className="jc-hero-foot jc-hero-foot-stacked">
            <div className="jc-hero-foot-row">
              <dt className="jc-hero-foot-label">{t('journey.gate')}</dt>
              {gateRate > 0 ? (
                <dd
                  className={`jc-hero-foot-value jc-hero-gate${qiRate < gateRate ? ' jc-hero-gate-warn' : ''}`}
                >
                  {t('journey.gateRequired', { rate: fmtRate(gateRate) })}
                </dd>
              ) : (
                <dd className="jc-hero-foot-value jc-hero-gate-none">{t('journey.gateNone')}</dd>
              )}
            </div>
            <div className="jc-hero-foot-row">
              <dt className="jc-hero-foot-label">{t('journey.current')}</dt>
              <dd className="jc-hero-foot-value">{t('journey.currentRate', { rate: fmtRate(qiRate) })}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Journey — full screen (post nav-audit + Chronicle redesign).
 *
 * Two zones:
 *   1) Locked HERO HEADER at the top showing the current realm at scale —
 *      icon in a pulsing gold frame (vfxEnabled-aware), Cinzel name + stage,
 *      "Chapter VI of VII · Stage X / Y" eyebrow, qi progress bar with
 *      cost-to-next AND the qi/s gate inline.
 *   2) Chronicle BODY below: realm groups clustered under 7 Roman-numeral
 *      chapter dividers. Past chapters dim; current chapter at full opacity
 *      with the realm group expanded; future chapters fade.
 */
function JourneyScreen({ cultivation }) {
  // Read the user's vfx preference from the persisted graphics settings.
  // Pulled lazily so this re-evaluates on every mount — the Settings screen
  // saves immediately, so navigating away and back picks up the new value.
  const graphicsRef = useRef(null);
  if (!graphicsRef.current) {
    try { graphicsRef.current = loadGraphics(); }
    catch { graphicsRef.current = { vfxEnabled: true }; }
  }
  const vfxEnabled = graphicsRef.current?.vfxEnabled ?? true;

  return (
    <div className="journey-screen">
      <HeroHeader cultivation={cultivation} vfxEnabled={vfxEnabled} />

      <div className="js-screen-body">
        <JourneyBody realmIndex={cultivation.realmIndex} />
      </div>
    </div>
  );
}

export default JourneyScreen;
