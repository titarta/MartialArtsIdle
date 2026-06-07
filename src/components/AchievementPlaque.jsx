import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

/**
 * AchievementPlaque — the "trophy plaque" detail surface for an achievement.
 *
 * Centered modal-over-modal: opens as a true second overlay above the Codex
 * scrim (see design study `_design/achievement-detail-study/`). Same visual
 * vocabulary as the Tutorial card and the Petition Tablet (brass + dark
 * lacquer + vermillion ribbon + Ma Shan Zheng glyph watermark + Cinzel).
 *
 * Replaces the old inline `.ach-detail` sticky drawer (which used to cover
 * neighbouring badges when one near the bottom of the grid was tapped, and
 * was the only pre-Sanctum surface left in the Codex).
 *
 * Three render states are data-driven from the same shell:
 *   unlocked        brass medallion + full title + full body
 *   locked + hidden vermillion seal + "???" everywhere
 *   locked + secret vermillion seal + real title + italic obscured body
 *
 * Behaviour:
 *   - Backdrop tap dismisses (matches every other DetailModal in the game)
 *   - Escape key dismisses
 *   - Portaled to document.body so it sits above the Codex's own scrim
 *     without z-index gymnastics
 *   - Pop-in animation gives unlocks a small ceremonial moment
 */

/**
 * Pick a calligraphic glyph for the watermark behind the copy. Derived
 * from the achievement id prefix so categories of unlocks share a glyph
 * (and locked entries get a generic 封 "seal"). Keeps things visually
 * thematic without requiring authors to add a glyph field per entry.
 */
function pickGlyph(achievementId, unlocked) {
  if (!unlocked) return '封'; // seal / closed
  const id = achievementId || '';
  if (id.startsWith('realm_'))         return '突';  // breakthrough / sudden
  if (id.startsWith('tap_') ||
      id.startsWith('hold_'))          return '念';  // intent / focus
  if (id.startsWith('spark_'))         return '符';  // talisman / spark
  if (id.startsWith('karma_') ||
      id.startsWith('reincarnate_'))   return '圣';  // saint
  if (id.startsWith('gate_'))          return '关';  // gate
  if (id.startsWith('offline_') ||
      id.startsWith('long_'))          return '眠';  // sleep
  if (id.startsWith('shop_') ||
      id.startsWith('blood_lotus_'))   return '市';  // market
  if (id.startsWith('all_in'))         return '舍';  // give up / release
  return '道'; // default: the Way
}

/** Brass-caps eyebrow above the title. Different key per state. */
function kickerKey(unlocked, hidden, secretDesc) {
  if (unlocked)   return 'achievement.kicker.earned';
  if (hidden)     return 'achievement.kicker.mystery';
  if (secretDesc) return 'achievement.kicker.hidden';
  return 'achievement.kicker.locked';
}

export default function AchievementPlaque({ achievement, unlocked, onClose }) {
  const { t } = useTranslation('ui');

  // Esc closes
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!achievement) return null;

  const isHidden     = !unlocked && achievement.hidden === true;
  const isSecretDesc = !unlocked && achievement.secretDesc === true && !isHidden;
  const isLockedShow = !unlocked && !isHidden && !isSecretDesc;

  // Choose what each slot shows. Lots of small ifs but each one is one of
  // exactly three states, so easier to read than a single switch.
  let titleText;
  let bodyText;
  let bodyItalic = false;
  let medalGlyph;
  let medalIsSeal = false;
  let kickerClass = '';

  if (unlocked) {
    titleText  = achievement.title;
    bodyText   = achievement.desc;
    medalGlyph = achievement.icon;
  } else if (isHidden) {
    titleText  = t('common.unknown');
    bodyText   = t('achievement.lockedDesc');
    bodyItalic = true;
    medalIsSeal = true;
    kickerClass = 'ach-plaque-kicker-locked';
  } else if (isSecretDesc) {
    titleText  = achievement.title;
    bodyText   = t('achievement.secretDesc');
    bodyItalic = true;
    medalIsSeal = true;
    kickerClass = 'ach-plaque-kicker-secret';
  } else {
    // isLockedShow — locked but not hidden / not secretDesc; show real
    // info just dimmed
    titleText  = achievement.title;
    bodyText   = achievement.desc;
    medalIsSeal = true;
    kickerClass = 'ach-plaque-kicker-locked';
  }

  const glyph  = pickGlyph(achievement.id, unlocked);
  const kicker = t(kickerKey(unlocked, isHidden, isSecretDesc));

  const plaqueClass = [
    'ach-plaque',
    unlocked ? 'ach-plaque-unlocked' : 'ach-plaque-locked',
    isSecretDesc ? 'ach-plaque-secret' : '',
  ].filter(Boolean).join(' ');

  const medalClass = [
    'ach-plaque-medal',
    medalIsSeal ? 'ach-plaque-medal-seal' : '',
  ].filter(Boolean).join(' ');

  const bodyClass = [
    'ach-plaque-body',
    bodyItalic ? 'ach-plaque-body-obscured' : '',
  ].filter(Boolean).join(' ');

  return createPortal(
    <div
      className="modal-overlay ach-plaque-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={unlocked ? `Achievement: ${achievement.title}` : t('achievement.lockedAriaLabel')}
      onClick={onClose}
    >
      <div
        className={plaqueClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ach-plaque-ribbon" aria-hidden="true" />
        <span className={`ach-plaque-glyph ${unlocked ? '' : 'ach-plaque-glyph-locked'}`}
              aria-hidden="true">{glyph}</span>

        <button
          type="button"
          className="modal-close ach-plaque-close"
          onClick={onClose}
          aria-label={t('achievement.closeAriaLabel')}
        >
          ✕
        </button>

        <div className={medalClass}>
          {medalIsSeal ? <span className="ach-plaque-seal">封</span>
                       : <span className="ach-plaque-medal-icon">{medalGlyph}</span>}
        </div>

        <div className={`ach-plaque-kicker ${kickerClass}`}>{kicker}</div>
        <div className={`ach-plaque-title ${unlocked ? '' : 'ach-plaque-title-locked'}`}>
          {titleText}
        </div>

        <div className="ach-plaque-divider" />

        <div className={bodyClass}>{bodyText}</div>
      </div>
    </div>,
    document.body
  );
}
