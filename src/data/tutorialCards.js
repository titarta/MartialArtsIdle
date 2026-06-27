/**
 * tutorialCards.js — Tier-A jade tutorial card content (2026-05-21).
 *
 * Each entry is keyed by a stable id and matches the `TutorialModal`
 * payload shape: { kicker, title, body, glyph?, iconSrc?, ctaText? }.
 *
 * `glyph` is the single Ma Shan Zheng character that sits as the
 * calligraphic watermark behind the modal copy — provides identity
 * even for cards without an iconSrc. Falls back to 道 (Way / Dao) if
 * omitted.
 *
 * These cards fire at key first-run moments and never re-fire on the
 * same account (see src/systems/tutorialSeen.js). Trigger sites:
 *
 *   welcome              — App.jsx on first launch (no save state)
 *   hold_to_focus        — App.jsx when qi accumulates without ever holding Focus
 *   producers_tab        — CultivationScreen on first Producers tab view
 *   first_producer       — CultivationScreen after first successful buy
 *   first_layer_bt       — App.jsx on first realm-index increment
 *   first_major_gate     — HomeScreen when the BREAKTHROUGH button first appears
 *   first_spark_offer    — App.jsx when a Qi Spark offer first surfaces
 *   first_saint          — App.jsx when realmIndex first hits the Saint band
 *
 * Copy intent: each card is 2-3 short sentences. Body explains the WHAT,
 * not the WHY (the cultivation theme already carries flavour). Keep it
 * scannable — players will tap "Got it" fast if their thumb is mid-grind.
 *
 * Icons: a small set of UI sprites already exists under public/ui. We
 * reuse them so the card feels visually consistent with the rest of the
 * game. Default jade frame ships with TutorialModal — no per-card frame
 * tinting needed for Tier A.
 */

const BASE = import.meta.env.BASE_URL || '/';

export const TUTORIAL_IDS = Object.freeze({
  WELCOME:            'welcome',
  HOLD_TO_FOCUS:      'hold_to_focus',
  PRODUCERS_TAB:      'producers_tab',
  // Proactive nudge — fires only when the player has been focusing for a
  // while without ever opening the Cultivation tab. Mutually exclusive
  // with PRODUCERS_TAB (whichever fires first marks both seen).
  PRODUCERS_HINT:     'producers_hint',
  FIRST_PRODUCER:     'first_producer',
  FIRST_LAYER_BT:     'first_layer_bt',
  FIRST_MAJOR_GATE:   'first_major_gate',
  FIRST_SPARK_OFFER:  'first_spark_offer',
  FIRST_SAINT:        'first_saint',
  // Fires when the Qi Crystal first unlocks (qi_crystal feature gate, ~L3).
  CRYSTAL_UNLOCKED:   'crystal_unlocked',
  // Crystal-tier mechanic unlocks, granted deterministically as the Qi
  // Crystal evolves (L10/L20/L30/L40, see data/crystalMechanicGrants.js) and
  // fired from App.jsx's grant handler so each new mechanic explains itself.
  MECH_CRYSTAL_RESERVOIR: 'mech_crystal_reservoir',
  MECH_CONSECUTIVE_FOCUS: 'mech_consecutive_focus',
  MECH_DIVINE_QI:         'mech_divine_qi',
  MECH_TRACING_MERIDIANS: 'mech_tracing_meridians',
  // (Removed) Migration cards — both PROGRESS_HUB_MIGRATION (Journey
  // + Achievements layout shuffle) and ANNALS_TO_CODEX_MIGRATION
  // (Annals → Codex rename + Wardrobe tab). The player base has
  // rolled past both UI changes; migration cards are temporary
  // scaffolding for returning players and become noise once the
  // churn is no longer fresh. Triggers removed from App.jsx; card
  // bodies removed below. Older saves with
  // mai_seen_tutorial_progress_hub_migration or
  // mai_seen_tutorial_annals_to_codex_migration localStorage flags
  // are harmless - the flags just sit unread.
});

/**
 * Card content. Trigger code calls `getTutorialCard(id)` to grab the
 * payload, then enqueues it via the event queue. Defaults to undefined
 * if an unknown id is requested — caller should guard.
 */
const CARDS = {
  [TUTORIAL_IDS.WELCOME]: {
    kicker:  'Welcome, cultivator',
    title:   'The Path Begins',
    body:    'Qi flows in with every breath. Fill the bar at the bottom of the screen to break through a layer of your realm. Layers stack into realms, realms stack into the heavens. The path is long.',
    glyph:   '道',  // Dao / Way
    ctaText: 'Begin',
  },
  [TUTORIAL_IDS.HOLD_TO_FOCUS]: {
    kicker:  'Focus',
    title:   'Hold to Focus',
    body:    'Press and hold the cultivator. Your qi/s climbs sharply while you hold, and drops back when you release. The early layers go by much faster with your thumb on the screen.',
    glyph:   '念',  // intent / focus
    ctaText: 'Try it',
  },
  [TUTORIAL_IDS.PRODUCERS_TAB]: {
    kicker:  'Your sect',
    title:   'Producers',
    body:    'Producers gather qi for you in the background, even when you\'re not tapping. Each one raises your qi/s permanently for the rest of this life. Their price creeps up after every purchase, but each new tier outclasses the last. Spend your qi the moment you can afford one.',
    glyph:   '宗',  // sect
    ctaText: 'Got it',
  },
  [TUTORIAL_IDS.PRODUCERS_HINT]: {
    kicker:  'A whisper from the path',
    title:   'You do not climb alone',
    body:    'Your breath alone fills the meridians slowly. Other hands can draw the heavens down with you. Visit the Sect hall to gather disciples, raise gardens, and shape the sources that gather qi while you sit still.',
    glyph:   '宗',
    ctaText: 'Show me',
  },
  [TUTORIAL_IDS.FIRST_PRODUCER]: {
    kicker:  'First disciple',
    title:   'The Disciple Bows',
    body:    'A disciple kneels in your courtyard. Every disciple you train lifts your idle qi/s a little, and the next one costs slightly more than the last. The same shape holds for every producer you\'ll unlock.',
    glyph:   '弟',  // disciple
    ctaText: 'Onward',
  },
  [TUTORIAL_IDS.FIRST_LAYER_BT]: {
    kicker:  'Breakthrough',
    title:   'First Breakthrough',
    body:    'Your meridians widen. Each layer you cross brings new producers, sparks, and upgrades within reach. Keep cultivating; the next layer is already in sight.',
    glyph:   '突',  // sudden / break
    ctaText: 'Continue',
  },
  [TUTORIAL_IDS.FIRST_MAJOR_GATE]: {
    kicker:  'Major realm',
    title:   'The Heavens Test You',
    body:    'A major realm asks for two things at once. You need qi in the bank, and a sustained qi/s rate to push through the gate. Build more producers, level your crystal, hold Focus. Tap BREAKTHROUGH when the heavens stop pushing back.',
    glyph:   '关',  // gate (simplified)
    ctaText: 'Got it',
  },
  [TUTORIAL_IDS.FIRST_SPARK_OFFER]: {
    kicker:  'Sparks',
    title:   'Qi Sparks',
    body:    'Every layer breakthrough offers a Spark. Two cards appear and you pick one. Some give a short boost, some stack permanently for this run, and the rare ones unlock new mechanics. If neither card tempts you, your first reroll on every offer is free.',
    glyph:   '符',  // talisman / spark
    ctaText: 'Choose wisely',
  },
  [TUTORIAL_IDS.FIRST_SAINT]: {
    kicker:  'Reincarnation',
    title:   'A Second Life',
    body:    'You can reincarnate from here on. The progress of this life turns into karma, and karma buys permanent boosts on the Eternal Tree. Every life makes the next one start a little stronger. Keep grinding this run if it\'s still moving, or rebirth whenever the climb starts to drag.',
    glyph:   '圣',  // saint (simplified)
    ctaText: 'Got it',
  },
  [TUTORIAL_IDS.CRYSTAL_UNLOCKED]: {
    kicker:  'A vessel awakens',
    title:   'The Qi Crystal',
    body:    'A crystal forms in your dantian. Feed it qi to refine it, and it permanently lifts your cultivation speed, the more you refine, the faster everything grows. As it strengthens it evolves, and each evolution awakens a new mechanic to master.',
    glyph:   '晶',  // crystal
    ctaText: 'Refine it',
  },
  // ── Crystal-tier mechanic unlocks (fire as the crystal evolves) ──────────
  [TUTORIAL_IDS.MECH_CRYSTAL_RESERVOIR]: {
    kicker:  'Crystal awakens',
    title:   'Crystal Reservoir',
    body:    'Your crystal now stockpiles a slice of your qi/s while you cultivate, up to two minutes\' worth. Tap the crystal whenever the reservoir fills to collect the whole pool in one burst. Free qi on top of everything else.',
    glyph:   '晶',  // crystal
    ctaText: 'Tap to collect',
  },
  [TUTORIAL_IDS.MECH_CONSECUTIVE_FOCUS]: {
    kicker:  'Focus deepens',
    title:   'Consecutive Focus',
    body:    'Holding Focus now rewards persistence. The longer you keep your thumb on the crystal, the higher your qi/s climbs, in steps. Settle in and let each rung stack on the last.',
    glyph:   '念',  // intent / focus
    ctaText: 'Hold longer',
  },
  [TUTORIAL_IDS.MECH_DIVINE_QI]: {
    kicker:  'A gift from the heavens',
    title:   'Divine Qi',
    body:    'Every so often a golden orb drifts across the scene. Tap it before it fades for a surge of qi that lasts a short while. Keep half an eye on the screen; the heavens reward the watchful.',
    glyph:   '天',  // heaven
    ctaText: 'I will watch',
  },
  [TUTORIAL_IDS.MECH_TRACING_MERIDIANS]: {
    kicker:  'Trace the path',
    title:   'Tracing Meridians',
    body:    'A pattern spark now appears from time to time. Tap it to begin, then trace the lit dots in order before the timer runs out. Clear the pattern and your qi pours faster for a while.',
    glyph:   '紋',  // pattern / markings
    ctaText: 'Trace it',
  },
  // (Removed) PROGRESS_HUB_MIGRATION + ANNALS_TO_CODEX_MIGRATION card
  // bodies. Their triggers are gone (see App.jsx) and the ids are no
  // longer exported from TUTORIAL_IDS. See the note at the top of the
  // TUTORIAL_IDS block for the full rationale.
};

/** Fetch the payload for a tutorial id, or undefined if none. The id is
 *  folded into the returned object so downstream consumers (the i18n
 *  resolver in App.jsx) can key translations by it. */
export function getTutorialCard(id) {
  const card = CARDS[id];
  return card ? { ...card, id } : undefined;
}

// Re-export the icon base so consumers can build iconSrc paths without
// pulling import.meta themselves.
export const TUTORIAL_ICON_BASE = BASE;

export default CARDS;
