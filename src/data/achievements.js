/**
 * achievements.js — flat list of all achievements in the game.
 *
 * Each entry:
 *   id          unique string. Once shipped, do not change (save-key)
 *   icon        emoji or short glyph shown in the grid
 *   title       display name (hidden until unlocked when `hidden:true`)
 *   desc        description text (hidden until unlocked when `hidden:true`
 *               or `secretDesc:true`)
 *   condition?  (snapshot) => boolean. Snapshot poll path.
 *   event?      string event id from achievementBus. Direct-fire path.
 *               When both are present, EITHER one unlocks the entry.
 *   hidden?     true → title + desc shown as "???" until unlocked
 *   secretDesc? true → title visible, desc shown as "???" until unlocked
 *
 * The legacy category system has been retired in favor of a flat list
 * (per author direction). The few existing entries that gated on v2
 * features (combat / laws / techniques / artefacts / alchemy) have
 * been dropped; their save ids stay reserved by being absent from the
 * array, which the engine treats as "never check" so old unlocked-set
 * entries remain harmless.
 *
 * Category constants are kept as empty stubs so the AchievementsBody
 * tab strip can fall back to the All tab without import errors. They
 * can be removed entirely once consumers stop referencing them.
 */

// Empty stubs — kept so AchievementsBody import does not break. The
// tab strip falls through to the "All" tab since no entry has a
// category set anymore.
export const CATEGORY_LABELS = {};
export const CATEGORIES = [];
export const CATEGORY_REQUIRES = {};

// ── Realm thresholds anchored to actual realm indices in data/realms.js ─
// 0-9    Tempered Body L1-10
// 10-13  Qi Transformation Early/Middle/Late/Peak
// 14-17  True Element Early/Middle/Late/Peak
// 18-20  Separation & Reunion 1st/2nd/3rd
// 21-23  Immortal Ascension 1st/2nd/3rd
// 24-26  Saint Early/Middle/Late
// 27-29  Saint King 1st/2nd/3rd
// 30-32  Origin Returning 1st/2nd/3rd
// 33-35  Origin King 1st/2nd/3rd
// 36-38  Void King 1st/2nd/3rd
// 39-41  Dao Source 1st/2nd/3rd
// 42-44  Emperor Realm 1st/2nd/3rd
// 45-50  Open Heaven L1-L6

export const ACHIEVEMENTS = [
  // ── A. The Cultivation Chain (12) ─────────────────────────────────────
  {
    id: 'realm_1', icon: '🌱',
    title: 'First Breath',
    desc: 'Take your first step on the path of cultivation.',
    condition: s => s.realmIndex >= 1,
  },
  {
    id: 'realm_10', icon: '🔥',
    title: 'Foundation Established',
    desc: 'Forge your body through all ten layers of Tempered Body.',
    condition: s => s.realmIndex >= 10,
  },
  {
    id: 'realm_13', icon: '🌊', hidden: true,
    title: 'Qi Transformed',
    desc: 'Master Qi Transformation. The qi within you is no longer mortal.',
    condition: s => s.realmIndex >= 13,
  },
  {
    id: 'realm_14', icon: '⚡', hidden: true,
    title: 'True Elements Awakened',
    desc: 'Enter the True Element realm and command the forces of nature.',
    condition: s => s.realmIndex >= 14,
  },
  {
    id: 'realm_18', icon: '🌗', hidden: true,
    title: 'Spirit Severed',
    desc: 'Reach Separation & Reunion. Your spirit splits to walk two paths at once.',
    condition: s => s.realmIndex >= 18,
  },
  {
    id: 'realm_21', icon: '☁️',
    title: 'Immortal Ascension',
    desc: 'Begin your ascent beyond mortal limits.',
    condition: s => s.realmIndex >= 22,
  },
  {
    id: 'realm_24', icon: '✨',
    title: "Saint's Path",
    desc: 'Walk alongside those who have transcended ordinary existence.',
    condition: s => s.realmIndex >= 26,
  },
  {
    id: 'realm_27', icon: '👑',
    title: 'Saint King',
    desc: 'Rise to the pinnacle of the Saint ranks.',
    condition: s => s.realmIndex >= 30,
  },
  {
    id: 'realm_30', icon: '🌀', hidden: true,
    title: 'Origin Returned',
    desc: 'Return to the source from which all qi flows.',
    condition: s => s.realmIndex >= 34,
  },
  {
    id: 'realm_36', icon: '🌑', hidden: true,
    title: 'Void King',
    desc: 'Step into the void between worlds and rule it.',
    condition: s => s.realmIndex >= 42,
  },
  {
    id: 'realm_39', icon: '🌟', hidden: true,
    title: 'Dao Source',
    desc: 'Touch the Dao at its source.',
    condition: s => s.realmIndex >= 46,
  },
  {
    id: 'realm_46', icon: '🌌',
    title: 'Open Heaven',
    desc: 'Shatter the heavens and touch the realm of Open Heaven.',
    condition: s => s.realmIndex >= 55,
  },

  // ── B. The Crystal: Taps & Holds (10) ─────────────────────────────────
  {
    id: 'tap_first', icon: '👆',
    title: 'First Touch',
    desc: 'Tap the qi crystal for the first time.',
    condition: s => s.totalCrystalTaps >= 1,
  },
  {
    id: 'tap_100', icon: '✋',
    title: 'Featherlight',
    desc: 'Reach 100 lifetime crystal taps.',
    condition: s => s.totalCrystalTaps >= 100,
  },
  {
    id: 'tap_10k', icon: '🙏',
    title: 'Hand of God',
    desc: 'Reach 10,000 lifetime crystal taps.',
    condition: s => s.totalCrystalTaps >= 10_000,
  },
  {
    id: 'tap_100k', icon: '🔨', hidden: true,
    title: 'Stone Hammer',
    desc: 'Reach 100,000 lifetime crystal taps.',
    condition: s => s.totalCrystalTaps >= 100_000,
  },
  {
    id: 'tap_1m', icon: '⛰️', hidden: true,
    title: 'Mountain Crusher',
    desc: 'Reach 1,000,000 lifetime crystal taps. Your phone is holding up.',
    condition: s => s.totalCrystalTaps >= 1_000_000,
  },
  {
    id: 'tap_rate_12', icon: '🐦', hidden: true,
    title: 'Hummingbird',
    desc: 'Tap the crystal 12 times in a single second.',
    condition: s => s.peakTapsPerSec >= 12,
  },
  {
    id: 'tap_burst_100', icon: '🤚', hidden: true,
    title: 'Carpal Tunnel',
    desc: 'Tap 100 times in 10 seconds. We are worried.',
    event: 'tap_burst_100_in_10s',
  },
  {
    id: 'hold_60s', icon: '🧘', hidden: true,
    title: 'Wax On, Wax Off',
    desc: 'Hold the crystal continuously for 60 seconds.',
    condition: s => s.longestHoldSec >= 60,
  },
  {
    id: 'hold_5m', icon: '🫁', hidden: true,
    title: 'Iron Lung',
    desc: 'Hold the crystal continuously for 5 minutes.',
    condition: s => s.longestHoldSec >= 300,
  },
  {
    id: 'hold_30m', icon: '🗿', hidden: true,
    title: 'Dao of Holding',
    desc: 'Hold the crystal continuously for 30 minutes. Statue mode.',
    condition: s => s.longestHoldSec >= 1800,
  },

  // ── C. Qi Sparks (4) ──────────────────────────────────────────────────
  {
    id: 'spark_first', icon: '✨', hidden: true,
    title: 'First Spark',
    desc: 'Catch your first qi spark.',
    condition: s => s.qiSparksCaught >= 1,
  },
  {
    id: 'spark_100', icon: '🎇', hidden: true,
    title: 'Spark Hunter',
    desc: 'Catch 100 qi sparks.',
    condition: s => s.qiSparksCaught >= 100,
  },
  {
    id: 'spark_1000', icon: '🌠', hidden: true,
    title: 'Spark Sage',
    desc: 'Catch 1,000 qi sparks.',
    condition: s => s.qiSparksCaught >= 1000,
  },
  {
    id: 'spark_drought', icon: '🍃', hidden: true,
    title: 'Drought',
    desc: 'Play for 1 hour without seeing a single spark. The wind is still.',
    event: 'spark_drought_1h',
  },

  // ── D. Idle & Offline (7) ─────────────────────────────────────────────
  {
    id: 'offline_1h', icon: '🚶',
    title: 'Brief Sojourn',
    desc: 'Return to the game after being away for 1 hour.',
    condition: s => s.lastSessionGapSec >= 60 * 60,
  },
  {
    id: 'offline_24h', icon: '🏯',
    title: 'Closed-Door Cultivation',
    desc: 'Return after 24 hours of seclusion. The mountain does not move.',
    condition: s => s.lastSessionGapSec >= 24 * 60 * 60,
  },
  {
    id: 'offline_7d', icon: '🌒', hidden: true,
    title: 'Slept Through a Dynasty',
    desc: 'Return after being away for 7 days.',
    condition: s => s.lastSessionGapSec >= 7 * 24 * 60 * 60,
  },
  {
    id: 'offline_30d', icon: '👴', hidden: true,
    title: 'Old Monster',
    desc: 'Return after 30 days away. Your sect thinks you are dead.',
    condition: s => s.lastSessionGapSec >= 30 * 24 * 60 * 60,
  },
  {
    id: 'offline_365d', icon: '🐉', hidden: true,
    title: 'Eternal Hibernation',
    desc: 'Return after a full year away. Welcome back. The world is different.',
    condition: s => s.lastSessionGapSec >= 365 * 24 * 60 * 60,
  },
  {
    id: 'offline_qi_1b', icon: '🏰', hidden: true,
    title: 'Idle Empire',
    desc: 'Accumulate 1 billion qi entirely while offline.',
    condition: s => s.offlineQiEarned >= 1_000_000_000,
  },
  {
    id: 'long_slumber', icon: '🌚', hidden: true,
    title: 'The Long Slumber',
    desc: 'Receive more qi from a single offline gap than from your prior total play time.',
    event: 'long_slumber',
  },

  // ── E. Reincarnation & The Eternal Tree (8) ──────────────────────────
  {
    id: 'reincarnate_1', icon: '☸️',
    title: 'Wheel of Saṃsāra',
    desc: 'Reincarnate for the first time.',
    condition: s => s.reincarnations >= 1,
  },
  {
    id: 'reincarnate_2', icon: '🌅', hidden: true,
    title: 'Second Wind',
    desc: 'Reincarnate a second time. It got easier, did it not.',
    condition: s => s.reincarnations >= 2,
  },
  {
    id: 'reincarnate_10', icon: '♾️', hidden: true,
    title: 'Beyond the Wheel',
    desc: 'Reincarnate 10 times. You remember every life.',
    condition: s => s.reincarnations >= 10,
  },
  {
    id: 'karma_first', icon: '◈', hidden: true,
    title: 'Karmic Seed',
    desc: 'Spend your first karma point on the Eternal Tree.',
    condition: s => s.karmaNodesUnlocked >= 1,
  },
  {
    id: 'karma_10', icon: '🌿', hidden: true,
    title: 'Bodhi Branch',
    desc: 'Unlock 10 karma nodes on the Eternal Tree.',
    condition: s => s.karmaNodesUnlocked >= 10,
  },
  {
    id: 'karma_50', icon: '🌳', hidden: true,
    title: 'Bodhi Tree',
    desc: 'Unlock 50 karma nodes on the Eternal Tree.',
    condition: s => s.karmaNodesUnlocked >= 50,
  },
  {
    id: 'karma_full', icon: '👑', hidden: true,
    title: 'Bodhi Crown',
    desc: 'Unlock the entire Eternal Tree.',
    condition: s => s.karmaNodesUnlocked >= s.karmaNodesTotal,
  },
  {
    id: 'reincarnate_lowest', icon: '🗑️', hidden: true,
    title: 'Lin Family Trash',
    desc: 'Voluntarily reincarnate at the lowest available realm threshold.',
    event: 'reincarnate_at_lowest',
  },

  // ── F. Speed Gates & Upgrades (4) ─────────────────────────────────────
  {
    id: 'gate_hit', icon: '🧱', hidden: true,
    title: 'Brick Wall',
    desc: 'Hit your first cultivation speed gate.',
    event: 'gate_hit_first',
  },
  {
    id: 'gate_pass_1', icon: '🚪', hidden: true,
    title: 'Through the Gate',
    desc: 'Pass a cultivation speed gate for the first time.',
    condition: s => s.speedGatesCleared >= 1,
  },
  {
    id: 'gate_pass_max', icon: '🚧', hidden: true,
    title: 'Iron Gate',
    desc: 'Pass the highest-tier cultivation speed gate.',
    event: 'gate_pass_highest',
  },
  {
    id: 'all_in', icon: '💸', hidden: true,
    title: 'All In',
    desc: 'Make a single producer or upgrade purchase that costs at least 1 trillion qi.',
    condition: s => s.allInPurchases >= 1,
  },

  // ── G. Shop & Cosmetics (2) ───────────────────────────────────────────
  {
    id: 'shop_first_skin', icon: '👘',
    title: 'Vanity',
    desc: 'Buy your first cosmetic skin.',
    condition: s => s.cosmeticPurchases >= 1,
  },
  {
    id: 'shop_100_visits', icon: '🥬', hidden: true,
    title: 'Cabbage Seller',
    desc: 'Visit the shop 100 times. Always poor. Always smiling.',
    condition: s => s.shopVisits >= 100,
  },

  // ── H. Daily Streak (4) ───────────────────────────────────────────────
  {
    id: 'daily_7', icon: '📅',
    title: 'Loyal Disciple',
    desc: 'Maintain a 7-day login streak.',
    condition: s => s.consecutiveDays >= 7,
  },
  {
    id: 'daily_30', icon: '🗓️', hidden: true,
    title: 'Iron Will',
    desc: 'Maintain a 30-day login streak.',
    condition: s => s.consecutiveDays >= 30,
  },
  {
    id: 'daily_100', icon: '🏔️', hidden: true,
    title: 'Hundred-Day Hermit',
    desc: 'Maintain a 100-day login streak.',
    condition: s => s.consecutiveDays >= 100,
  },
  {
    id: 'daily_skip_7_claim', icon: '🍞', hidden: true,
    title: 'No Daily Bread',
    desc: 'Skip the daily bonus 7 days in a row, then claim. Worth it.',
    event: 'daily_skip_streak_claim',
  },

  // ── I. Time of Day & Calendar (8) ─────────────────────────────────────
  {
    id: 'time_night_owl', icon: '🦉', hidden: true,
    title: 'Night Owl',
    desc: 'Cross a realm boundary between 1am and 4am local time.',
    event: 'realm_cross_night',
  },
  {
    id: 'time_early_bird', icon: '🐓', hidden: true,
    title: 'Early Bird',
    desc: 'Cross a realm boundary between 5am and 7am local time.',
    event: 'realm_cross_dawn',
  },
  {
    id: 'time_lunch', icon: '🍱', hidden: true,
    title: 'Lunch Break',
    desc: 'Play for at least 10 minutes between noon and 1pm on a weekday.',
    event: 'lunch_break_10min',
  },
  {
    id: 'time_midnight_tap', icon: '🕛', hidden: true,
    title: 'Witching Hour',
    desc: 'Tap the crystal at exactly 00:00:00 local time.',
    event: 'tap_at_midnight',
  },
  {
    id: 'cal_lunar_new_year', icon: '🧧', hidden: true,
    title: 'Lunar New Year',
    desc: 'Play on the lunar new year.',
    event: 'cal_lunar_new_year',
  },
  {
    id: 'cal_double_ninth', icon: '☯️', hidden: true,
    title: 'Day of Tribulation',
    desc: 'Play on the 9th day of the 9th month. Auspicious, or not.',
    event: 'cal_double_ninth',
  },
  {
    id: 'time_all_brackets', icon: '🌗', hidden: true,
    title: 'Sky Watcher',
    desc: 'Play during all four time brackets (night, morning, afternoon, evening) within 24 hours.',
    event: 'time_all_brackets',
  },

  // ── J. Settings & Discovery (5) ───────────────────────────────────────
  {
    id: 'ach_panel_50', icon: '👀', hidden: true,
    title: 'Patience, Young Grasshopper',
    desc: 'Open the achievements panel 50 times. We see you checking.',
    condition: s => s.achievementsPanelOpens >= 50,
  },
  {
    id: 'audio_toggle_10', icon: '🎚️', hidden: true,
    title: 'Audiophile',
    desc: 'Toggle the music 10 times. Pick a side.',
    condition: s => s.audioToggles >= 10,
  },
  {
    id: 'audio_mute_30m', icon: '🤫', hidden: true,
    title: 'Mute',
    desc: 'Play with all audio off for 30 minutes.',
    event: 'audio_muted_30m',
  },
  {
    id: 'settings_all', icon: '🔧', hidden: true,
    title: 'Settings Connoisseur',
    desc: 'Touch every setting at least once.',
    event: 'settings_all_touched',
  },
  {
    id: 'tutorial_all', icon: '📖', hidden: true,
    title: 'Did You Know?',
    desc: 'Read every tutorial card.',
    event: 'tutorials_all_read',
  },

  // ── K. Pop Culture (3) ────────────────────────────────────────────────
  {
    id: 'qis_9001', icon: '💢', hidden: true,
    title: "It's Over 9000",
    desc: 'Reach 9,001 qi per second.',
    condition: s => s.peakQiPerSec >= 9001,
  },
  {
    id: 'qis_666', icon: '😈', hidden: true,
    title: 'Number of the Beast',
    desc: 'Hold exactly 666 qi per second for one full second.',
    event: 'qis_666_held',
  },
  {
    id: 'producer_42', icon: '🧭', hidden: true,
    title: '42',
    desc: 'Own exactly 42 of a single producer type. The answer.',
    condition: s => s.exact42Producer === true,
  },

  // ── L. Quirky & Silly (5) ─────────────────────────────────────────────
  {
    id: 'bonk', icon: '🪨', hidden: true,
    title: 'Bonk',
    desc: 'Tap a non-interactable UI element 20 times in a row. Nothing is happening.',
    event: 'bonk_20',
  },
  {
    id: 'restless', icon: '🌀', hidden: true,
    title: 'Restless',
    desc: 'Switch screens 100 times in 5 minutes. Pick one, friend.',
    event: 'restless_100_5m',
  },
  {
    id: 'tap_dancer', icon: '🥁', hidden: true,
    title: 'Tap Dancer',
    desc: 'Tap the crystal at 60 BPM for 30 seconds. Tempo matters.',
    event: 'tap_dancer_60bpm_30s',
  },
  {
    id: 'sprite_tickle_100', icon: '🤭', hidden: true,
    title: 'Tickle the Master',
    desc: 'Tap the cultivator sprite 100 times. He felt that.',
    condition: s => s.cultivatorSpriteTaps >= 100,
  },
  {
    id: 'ach_unlocked_meta', icon: '🏆', hidden: true,
    title: 'Achievement Unlocked',
    desc: 'Unlock any achievement. Surprise. This is your second.',
    // Fires when at least one OTHER achievement is already unlocked. The
    // engine evaluates this after the snapshot check on the same tick,
    // so unlocking First Breath (or any other) triggers this immediately
    // as the next entry.
    condition: s => s.unlockedCountExcludingThis >= 1,
  },

  // ── M. Endgame Dedication (3) ─────────────────────────────────────────
  {
    id: 'play_100h', icon: '⏳',
    title: 'Sworn Brother of Heaven',
    desc: 'Reach 100 hours of total play time.',
    condition: s => s.totalPlayTimeSec >= 100 * 60 * 60,
  },
  {
    id: 'play_500h', icon: '🌙', hidden: true,
    title: 'Sleepless in Eastern Continent',
    desc: 'Reach 500 hours of total play time.',
    condition: s => s.totalPlayTimeSec >= 500 * 60 * 60,
  },
  {
    id: 'play_1000h', icon: '🪷', hidden: true,
    title: 'Dao of Idle',
    desc: 'Reach 1,000 hours of total play time.',
    condition: s => s.totalPlayTimeSec >= 1000 * 60 * 60,
  },

  // ── Capstone (1) ──────────────────────────────────────────────────────
  {
    id: 'capstone', icon: '🏔️', hidden: true,
    title: 'Become the Path',
    desc: 'You did not climb the mountain. You became it.',
    // Fires when every OTHER visible achievement is unlocked. We use
    // totalAchievementsCount (supplied by the engine in the extended
    // snapshot) so adding or removing achievements does not require
    // touching this threshold.
    condition: s => s.unlockedCountExcludingThis >= (s.totalAchievementsCount - 1),
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
