const SAVE_KEY       = 'mai_save';
const TECH_KEY       = 'mai_techniques';
const OWNED_TECH_KEY = 'mai_owned_techniques';

/**
 * Save schema version. Bump when the on-disk shape changes in a way that
 * requires migration. Each version below documents what changed; do NOT
 * reuse old numbers.
 *
 *   1 — pre-versioning (implicit).
 *   2 — v1 Cookie-Clicker pivot. NO migration required:
 *         • Adds `mai_producers`, `mai_upgrades`, `mai_producers_rate_snapshot`.
 *         • Combat-tied keys (`mai_inventory`, `mai_owned_laws`, `mai_pills`,
 *           `mai_blood_lotus`, `mai_artefacts`, `mai_techniques`, etc.) are
 *           PRESERVED on disk. Their UI is gated behind FEATURES.combat in
 *           src/data/featureFlags.js — when combat ships in v2, flipping
 *           that flag rehydrates everything without a data migration.
 */
export const SAVE_VERSION = 2;
export const SAVE_VERSION_KEY = 'mai_save_version';

/**
 * Cookie Clicker-style save system.
 * - Auto-saves to localStorage
 * - Export: base64 encoded string the user can copy
 * - Import: paste a base64 string to restore
 */

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...state,
      lastSeen: Date.now(),
    }));
  } catch {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function wipeSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(TECH_KEY);
  localStorage.removeItem(OWNED_TECH_KEY);
  localStorage.removeItem('mai_artefacts');
  localStorage.removeItem('mai_artefact_offline_snapshot');
  localStorage.removeItem('mai_inventory');
  localStorage.removeItem('mai_owned_laws');
  localStorage.removeItem('mai_active_law');
  localStorage.removeItem('mai_pills');
  localStorage.removeItem('mai_active_pills');
  // Discovered pills + pinned recipes are tied to save state — wipe alongside
  // the rest of the pill data. Previously omitted, which made discoveries
  // appear to "leak" across save resets.
  localStorage.removeItem('mai_discovered_pills');
  localStorage.removeItem('mai_pinned_recipes');
  localStorage.removeItem('mai_seen_worlds');
  localStorage.removeItem('mai_pending_selections');
  localStorage.removeItem('mai_active_selections');
  // Qi Sparks — temporary buffs / pending offer / pity counter (Phase 1+).
  // Offline snapshot mirrors Heaven's Bond's offline-qi multiplier so the
  // pre-mount offline calc can pick it up; wipe it alongside.
  localStorage.removeItem('mai_qi_sparks_active');
  localStorage.removeItem('mai_qi_sparks_pending');
  localStorage.removeItem('mai_qi_sparks_pity');
  localStorage.removeItem('mai_qi_sparks_offline_snapshot');
  // Master's Patience focus-seconds counter (Dial-9).
  localStorage.removeItem('mai_qi_sparks_focus_seconds_run');
  localStorage.removeItem('mai_cleared_regions');
  localStorage.removeItem('mai_seen_features');
  localStorage.removeItem('mai_auto_farm');
  localStorage.removeItem('mai_qi_crystal');
  localStorage.removeItem('mai_crystal_reservoir');
  localStorage.removeItem('mai_crystal_click_snapshot');
  // Cookie-Clicker pivot (v1) — producers + upgrades. Producer counts may be
  // partially restored AFTER wipeReincarnation by App.jsx's handleReincarnate
  // when the Eternal Tree keepProducerLevelsFrac modifier is non-zero. The
  // one-time upgrade set always wipes (no carryover by design).
  localStorage.removeItem('mai_producers');
  localStorage.removeItem('mai_producers_rate_snapshot');
  localStorage.removeItem('mai_upgrades');
  localStorage.removeItem('mai_achievements');
  // Cookie-Clicker stats tracker (useStats). Factory wipe = both run +
  // lifetime go to zero. wipeReincarnation below preserves lifetime.
  localStorage.removeItem('mai_stats');
  localStorage.removeItem('mai_permanent_pill_stats');
  // Per-pill consumption counter that drives diminishing returns. Lives
  // alongside permanentStats — both are per-incarnation, both wipe together.
  localStorage.removeItem('mai_pills_consumed');
  // ── Minigame state ────────────────────────────────────────────────────
  // Per-life state for the three Hidden Arts. Previously omitted, which
  // meant the Roster merge board, Spirit Garden plots, and Meridian
  // Furnace cauldrons + heat pool + Foundation slots all silently carried
  // over from a factory reset and from reincarnation. The codex /
  // discovered set lives INSIDE each of these blobs, so wiping the parent
  // key also resets per-minigame discovery (that's per-life by design —
  // a new cultivator re-learns the recipes). The "Eternal Roster /
  // Garden / Furnace" tree nodes don't touch these keys; they only keep
  // the producer unlock state through reincarnation (handled by
  // tree.modifiers.unlockedHiddenArts), not the live minigame contents.
  localStorage.removeItem('mai_disciple_merge');     // Sect Roster board + tiers
  localStorage.removeItem('mai_garden');             // Spirit Garden plots + dew + recipes
  localStorage.removeItem('mai_furnace');            // Meridian Furnace cauldrons + heat + foundations
  localStorage.removeItem('mai_furnace_offline_snapshot');  // furnace's pre-mount offline qi mirror
  // 2026-05-21 — Settings > "Wipe save" is a true factory reset. Karma +
  // Eternal Tree are part of the player's progression and DO get wiped here.
  // `wipeReincarnation()` below is the prestige-only path that preserves
  // them — it snapshots karma + tree BEFORE calling wipeSave() and restores
  // them after, so the prestige loop still works as designed.
  localStorage.removeItem('mai_reincarnation');
  localStorage.removeItem('mai_reincarnation_tree');
  // Rebirth-carryover state — also part of the prestige loop and gets
  // wiped here for parity with karma + tree. wipeReincarnation snapshots
  // and restores these separately when they belong to the new life.
  localStorage.removeItem('mai_banked_rerolls');
  localStorage.removeItem('mai_rebirth_cult_buff_until');
  // Tier-A tutorial card "seen" set (2026-05-21). Wipe-save = factory
  // reset = the player should re-experience the onboarding cards from
  // scratch. Future cloud-login pass will move this to the account tier
  // alongside Blood Lotus + cosmetics so a wipe-save doesn't lose
  // tutorial completion for legitimate players who reset on purpose.
  localStorage.removeItem('mai_tutorial_seen');

  // ── Gameplay-state leaks (added 2026-06-09) ──────────────────────────
  // These keys had been silently surviving the "factory reset" path,
  // which made the dev tool feel haunted: a freshly-downloaded install
  // would never have any of these, so leaving them in place meant the
  // first run on a wiped save was earning karma at the rate of a
  // long-playing one, the Journey intro never re-appeared, and so on.
  // Each one is per-incarnation gameplay state, not "device-level"
  // preference, so a true factory reset must include them.
  localStorage.removeItem('mai_qi_alltime');          // total qi earned across all lives (drives karma cube-root)
  localStorage.removeItem('mai_journey_intro_seen');  // Journey screen intro cinematic flag
  localStorage.removeItem('mai_ach_gate_hit_ever');   // achievement one-shot gate marker
  localStorage.removeItem('mai_lunch_break_progress');// lunch-break offline accumulator
  localStorage.removeItem('mai_audio_muted_progress');// muted-time accumulator (audio achievement)
  // Daily-streak meta. A first-time download has no streak history, so
  // a true factory reset clears these alongside the rest of the save.
  localStorage.removeItem('mai_consecutive_days');
  localStorage.removeItem('mai_daily_bonus');
  localStorage.removeItem('mai_daily_skip_streak');
  localStorage.removeItem('mai_daily_skip_last_day');
  // Settings interaction marker — "I've touched the settings page". A
  // first-time install hasn't. Resetting matches the fresh-download intent.
  localStorage.removeItem('mai_settings_touched');

  // ── Intentionally NOT wiped (device-level, not gameplay) ─────────────
  // mai_blood_lotus      — paid currency
  // mai_shop_inventory   — paid shop QoL / cosmetics (parallels blood_lotus)
  // mai_lang             — language preference
  // mai_save_version     — schema marker (avoid re-triggering one-shot migrations)
  // mai_audio            — audio settings
  // mai_audio_settings   — finer-grained audio prefs
  // mai_audio_timeline   — audio scheduling state (session-only-ish)
  // mai_vfx              — VFX setting
  // mai_rendering        — pixel/smooth rendering setting
  // mai_autobuy_enabled  — UI preference
  // mai_producer_buy_mode— UI preference (buy x1 / xN)
  // mai_analytics_*      — analytics IDs / first-event markers
  // mai_ad_cd_cultivation— ad cooldown (anti-grind, device-level)
  // mai_designer_pat     — dev-tool access token
  // mai_jade             — legacy migration handle, no-op after first run
}

/**
 * Wipe for reincarnation. Preserves karma + Eternal Tree purchases (the
 * prestige progression), the **entire** owned-laws library, the alchemy
 * meta-progression (discovered pill recipes + pinned recipes), and the
 * banked-reroll / rebirth-cult-buff carryovers driven by tree nodes —
 * but clears the active law so the reborn character must re-choose
 * which manual to cultivate. The library + recipe codex are permanent
 * identity across lives; the active choice is the fresh start.
 *
 * 2026-05-21 — refactored to snapshot-then-restore for every prestige
 * key. Previously these keys were simply omitted from `wipeSave`'s
 * removal list, which made "Settings > Wipe save" leave the player on
 * a non-zero `treeQiMult` (the karma + tree carried over silently).
 * Now wipeSave is a true factory reset; this function explicitly
 * preserves what should survive a reincarnation.
 */
export function wipeReincarnation() {
  // Snapshot every key that survives a reincarnation BEFORE wipeSave
  // blows it away. Each snapshot is restored after wipeSave returns.
  const snapshot = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const restore  = (key, val) => { if (val != null) { try { localStorage.setItem(key, val); } catch {} } };

  const karma         = snapshot('mai_reincarnation');
  const tree          = snapshot('mai_reincarnation_tree');
  const ownedLawsRaw  = snapshot('mai_owned_laws');
  const pinnedRecipes = snapshot('mai_pinned_recipes');

  // ── Eternal Alchemy keystone: keep 1 Foundation Pill effect across rebirth ─
  // Node description: "Keep 1 Foundation Pill effect through reincarnation.
  // (The strongest one is preserved.)" Implemented here as a snapshot-then-
  // re-seed step: while the tree owned set still contains 'eternal_alchemy'
  // (the snapshot lookup is identity-safe — tree is restored later), pull
  // the dying life's foundations off mai_furnace, pick the highest-magnitude
  // entry, and stash it for re-seeding into the fresh furnace blob after
  // wipeSave. If the keystone isn't owned, or the player has no foundations,
  // preservedFoundation stays null and the new life starts with an empty
  // Foundation row exactly as before.
  let preservedFoundation = null;
  try {
    const ownedSet = tree ? new Set(JSON.parse(tree)) : new Set();
    if (ownedSet.has('eternal_alchemy')) {
      const furnaceRaw = snapshot('mai_furnace');
      if (furnaceRaw) {
        const furnace = JSON.parse(furnaceRaw);
        const foundations = Array.isArray(furnace?.foundations) ? furnace.foundations : [];
        // Reduce on magnitude with a deterministic tiebreaker (first wins,
        // matching slot order — players associate slot 1 with their "main"
        // foundation when ties occur naturally on the same heat tier).
        preservedFoundation = foundations.reduce((best, f) => {
          if (!f || typeof f.id !== 'string') return best;
          if (!best) return f;
          return (f.magnitude ?? 0) > (best.magnitude ?? 0) ? f : best;
        }, null);
      }
    }
  } catch { /* leave preservedFoundation null on any parse error */ }
  // Cookie-Clicker stats — lifetime + sinceTs survive reincarnation; the
  // run bucket is wiped to zero and the player starts the new life with
  // fresh per-run counters.
  const statsRaw      = snapshot('mai_stats');
  // "I've already seen this" meta-state — survives across lives so the
  // player doesn't re-receive already-earned achievements, doesn't get
  // re-onboarded by tutorial cards they've already dismissed, and doesn't
  // get re-toasted by feature/world reveals they've already discovered.
  // Reincarnation is a NEW life, not a NEW player; this is the difference.
  const achievements  = snapshot('mai_achievements');
  const tutorialSeen  = snapshot('mai_tutorial_seen');
  const seenFeatures  = snapshot('mai_seen_features');
  const seenWorlds    = snapshot('mai_seen_worlds');

  wipeSave();

  // Re-seed prestige progression — karma and tree nodes.
  // (Old carryovers mai_banked_rerolls, mai_rebirth_cult_buff_until, and
  // mai_discovered_pills were driven by al_4, al_k, and al_2 respectively.
  // Those nodes no longer exist — the keys are intentionally not restored.)
  restore('mai_reincarnation',      karma);
  restore('mai_reincarnation_tree', tree);
  // Re-seed the "I've seen this" meta-state. None of these change between
  // lives — they're about what the PLAYER (not the character) knows.
  restore('mai_achievements',  achievements);
  restore('mai_tutorial_seen', tutorialSeen);
  restore('mai_seen_features', seenFeatures);
  restore('mai_seen_worlds',   seenWorlds);

  // Re-seed stats — preserve lifetime + sinceTs, reset run + stamp a
  // fresh runStartedTs so the "run started X ago" readout starts from
  // the moment of rebirth.
  if (statsRaw) {
    try {
      const parsed = JSON.parse(statsRaw);
      const now = Date.now();
      const reseeded = {
        version:      parsed.version  ?? 1,
        run:          {},               // wiped
        lifetime:     parsed.lifetime || {},
        sinceTs:      parsed.sinceTs ?? now,
        runStartedTs: now,
      };
      localStorage.setItem('mai_stats', JSON.stringify(reseeded));
    } catch {}
  }

  // Re-seed the law library (no active selection — player picks anew).
  if (ownedLawsRaw) {
    try {
      const parsed = JSON.parse(ownedLawsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('mai_owned_laws', ownedLawsRaw);
      }
    } catch {}
  }
  // Re-seed UX convenience keys.
  restore('mai_pinned_recipes', pinnedRecipes);
  // mai_active_law was removed by wipeSave; leave it absent so activeLaw
  // derives to null on next load.

  // ── Eternal Alchemy keystone re-seed ────────────────────────────────────
  // If the dying life had a foundation worth preserving AND eternal_alchemy
  // was anchored, write a minimal mai_furnace blob with just that foundation
  // sitting in slot 1. defaultFurnace() + migrate() (in src/data/furnace.js)
  // fill every other field with the empty-life defaults on load, so we only
  // need to carry the foundations array here. grantedAt is bumped to "now"
  // so the new life's foundation feels like a fresh anchor in the UI rather
  // than a stale timestamp from the prior life. Version is pinned to 1
  // (the only existing VERSION today); migrate() will lift this if the
  // schema bumps later.
  if (preservedFoundation) {
    try {
      localStorage.setItem('mai_furnace', JSON.stringify({
        v: 1,
        foundations: [{
          id:        preservedFoundation.id,
          magnitude: preservedFoundation.magnitude,
          grantedAt: Date.now(),
        }],
      }));
    } catch { /* non-fatal — the next life simply starts with empty slots */ }
  }
}

// ─── Technique slots ──────────────────────────────────────────────────────────

export function saveTechniques(slots) {
  try {
    localStorage.setItem(TECH_KEY, JSON.stringify(slots));
  } catch {}
}

export function loadTechniques() {
  try {
    const raw = localStorage.getItem(TECH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ─── Owned (dropped) techniques ───────────────────────────────────────────────

export function saveOwnedTechniques(owned) {
  try { localStorage.setItem(OWNED_TECH_KEY, JSON.stringify(owned)); } catch {}
}

export function loadOwnedTechniques() {
  try {
    const raw = localStorage.getItem(OWNED_TECH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function exportSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return btoa(raw);
}

export function importSave(encoded) {
  try {
    const json = atob(encoded.trim());
    const data = JSON.parse(json);
    // Basic validation — must have expected keys
    if (typeof data.realmIndex !== 'number' || typeof data.qi !== 'number') {
      return { ok: false, error: 'Invalid save data' };
    }
    localStorage.setItem(SAVE_KEY, json);
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Could not decode save string' };
  }
}
