/**
 * statsKeys.js — canonical list of statistics tracked by useStats.
 *
 * Single source of truth: adding a new stat is one entry here +
 * (optionally) one recorder call wherever the event fires. The Stats
 * tab UI reads this list and renders rows in declared order, grouped
 * by category.
 *
 * Each entry:
 *   key           — storage key inside mai_stats.{run,lifetime}.<key>
 *   label         — display string in the Stats tab
 *   category      — one of STAT_CATEGORIES below (declared order = render order)
 *   format        — 'qi' | 'int' | 'duration' | 'karma'
 *   peak?         — true if recordPeak() is used (display unchanged; flagged
 *                   here so reset/normalisation semantics can branch later)
 *   lifetimeOnly? — true to bypass the run bucket entirely. Stats tab shows
 *                   "—" for these in Run mode.
 */

export const STAT_CATEGORIES = [
  { id: 'cultivation', label: 'Cultivation' },
  { id: 'economy',     label: 'Economy' },
  { id: 'meta',        label: 'Meta / Reincarnation' },
];

export const STATS_KEYS = [
  // ── Cultivation ────────────────────────────────────────────────────────
  { key: 'qiEarned',          label: 'Qi earned',            category: 'cultivation', format: 'qi'       },
  { key: 'qiPerSecPeak',      label: 'Peak Qi/s',            category: 'cultivation', format: 'rate', peak: true },
  { key: 'breakthroughs',     label: 'Breakthroughs',        category: 'cultivation', format: 'int'      },
  { key: 'timePlayed',        label: 'Time played',          category: 'cultivation', format: 'duration' },

  // ── Economy ────────────────────────────────────────────────────────────
  { key: 'producersBought',   label: 'Producers bought',     category: 'economy',     format: 'int' },
  { key: 'upgradesBought',    label: 'Upgrades bought',      category: 'economy',     format: 'int' },
  { key: 'crystalTaps',       label: 'Crystal taps',         category: 'economy',     format: 'int' },
  // Divine Qi orbs are the Golden Cookie equivalent — rare clicks that
  // grant a temporary rate buff. Tracking taps separately gives players
  // a "collected X golden orbs" flex stat.
  { key: 'divineQiClicks',    label: 'Divine Qi orbs collected', category: 'economy', format: 'int' },
  { key: 'crystalLevelPeak',  label: 'Crystal level (peak)', category: 'economy',     format: 'int', peak: true },
  { key: 'crystalEvolutions', label: 'Crystal evolutions',   category: 'economy',     format: 'int' },

  // ── Meta / Reincarnation ───────────────────────────────────────────────
  { key: 'livesLived',        label: 'Lives lived',          category: 'meta',        format: 'int',   lifetimeOnly: true },
  { key: 'karmaEarned',       label: 'Karma earned',         category: 'meta',        format: 'karma' },
  { key: 'karmaSpent',        label: 'Karma spent',          category: 'meta',        format: 'karma' },

  // ── Achievement support (counters used by the achievements engine) ─────
  // Tracked here so they participate in the run/lifetime save split.
  // Not all of these are surfaced in the Stats tab UI (lifetimeOnly:false
  // entries are visible by default; flag with `hidden:true` if a key is
  // purely backing an achievement and not worth surfacing as a player stat).
  { key: 'cultivatorTaps',         label: 'Cultivator taps',      category: 'economy', format: 'int',     hidden: true },
  { key: 'peakTapsPerSec',         label: 'Peak taps per second', category: 'economy', format: 'int',   peak: true, hidden: true },
  { key: 'longestHoldSec',         label: 'Longest crystal hold', category: 'economy', format: 'duration', peak: true, hidden: true },
  { key: 'qiSparksCaught',         label: 'Qi sparks caught',     category: 'cultivation', format: 'int',  hidden: true },
  { key: 'shopVisits',             label: 'Shop visits',          category: 'economy', format: 'int',     hidden: true },
  { key: 'shopPurchases',          label: 'Shop purchases (non-cosmetic)', category: 'economy', format: 'int', hidden: true },
  { key: 'cosmeticPurchases',      label: 'Cosmetic purchases',   category: 'economy', format: 'int',     hidden: true },
  { key: 'audioToggles',           label: 'Audio toggles',        category: 'meta',    format: 'int',     hidden: true },
  { key: 'tutorialsRead',          label: 'Tutorials read',       category: 'meta',    format: 'int',     hidden: true },
  { key: 'achievementsPanelOpens', label: 'Achievements panel opens', category: 'meta', format: 'int',   hidden: true },
  { key: 'cultivatorSpriteTaps',   label: 'Sprite taps',          category: 'meta',    format: 'int',     hidden: true },
  { key: 'maxOfflineGapSec',       label: 'Longest offline gap',  category: 'meta',    format: 'duration', peak: true, hidden: true, lifetimeOnly: true },
  { key: 'lastOfflineGapSec',      label: 'Last offline gap',     category: 'meta',    format: 'duration', peak: true, hidden: true, lifetimeOnly: true },
  { key: 'offlineQiEarned',        label: 'Qi earned offline',    category: 'cultivation', format: 'qi', hidden: true },
  { key: 'producerCountPeak',      label: 'Peak owned of one producer', category: 'economy', format: 'int', peak: true, hidden: true },
  { key: 'speedGatesCleared',      label: 'Speed gates cleared',  category: 'cultivation', format: 'int', hidden: true },
  { key: 'allInPurchases',         label: 'All-in purchases',     category: 'economy', format: 'int',     hidden: true },
  { key: 'consecutiveDays',        label: 'Consecutive days played', category: 'meta', format: 'int',   peak: true, hidden: true, lifetimeOnly: true },
];

export const STATS_KEYS_BY_ID = Object.fromEntries(STATS_KEYS.map(s => [s.key, s]));
