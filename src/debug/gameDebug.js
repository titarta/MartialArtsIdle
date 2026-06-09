/**
 * gameDebug.js — development-only console helpers (v1 trim).
 *
 * The pre-pivot file exposed gd.giveLaws / gd.giveArtefacts / gd.giveTechniques /
 * gd.giveMaterials / combat debug knobs / drop-distribution audits / etc. — all
 * of which depended on data tables (enemies, pills, techniques, artefacts,
 * affixPools, worlds, materials, lawUniques) that were retired with the v1
 * Cookie-Clicker pivot.
 *
 * What remains is the small surface that the v1 build actually has hooks
 * for: cultivation rate / qi / realm jumps, crystal level + evolution
 * overlays, qi-spark grants, and the playthrough simulation (which has no
 * external imports of its own).
 */

import REALMS from '../data/realms';
import { QI_SPARKS, QI_SPARK_BY_ID } from '../data/qiSparks';
import { runPlaythroughSim, runCombinedProposalSim } from './playthroughSim';
import { clearAllTutorialsSeen } from '../systems/tutorialSeen';

/**
 * Attach window.debug using a ref that always points to the latest hook values.
 * Called once from App.jsx on mount.
 *
 * @param {React.MutableRefObject} hooksRef — ref whose .current is
 *   { cultivation, crystal, qiSparks, producers, upgrades }
 */
export function initDebug(hooksRef) {
  const g = () => hooksRef.current; // always-fresh hook bundle

  window.gd = {
    // ── Cultivation ────────────────────────────────────────────────────────

    /** Jump to realm index n (0-based). */
    setRealm(n) {
      const max = REALMS.length - 1;
      const idx = Math.max(0, Math.min(Math.floor(n), max));
      g().cultivation.setRealmIndex(idx);
      g().cultivation.qiRef.current = 0;
      console.log(`[debug] Realm → ${idx} (${REALMS[idx]?.name ?? '?'})`);
    },

    /** Add qi directly. */
    addQi(amount) {
      g().cultivation.qiRef.current += amount;
      const cur  = Math.floor(g().cultivation.qiRef.current);
      const cost = g().cultivation.costRef.current;
      console.log(`[debug] +${amount} qi (${cur} / ${cost})`);
    },

    /** Fill qi to just below the breakthrough threshold. */
    fillQi() {
      g().cultivation.qiRef.current = g().cultivation.costRef.current - 1;
      console.log('[debug] Qi filled — one tick from breakthrough');
    },

    /**
     * Fire the BREAKTHROUGH moment + sound WITHOUT advancing the realm.
     * gd.breakthrough()     plays the major-realm Character Evolution cinematic.
     * gd.breakthrough(true) plays the lighter peak-stage text banner.
     */
    breakthrough(peak = false) {
      window.dispatchEvent(new CustomEvent('mai:breakthrough', { detail: { peak: !!peak } }));
      console.log(`[debug] Breakthrough ${peak ? 'banner' : 'cinematic'} fired`);
    },

    // ── Qi Crystal ─────────────────────────────────────────────────────────

    /** Set crystal directly to level n (no overlay — use crystalEvolve for that). */
    setCrystalLevel(n) {
      const target = Math.max(0, Math.floor(n));
      g().crystal?._setLevel?.(target);
      console.log(`[debug] Crystal level → ${target}`);
    },

    /** Increment crystal level by n. */
    crystalLevelUp(n = 1) {
      const next = (g().crystal?.level ?? 0) + Math.floor(n);
      g().crystal?._setLevel?.(next);
      console.log(`[debug] Crystal level → ${next}`);
    },

    /**
     * Fire the crystal EVOLUTION cinematic + sound (a tier crossing) WITHOUT
     * grinding levels — for auditing the event. Defaults to a tier 1 → 2
     * evolution; pass a tier to preview a specific one, e.g. gd.crystalEvolve(7).
     */
    crystalEvolve(toTier = 2, fromTier = toTier - 1) {
      window.dispatchEvent(new CustomEvent('mai:crystal-evolve', {
        detail: { previousTier: fromTier, newTier: toTier, newLevel: g().crystal?.level ?? 0 },
      }));
      console.log(`[debug] Crystal evolution ${fromTier} → ${toTier} (cinematic + sound)`);
    },

    // ── Qi Sparks ──────────────────────────────────────────────────────────

    listQiSparks() {
      console.table(g().qiSparks?.activeSparks ?? []);
    },

    listQiSparkIds() {
      const byRarity = { common: [], uncommon: [], rare: [], legendary: [] };
      for (const s of QI_SPARKS) (byRarity[s.rarity] ?? (byRarity[s.rarity] = [])).push(s.id);
      console.table(byRarity);
    },

    giveQiSpark(sparkId) {
      const ok = g().qiSparks?.grant?.(sparkId);
      const card = QI_SPARK_BY_ID[sparkId];
      console.log(ok
        ? `[debug] +Spark ${card?.name ?? sparkId}`
        : `[debug] Spark grant failed for ${sparkId}`);
    },

    /** Grant every qi spark at once (mechanic sparks max out via grant's tier-upgrade). */
    giveAllSparks() {
      let n = 0;
      for (const s of QI_SPARKS) { if (g().qiSparks?.grant?.(s.id)) n++; }
      console.log(`[debug] Granted ${n} / ${QI_SPARKS.length} sparks`);
    },

    clearQiSparks() {
      g().qiSparks?.clearAll?.();
      console.log('[debug] All qi sparks cleared');
    },

    // ── Tutorials / tour ───────────────────────────────────────────────────

    clearTutorials() {
      clearAllTutorialsSeen();
      console.log('[debug] All tutorial-seen flags cleared');
    },

    // ── Sim / balance ──────────────────────────────────────────────────────

    simPlay() { return runPlaythroughSim(); },
    simCombined(opts) { return runCombinedProposalSim(opts); },

    /** Print all available commands. */
    help() {
      console.group('%c[debug] Available Commands', 'color: #c084fc; font-weight: bold');
      console.log('  gd.breakthrough(peak=false)    fire BT cinematic / peak banner + sound');
      console.log('  gd.crystalEvolve(to=2, from)   fire crystal evolution cinematic + sound');
      console.log('  gd.giveAllSparks()             grant every spark at once');
      console.log('  gd.setRealm(n)               — jump to realm index n');
      console.log('  gd.addQi(amount)             — add qi instantly');
      console.log('  gd.fillQi()                  — fill qi to just before breakthrough');
      console.log('  gd.setCrystalLevel(n)        — set crystal level');
      console.log('  gd.crystalLevelUp(n=1)       — increment crystal level');
      console.log('  gd.listQiSparks()            — table of active sparks');
      console.log('  gd.listQiSparkIds()          — all card ids by rarity');
      console.log('  gd.giveQiSpark(sparkId)      — grant a spark by id');
      console.log('  gd.clearQiSparks()           — wipe all active sparks');
      console.log('  gd.clearTutorials()          — re-show every tutorial card');
      console.log('  gd.simPlay()                 — compare playthrough times A/B/C');
      console.log('  gd.help()                    — show this message');
      console.groupEnd();
    },
  };

  console.log(
    '%c[MartialArtsIdle] Debug tools ready — type gd.help()',
    'color: #c084fc; font-weight: bold; font-size: 13px',
  );
}
