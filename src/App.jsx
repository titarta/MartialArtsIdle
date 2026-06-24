import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import NavBar from './components/NavBar';
import TopBar from './components/TopBar';
import HomeScreen from './screens/HomeScreen';
import BloodLotusShopModal from './components/BloodLotusShopModal';
import SpiritBazaarScreen from './screens/SpiritBazaarScreen';
import { addBloodLotus as addBloodLotusBalance, getBloodLotusBalance } from './systems/bloodLotus';
import useShopInventory from './hooks/useShopInventory';
import { SHOP_ITEMS_BY_ID } from './data/shopItems';
import CodexModal from './components/CodexModal';
import JourneyScreen from './screens/JourneyScreen';
import DailyBonusModal from './components/DailyBonusModal';
import { useDailyBonus } from './hooks/useDailyBonus';
import EternalTreeScreen from './components/EternalTreeScreen';
import ReincarnationConfirmModal from './components/ReincarnationConfirmModal';
import SeveringRite from './components/SeveringRite';
import DissolutionRite from './components/DissolutionRite';
import { initAds } from './rewards/rewardService';
import { initIAP } from './iap/iapService';
import { restoreResolution } from './systems/desktopResolution';
import {
  initAnalytics,
  trackReincarnation,
  trackAchievementUnlocked,
  trackScreenView,
  trackFirstTime,
} from './analytics';
import CultivationScreen from './screens/CultivationScreen';
import SettingsScreen from './screens/SettingsScreen';
import AboutScreen    from './screens/AboutScreen';
import useReincarnationKarma from './hooks/useReincarnationKarma';
import useReincarnationTree  from './hooks/useReincarnationTree';
import { useDiscipleMergeProvider, DiscipleMergeContext } from './hooks/useDiscipleMerge';
import useFurnace from './hooks/useFurnace';
import { MATERIALS as FURNACE_MATERIALS_REF, PILLS as FURNACE_PILLS_REF, FOUNDATIONS as FURNACE_FOUNDATIONS_REF } from './data/furnace';
import { wipeReincarnation, SAVE_VERSION, SAVE_VERSION_KEY } from './systems/save';
import useCultivation from './hooks/useCultivation';
import useQiCrystal, { getCrystalTier }  from './hooks/useQiCrystal';
import useProducers  from './hooks/useProducers';
import useUpgrades   from './hooks/useUpgrades';
import useStats       from './hooks/useStats';
import { recordStat } from './systems/statsRecorder';
import { initDebug } from './debug/gameDebug';
import { preloadImages, PLAYER_SPRITE_SRCS } from './utils/preload';
import { loadGraphics, applyGraphics } from './systems/graphics';
import useNotifications from './hooks/useNotifications';
import useQiSparks  from './hooks/useQiSparks';
import useFeatureFlags from './hooks/useFeatureFlags';
import useAchievements from './hooks/useAchievements';
import achBus from './systems/achievementBus';
import { isLunarNewYear, isDoubleNinth } from './systems/calendarEvents';
import { FEATURES } from './data/featureFlags';
import { QI_SPARK_BY_ID, QI_SPARKS } from './data/qiSparks';
import { sparksToGrantOnEvolution } from './data/crystalMechanicGrants';
import { PRODUCERS_BY_ID } from './data/producers';
import { loadGarden, saveGarden, gardenActiveQiMult } from './data/spiritGarden';
import { fireTutorialOnce } from './systems/fireTutorial';
import { hasSeenTutorial, markTutorialSeen } from './systems/tutorialSeen';
import { TUTORIAL_IDS } from './data/tutorialCards';
import TutorialModal from './components/TutorialModal';
import { useGameText } from './i18n/gameText';

// The v1 nav routes are home / cultivation / journey + the top-bar surfaces
// (spirit-bazaar / settings / about). Every combat-adjacent screen
// (worlds / combat-arena / character / collection / production) was removed
// when combat shipped behind feature flags. Routes targeting those ids fall
// back to home via the guard in navigate() below, so stale saves or
// notification deeplinks can't strand a player on a missing screen.
const ALLOWED_SCREENS = new Set([
  'home', 'cultivation', 'journey', 'spirit-bazaar', 'settings', 'about',
]);
const isScreenAllowed = (screenId) => ALLOWED_SCREENS.has(screenId);
import ToastStack from './components/ToastStack';
import QiSparkChoiceModal from './components/QiSparkChoiceModal';
import { AudioManager } from './audio';
import { installGlobalClickSfx } from './audio/clickSfx';
import { Platform } from './platform';
import { EventQueueProvider, useEventQueue, useBlockingPresence } from './contexts/EventQueueContext';
import './App.css';

function AppInner() {
  const gt = useGameText();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParam,   setScreenParam]   = useState(null);
  // selectionModalOpen used to gate the law-offer SelectionModal. Laws are
  // hidden in v1 so the flag is dead; the variable is kept so the
  // useBlockingPresence call below doesn't need a second branch when laws
  // come back. Always false.
  const selectionModalOpen = false;

  // Single active modal — only one top-bar popup can be open at a time.
  // Toggling the same key closes it; opening a new key replaces the current one.
  const [activeModal, setActiveModal] = useState(null);
  const [hasNewAch,   setHasNewAch]   = useState(false);
  // Reincarnation flow: null = closed, 'confirm' = the warning modal, 'tree' =
  // the committed full-screen Eternal Tree (no nav, no cancel). Confirming the
  // modal is the point of no return; the tree's only exit is to reincarnate.
  // Stages: 'confirm' → 'severing' → 'rising' → 'tree'. 'rising' is the 800ms
  // overlap where the cinematic fades while the Eternal Tree screen mounts
  // beneath — the cross-fade that lets the two scenes hand off cleanly.
  const [reincarnationStage, setReincarnationStage] = useState(null);
  useEffect(() => {
    if (reincarnationStage !== 'rising') return;
    const t = setTimeout(() => setReincarnationStage('tree'), 800);
    return () => clearTimeout(t);
  }, [reincarnationStage]);

  const openModal = useCallback((key, sideEffect) => {
    setActiveModal(prev => {
      if (prev === key) return null;
      if (sideEffect) sideEffect();
      // Broadcast so other modals (ActiveSparksBar, CrystalFeedModal, …) close.
      window.dispatchEvent(new CustomEvent('mai:modal-opened', { detail: { id: key } }));
      return key;
    });
  }, []);

  // Close any app-level modal when an external modal announces itself.
  // We keep a Set of our own ids so we don't react to our own broadcast.
  useEffect(() => {
    const ours = new Set(['shop', 'codex', 'daily']);
    const handler = (e) => {
      if (!ours.has(e.detail?.id)) setActiveModal(null);
    };
    window.addEventListener('mai:modal-opened', handler);
    return () => window.removeEventListener('mai:modal-opened', handler);
  }, []);

  const dailyBonus = useDailyBonus();

  // Event queue — coordinates spontaneous popups so they don't stack.
  const { enqueue, currentEvent, dismiss } = useEventQueue();

  // Player-driven modals pause the queue while open (Settings, Achievements,
  // Journey, Shop, Pills, Daily Bonus tap-opened, mid-session reward cards
  // tap-opened). Spontaneous events queued behind them wait until they close.
  useBlockingPresence(!!activeModal || selectionModalOpen || reincarnationStage !== null);

  // Auto-enqueue daily bonus on login if uncollected — the queue presents it
  // when nothing else (offline gains, breakthrough, etc.) is in front.
  useEffect(() => {
    if (dailyBonus.isAvailable) enqueue('daily-bonus', null, { dedupe: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { initAds(); }, []);
  useEffect(() => { initAnalytics(); }, []);
  // RevenueCat IAP: no-op on non-native / empty key. After init, self-heal any
  // paid-but-ungranted purchase (SDK error after Google charged): syncing
  // validates + consumes it (unblocks rebuy) and the ledger grants the packs.
  useEffect(() => {
    (async () => {
      await initIAP();
      try {
        const { recoverPendingBloodLotus } = await import('./systems/bloodLotus');
        const { recovered } = await recoverPendingBloodLotus();
        if (recovered > 0) {
          const { default: i18n } = await import('./i18n');
          notifications.addToast?.({
            type:    'success',
            kicker:  i18n.t('ui:shop.toastKicker'),
            glyph:   '蓮',
            message: i18n.t('ui:shop.recoveredToast', { amount: recovered.toLocaleString() }),
            duration: 6500,
          });
        }
      } catch {}
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { preloadImages(PLAYER_SPRITE_SRCS); }, []);
  useEffect(() => { applyGraphics(loadGraphics()); }, []);

  // Stats — wall-clock time-played counter. Ticks 1 second per second of
  // foreground time. setInterval pauses naturally when the tab is
  // backgrounded (mobile browsers throttle background timers heavily),
  // which is the desired behaviour — "time the player actually spent in
  // the game", not real-world elapsed time.
  useEffect(() => {
    const id = setInterval(() => { recordStat('timePlayed', 1); }, 1000);
    return () => clearInterval(id);
  }, []);

  // Blood Lotus Shop — "Disciple's Diligence" QoL state (toggle persists
  // separately from the QoL ownership flag). The effects that USE
  // `cultivation` / `producers` (Decisive Heart auto-confirm + the
  // auto-buy tick) live lower in the file, after those hooks enter
  // scope, to avoid TDZ on their dependency arrays.
  const [autoBuyEnabled, setAutoBuyEnabled] = useState(() => {
    try { return localStorage.getItem('mai_autobuy_enabled') === '1'; } catch { return false; }
  });
  const toggleAutoBuy = useCallback(() => {
    setAutoBuyEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('mai_autobuy_enabled', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // (Removed) Returning-player migration card triggers — both the
  // PROGRESS_HUB_MIGRATION (Journey/Achievements layout shuffle) and
  // ANNALS_TO_CODEX_MIGRATION (Annals → Codex rename + Wardrobe tab).
  // Migration cards are temporary scaffolding to soften UI churn for
  // players returning across an update; once the player base has rolled
  // past the change, the card just becomes noise on first launch every
  // time someone opens the app. Both card bodies + their TUTORIAL_IDS
  // entries have been removed too (see src/data/tutorialCards.js).

  // Save schema version stamp. Set on first launch (and after any future
  // migrations). On v1 (Cookie-Clicker pivot) no data migration is needed —
  // combat-tied keys are preserved on disk and hidden by FEATURES flags.
  useEffect(() => {
    try {
      const prev = localStorage.getItem(SAVE_VERSION_KEY);
      if (prev !== String(SAVE_VERSION)) {
        localStorage.setItem(SAVE_VERSION_KEY, String(SAVE_VERSION));
      }
    } catch {}
  }, []);

  // Apply saved resolution preset on startup. Works for Steam (Electron IPC
  // resizes the OS window) and for Android-on-PC / browser desktop (CSS
  // body class letterboxes the inner game viewport). See desktopResolution.js.
  useEffect(() => { restoreResolution(); }, []);

  // useStats MUST mount before any hook that records stats so the
  // singleton recorder is bound when those hooks fire their first events.
  // See src/systems/statsRecorder.js for the binding mechanism.
  const stats           = useStats();
  const shopInventory   = useShopInventory();
  const cultivation     = useCultivation();
  const discipleMerge   = useDiscipleMergeProvider();
  const karma           = useReincarnationKarma();
  const tree            = useReincarnationTree({ karma: karma.karma, spendKarma: karma.spendKarma, lives: karma.lives });
  // useQiCrystal originally read herb/stone quantities from the player's
  // inventory for the v0 stone-fed reactivation flow. The inventory layer
  // was retired with the v1 Cookie-Clicker pivot; pass stubs so the hook's
  // optional consumers no-op without throwing.
  const crystal         = useQiCrystal({ getQuantity: () => 0, removeItem: () => false });
  // Mirror current crystal tier into a body class so the qi-VFX colour
  // bundle (--qi-aura-*, --qi-text-*, --qi-bar-*) cascades from there.
  // App.css `body.crystal-tier-{1..10}` blocks set the palette; aura,
  // floaters, and Qi-bar fill all read from those vars.
  //
  // Tier mapping mirrors useQiCrystal.js (2026-05-21 Dial-6, 10 tiers,
  // evolutions every 10 levels, T10 at L100):
  //   T1=L1, T2=L10, T3=L20, T4=L30, T5=L40,
  //   T6=L50, T7=L60, T8=L70, T9=L80, T10=L100.
  useEffect(() => {
    const TIERS = [
      [100, 10], [80, 9], [70, 8], [60, 7], [50, 6],
      [40, 5],   [30, 4], [20, 3], [10, 2], [1, 1],
    ];
    const level = crystal?.level ?? 0;
    let tier = 1;
    for (const [thresh, t] of TIERS) {
      if (level >= thresh) { tier = t; break; }
    }
    const cls = `crystal-tier-${tier}`;
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [crystal?.level]);

  // Cinematic lock — while a breakthrough banner, character-evolution, or
  // crystal-evolution overlay is on screen, block every other interaction
  // (top bar, nav bar tabs, hold-to-focus, crystal/divine taps). The user
  // shouldn't be able to navigate away mid-animation or trigger a side
  // effect that fights the cinematic for screen real estate. CSS does the
  // actual gating via `body.event-cinematic` rules in App.css.
  useEffect(() => {
    const kind = currentEvent?.kind;
    const lock = kind === 'breakthrough'
              || kind === 'character-evolution'
              || kind === 'crystal-evolution'
              || kind === 'offline-earnings';
    if (!lock) return undefined;
    document.body.classList.add('event-cinematic');
    return () => document.body.classList.remove('event-cinematic');
  }, [currentEvent]);
  const producers       = useProducers();
  const upgrades        = useUpgrades();
  // Meridian Furnace (alchemy minigame) — uses pantry of plants, materials,
  // pills, and Foundation slots. Heat regen / cap scale with the
  // p_meridian_furnace producer count; cauldron count comes from the
  // Eternal Tree Alchemy branch (1 + per node).
  const furnace         = useFurnace({
    furnaceCount:  producers.getOwned?.('p_meridian_furnace') ?? 0,
    cauldronCount: tree.modifiers.furnaceCauldronCount ?? 1,
  });

  // Blood Lotus Shop — "Disciple's Diligence" auto-buy tick. Declared
  // here (after `producers` enters scope) so the effect's dependency
  // array doesn't TDZ. Runs only when the QoL is owned AND the toggle
  // is enabled. Buys ONE cheapest-affordable producer per second so the
  // tick doesn't fully drain qi the player wanted to save for crystal
  // refines / breakthrough buffer.
  useEffect(() => {
    if (!autoBuyEnabled) return;
    if (!shopInventory.hasQol('qol_autobuy_cheapest')) return;
    const id = setInterval(() => {
      let best = null;
      for (const p of Object.values(PRODUCERS_BY_ID)) {
        if (!producers.isUnlocked(p.id, cultivation.realmIndex)) continue;
        const cost = producers.getCost(p.id, 1);
        if (cost <= 0) continue;
        if (cultivation.qiRef.current < cost) continue;
        if (!best || cost < best.cost) best = { id: p.id, cost };
      }
      if (best && cultivation.spendQi?.(best.cost)) {
        producers.buy(best.id, 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [autoBuyEnabled, shopInventory, producers, cultivation]);

  // Blood Lotus Shop — "Decisive Heart" QoL. When the player owns this
  // and a major breakthrough is pending, auto-fire confirm so the
  // celebratory pause is skipped. Declared here (after `cultivation`
  // is in scope) to avoid a TDZ on the dep array. confirmMajorBreakthrough
  // is already idempotent (no-op if nothing pending), and the post-
  // confirm banner / spark-offer flow still runs — we're just saving
  // the player a tap.
  useEffect(() => {
    if (!cultivation.pendingMajorBreakthrough) return;
    if (!shopInventory.hasQol('qol_skip_bt_confirm')) return;
    cultivation.confirmMajorBreakthrough?.();
  }, [cultivation.pendingMajorBreakthrough, shopInventory, cultivation]);

  // featureFlags is declared further down — useQiSparks reads its unlock
  // gates via this ref-backed callback to avoid a TDZ on the inline value.
  const featureFlagsRef = useRef(null);
  const isFeatureUnlocked = useCallback(
    (id) => featureFlagsRef.current?.isUnlocked?.(id) ?? false,
    [],
  );
  // Producer-unlock gate for legendary producer-synergy sparks. Cards with
  // `requiresProducers: [...]` are filtered out of the offer pool unless
  // every referenced producer is unlocked. Closes over the latest
  // realmIndex — useQiSparks resyncs its ref on identity change.
  const producerUnlocked = useCallback(
    (pid) => producers.isUnlocked(pid, cultivation.realmIndex),
    [producers, cultivation.realmIndex],
  );
  const qiSparks        = useQiSparks({ cultivation, isFeatureUnlocked, producerUnlocked, sparkCommonWeightMult: tree.modifiers.sparkCommonWeightMult ?? 1 });

  // Legendary-pool transparency for the choice modal: tells the player how
  // much of the legendary pool is currently in reach AND what to chase next
  // when the pool is partial. Recomputes on realm changes so progress is
  // reflected the instant a producer unlocks.
  const legendaryPoolInfo = useMemo(() => {
    const allLegendary = QI_SPARKS.filter(c => c.rarity === 'legendary');
    const total        = allLegendary.length;
    // Already-owned legendary ids — these are UNIQUE, the pool can't draw
    // them again, so they shouldn't be counted as "available" to the player.
    // The footer label was reading "X of Y unlocked" including owned ones,
    // making rerolls feel like they had a real shot when in fact zero
    // legendaries were left to draw.
    const ownedIds = new Set(
      (qiSparks?.activeSparks ?? [])
        .filter(s => QI_SPARK_BY_ID[s.sparkId]?.rarity === 'legendary')
        .map(s => s.sparkId)
    );
    const eligible = allLegendary.filter(c => {
      if (ownedIds.has(c.id)) return false; // already owned, can't draw again
      return (c.requiresProducers ?? []).every(pid => producers.isUnlocked(pid, cultivation.realmIndex));
    });
    let nextUnlock = null;
    if (eligible.length < total - ownedIds.size) {
      // For each ineligible+unowned legendary, find the BLOCKER producer
      // with the highest unlock-realm requirement (that's what gates it).
      // Then find the legendary whose blocker comes up SOONEST — that's
      // the next unlock the player will see when they progress.
      let bestRealm = Infinity;
      let bestProducer = null;
      for (const card of allLegendary) {
        if (ownedIds.has(card.id)) continue;
        if ((card.requiresProducers ?? []).every(pid => producers.isUnlocked(pid, cultivation.realmIndex))) continue;
        let highestRealm = -1;
        let highestProducer = null;
        for (const pid of card.requiresProducers ?? []) {
          if (!producers.isUnlocked(pid, cultivation.realmIndex)) {
            const p = PRODUCERS_BY_ID[pid];
            const r = p?.unlock?.minRealmIndex ?? 0;
            if (r > highestRealm) { highestRealm = r; highestProducer = p; }
          }
        }
        if (highestRealm >= 0 && highestRealm < bestRealm) {
          bestRealm = highestRealm;
          bestProducer = highestProducer;
        }
      }
      if (bestProducer) {
        nextUnlock = { producerName: bestProducer.name, realmIndex: bestRealm };
      }
    }
    // totalCount now reports remaining draws (total - owned), matching
    // what the footer label needs to show "X of Y available" honestly.
    return {
      eligibleCount: eligible.length,
      totalCount:    total - ownedIds.size,
      nextUnlock,
    };
  }, [producers, cultivation.realmIndex, qiSparks?.activeSparks]);

  // Award karma continuously based on total Qi earned this life.
  // Checks every second; the karma hook computes the delta internally.
  useEffect(() => {
    if (!karma.noteQiEarned) return;
    const id = setInterval(() => {
      // Feed the ALL-TIME cumulative qi (never reset) — the karma hook uses
      // the cumulative cube-root formula now, not per-life.
      karma.noteQiEarned(cultivation.qiEarnedAllTimeRef?.current ?? 0);
    }, 1000);
    return () => clearInterval(id);
  }, [karma.noteQiEarned, cultivation.qiEarnedAllTimeRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push reincarnation-tree cultivation speed bonus into the loop.
  // n_1 Devoted Path: treeQiMult = 1 + 0.001 × karmaSpentOnTree.
  useEffect(() => {
    cultivation.treeQiMultRef.current       = tree.modifiers.treeQiMult ?? 1;
    cultivation.treeHeavenlyMultRef.current = tree.modifiers.heavenlyMult ?? 1; // heaven Heaven-Touched (applies while a boost is active)
    // qiOnRealmFrac — no tree node; stays at 0 (Yin Reservoir was yy_2).
    if (cultivation.qiOnRealmFracRef) {
      cultivation.qiOnRealmFracRef.current  = 0;
    }
    // coffers Boundless Coffers — global producer output multiplier (+15%).
    if (cultivation.treeProducerOutputMultRef) {
      cultivation.treeProducerOutputMultRef.current = tree.modifiers.producerOutputMult ?? 1;
    }
    // n_5 Frugal Cultivation — write producer cost discount ref. Furnace
    // Foundation Frugal + Frugal Mind / Quiet Tide pill buffs stack
    // multiplicatively with the tree node so a player who has all three
    // sees additive-percent reductions compound. allMods.producerCostMult
    // is already (1 - frac), so multiply straight in.
    if (producers.costMultRef) {
      producers.costMultRef.current = (tree.modifiers.producerCostMult ?? 1)
        * (furnace.allMods?.producerCostMult ?? 1);
    }
    // Furnace breakthrough cost discount — mirror into the cultivation ref
    // so the next breakthrough costs less qi.
    if (cultivation.breakthroughCostMultRef) {
      cultivation.breakthroughCostMultRef.current = 1 - (furnace.allMods?.breakthroughDiscount ?? 0);
    }
    // Furnace offline-qi snapshot — useCultivation's offline catch-up calc
    // runs BEFORE React mounts (it has to read from localStorage during
    // load), so we mirror the live mult into a snapshot here that the
    // hook can pick up next session.
    try {
      const offlineMult = furnace.allMods?.offlineQiMult ?? 1;
      localStorage.setItem('mai_furnace_offline_snapshot', JSON.stringify({ offlineQiMult: offlineMult }));
    } catch {}
    // hand Open Hand — disciple placement Merit cost discount.
    if (discipleMerge?.placeCostMultRef) {
      discipleMerge.placeCostMultRef.current = tree.modifiers.disciplePlaceCostMult ?? 1;
    }
  }, [tree.modifiers, cultivation.treeQiMultRef, cultivation.treeHeavenlyMultRef, cultivation.qiOnRealmFracRef, cultivation.treeProducerOutputMultRef, producers.costMultRef, furnace.allMods]); // eslint-disable-line react-hooks/exhaustive-deps


  // Ref updated every render so effects always see the latest breakthrough state
  // without needing it as a dep (avoids stale-closure false-negatives).
  const majorBreakthroughRef = useRef(null);
  majorBreakthroughRef.current = cultivation.majorBreakthrough;

  // Selection-card law offers were retired with the v1 Cookie-Clicker pivot.
  // The auto-enqueue effect that watched selections.pendingCount has been
  // dropped along with useLawOffers. If laws return, restore both here.

  // Auto-enqueue offline earnings when they appear. Pinned priority so it
  // stays at the head of the queue even if a crystal/character evolution fires
  // simultaneously -- the player must collect (or watch the ad) before anything
  // else pops over it.
  useEffect(() => {
    if (cultivation.offlineEarnings > 0) {
      enqueue('offline-earnings', null, { priority: 'pinned', dedupe: true });
    }
  }, [cultivation.offlineEarnings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep QI crystal bonus in sync with cultivation game loop.
  // n_3 Crystalline Focus multiplies the crystal's qi-rate contribution by 1.20.
  useEffect(() => {
    if (!cultivation.crystalQiBonusRef) return;
    cultivation.crystalQiBonusRef.current =
      crystal.crystalQiBonus * (tree.modifiers.crystalQiBonusMult ?? 1);
  }, [crystal.crystalQiBonus, tree.modifiers.crystalQiBonusMult, cultivation.crystalQiBonusRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror the producer-driven qi/sec into the cultivation tick — folding in
  // per-producer "doubling" upgrades at the source. Producer × upgrade-mult is
  // the effective contribution; the global `upgradeProducerMultRef` stays at 1
  // until Eternal-Tree capstones land in Phase E.
  //
  // Also writes the offline-rate snapshot (`mai_producers_rate_snapshot`) so
  // useCultivation's pre-mount offline-earnings calc sees the effective rate
  // (mirrors `mai_crystal_click_snapshot` pattern). Fires on producer OR
  // upgrade change.
  useEffect(() => {
    if (!cultivation.producerRateRef) return;
    // Per-producer multiplier composes the upgrade-doubling mult with the
    // legendary spark per-producer mult (pair synergies, count-based bonuses,
    // single-producer ×N, Phoenix Reborn). Both contribute multiplicatively.
    const ownedMap = producers.owned;
    // Disciple Promotion grid (merge minigame) → +X% to p_disciple per-unit
    // qi/s. Folded into perProducer so it composes with upgrade doubling,
    // spark synergies, and shop buffs in the same multiplicative chain.
    // Disciple Roster board bonus, amplified by the Eternal Tree 'Star
    // Disciples' node (x1.5 on the board-sum BONUS) when owned.
    const dmRaw = discipleMerge?.producerMult ?? 1;
    const discipleMergeMult = 1 + (dmRaw - 1) * (tree.modifiers.discipleBoardSumMult ?? 1);
    const perProducer = (pid) =>
      upgrades.getProducerMult(pid)
        * qiSparks.getProducerSparkMult(pid, ownedMap)
        * (pid === 'p_disciple' ? discipleMergeMult * (tree.modifiers.discipleOutputMult ?? 1) * (tree.modifiers.discipleBaseMult ?? 1) : 1);
    // 2026-05-21 Dial-9 — Sect Discipline (common timed spark) adds +N to
    // every producer's per-unit qi/s while active. Read from the spark ref
    // (default 0). The bonus flows through per-producer mults and all
    // downstream global mults the same way the producer's own base does.
    const flatPerUnit = qiSparks.producerFlatPerUnitRef?.current ?? 0;
    // Furnace alchemy bundle — Foundation Pill (permanent) effects plus
    // any active timed pill buffs the player has consumed. Multiplied into
    // the global producer rate; producer-cost reductions flow through
    // producers.costMultRef below; offline / breakthrough effects are
    // mirrored into snapshots that useCultivation reads.
    const furnaceQiMult = furnace.allMods?.qiPerSecMult ?? 1;
    const effective = producers.getRate(perProducer, flatPerUnit, {
      selfSynergyPct:  tree.modifiers.producerSelfSynergyPct  ?? 0,
      crossSynergyPct: tree.modifiers.producerCrossSynergyPct ?? 0,
    }) * furnaceQiMult;
    cultivation.producerRateRef.current = effective;
    // Trinity Convergence + producer_pair_global_mult — global multipliers
    // from legendary sparks, folded into the rate calc downstream.
    if (cultivation.sparkLegendaryGlobalMultRef) {
      cultivation.sparkLegendaryGlobalMultRef.current = qiSparks.getGlobalSparkMult(ownedMap);
    }
    try {
      localStorage.setItem('mai_producers_rate_snapshot', JSON.stringify({ rate: effective }));
    } catch {}
  }, [producers.owned, upgrades.owned, qiSparks.activeSparks, shopInventory.inv, tree.modifiers, cultivation.producerRateRef, cultivation.sparkLegendaryGlobalMultRef, discipleMerge?.producerMult, furnace.allMods]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disciple Merit settle-on-change — when the disciple producer count
  // changes, fold the Merit accumulated SO FAR (using the prior count) into
  // stored, so the next accrual interval uses the new count. This lazy
  // settle pattern avoids any 1Hz tick in App.jsx and still keeps offline
  // (cross-load) catch-up mathematically clean.
  const lastDiscipleCountRef = useRef(0);
  useEffect(() => {
    const current = producers.getOwned?.('p_disciple') ?? 0;
    if (!discipleMerge?.settle) return;
    if (current !== lastDiscipleCountRef.current) {
      discipleMerge.settle(lastDiscipleCountRef.current);
      lastDiscipleCountRef.current = current;
    }
  }, [producers.owned, discipleMerge]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phoenix Reborn (legendary E2) — useQiSparks dispatches this event when
  // a major realm transition fires while the spark is active. Reset the
  // player's Phoenix count to 0 (the permanent +mult bonus on other producers
  // is already accounted for in qiSparks.getProducerSparkMult via the
  // per-instance stack counter).
  useEffect(() => {
    const handler = () => {
      try { producers.setOwnedCount?.('p_phoenix', 0); } catch {}
    };
    window.addEventListener('mai:phoenix-reborn', handler);
    return () => window.removeEventListener('mai:phoenix-reborn', handler);
  }, [producers]);

  // Mirror remaining upgrade effects into cultivation refs. crystal-tap mult
  // is applied inside collectCrystalReservoir; gate-reduction mult into the
  // major-realm gate; focus-mult adder folds into the per-second focusMult
  // interval (see below). Sparks reroll discount is read directly by useQiSparks
  // via the upgrades hook in a separate effect (Phase D TODO).
  useEffect(() => {
    // Crystal-tap mult composes upgrade-driven (Refined Tap I–V) × tree-driven
    // (yy_3 Heart of Stone repurposed) so both contribute multiplicatively.
    if (cultivation.upgradeCrystalTapMultRef) {
      cultivation.upgradeCrystalTapMultRef.current = upgrades.getCrystalTapMult();
    }
    if (cultivation.upgradeFocusMultAddRef) {
      cultivation.upgradeFocusMultAddRef.current = upgrades.getFocusMultAdd();
    }
  }, [upgrades.owned, tree.modifiers, cultivation.upgradeCrystalTapMultRef, cultivation.upgradeFocusMultAddRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Blood Lotus Shop — equipped cosmetics. Each cosmetic declares a
  // `effect.bodyClass`; this effect syncs the currently-equipped class
  // per slot to the document body so CSS selectors in App.css can
  // tint the relevant element (cultivator sprite, crystal, particles,
  // background) without touching JSX. Re-runs when inv changes
  // (equip / unequip / purchase / reincarnation rehydrate).
  useEffect(() => {
    const equippedMap = shopInventory.inv?.equipped ?? {};
    // Collect the bodyClass for every currently-equipped cosmetic.
    const desired = new Set();
    for (const [, itemId] of Object.entries(equippedMap)) {
      const item = SHOP_ITEMS_BY_ID[itemId];
      if (item?.effect?.bodyClass) desired.add(item.effect.bodyClass);
    }
    // Sync body.classList: remove any cosmetic-* classes not in the
    // desired set; add desired ones not present. We only touch
    // classes starting with `cosmetic-` so unrelated body classes
    // (event-cinematic, vfx-disabled, …) are left alone.
    const toRemove = [];
    for (const cls of document.body.classList) {
      if (cls.startsWith('cosmetic-') && !desired.has(cls)) toRemove.push(cls);
    }
    toRemove.forEach((cls) => document.body.classList.remove(cls));
    desired.forEach((cls) => document.body.classList.add(cls));
  }, [shopInventory.inv]);

  // Crimson Aura VFX — toggles `body.body-crimson-aura-active` while
  // any Crimson Aura buff is active. CSS (App.css) attaches the halo
  // pseudo-element + drop-shadow to .home-cultivator-sprite via this
  // class. Polls the active buffs list (already refreshed by
  // useShopInventory's 1 Hz tick) so the VFX appears the moment a buff
  // is purchased and clears the moment it expires.
  useEffect(() => {
    const active = (shopInventory.activeBuffs ?? []).some(
      (b) => b.item?.effect?.vfx === 'crimson-aura'
    );
    if (active) {
      document.body.classList.add('body-crimson-aura-active');
      return () => document.body.classList.remove('body-crimson-aura-active');
    }
    return undefined;
  }, [shopInventory.activeBuffs]);

  // Mirror Blood Lotus Shop timed-buff multipliers into cultivation refs.
  // Re-runs whenever the shopInventory state changes (purchase, expiry).
  //   qi_mult         → cultivation.shopBuffQiMultRef
  //   crystal_tap_mult→ cultivation.shopBuffCrystalTapMultRef
  // (Heavenly Resonance rides adBoost via cultivation.resonanceActiveRef,
  //  mirrored in its own effect above — not a getActiveBuffMult type.)
  useEffect(() => {
    if (cultivation.shopBuffQiMultRef) {
      cultivation.shopBuffQiMultRef.current = shopInventory.getActiveBuffMult('qi_mult');
    }
    if (cultivation.shopBuffCrystalTapMultRef) {
      cultivation.shopBuffCrystalTapMultRef.current = shopInventory.getActiveBuffMult('crystal_tap_mult');
    }
    // Crimson Aura (qi_mult) applies OFFLINE too, but only for the wall-clock
    // hours the buff is still live. The offline calc runs before React mounts,
    // so it can't read this hook; mirror the live buff's mult + absolute
    // expiry into a localStorage snapshot it can read (same pattern as the
    // artefact/furnace offline snapshots). Cleared when no qi_mult buff is live.
    try {
      const qiBuff = shopInventory.inv?.buffs?.qi_mult;
      if (qiBuff && qiBuff.mult > 1 && qiBuff.expiresAtMs > Date.now()) {
        localStorage.setItem('mai_shop_buff_offline_snapshot',
          JSON.stringify({ qiMult: qiBuff.mult, expiresAtMs: qiBuff.expiresAtMs }));
      } else {
        localStorage.removeItem('mai_shop_buff_offline_snapshot');
      }
    } catch { /* storage unavailable; offline buff just won't apply */ }
  }, [shopInventory.inv, cultivation.shopBuffQiMultRef, cultivation.shopBuffCrystalTapMultRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heavenly Resonance — mirror the shop's foreground-draining pool into the
  // cultivation Heavenly Qi boost. While the resonance is live the cultivator
  // gets the same ×1.5 + heavenly extras + halo as the rewarded-ad boost.
  useEffect(() => {
    if (cultivation.resonanceActiveRef) {
      cultivation.resonanceActiveRef.current = !!shopInventory.resonanceActive;
    }
  }, [shopInventory.resonanceActive, cultivation.resonanceActiveRef]);

  // Mirror the Spirit Garden elixir buff into cultivation once per second. The
  // garden persists to localStorage independently of this component tree, so we
  // poll rather than subscribe: the qi/s multiplier stays live whether the
  // garden overlay is open, closed, or the elixir was brewed in a past session
  // (timed buffs expire on a timestamp, so only polling catches the expiry).
  useEffect(() => {
    const apply = () => {
      if (cultivation.gardenBuffQiMultRef) {
        // potency Verdant Potency — amplify the elixir BONUS (x1.2), not the
        // neutral 1. So +12% becomes +14.4% when the node is owned.
        const m = gardenActiveQiMult(loadGarden());
        const pot = tree.modifiers.gardenElixirMagnitudeMult ?? 1;
        cultivation.gardenBuffQiMultRef.current = m > 1 ? 1 + (m - 1) * pot : 1;
      }
    };
    apply();
    const id = setInterval(apply, 1000);
    return () => clearInterval(id);
  }, [cultivation.gardenBuffQiMultRef, tree.modifiers.gardenElixirMagnitudeMult]);

  // Mirror Qi Sparks multipliers + flags into cultivation refs each render.
  // Cheap; runs only when activeSparks identity changes (the hook returns
  // the same array reference when no expiry happened).
  useEffect(() => {
    if (cultivation.sparkQiMultRef) {
      cultivation.sparkQiMultRef.current = qiSparks.qiMultRef.current;
    }
    if (cultivation.sparkFocusMultBonusRef) {
      cultivation.sparkFocusMultBonusRef.current = qiSparks.focusMultBonusRef.current;
    }
    if (cultivation.sparkQiFlatRef) {
      cultivation.sparkQiFlatRef.current = qiSparks.qiFlatRef.current;
    }
    if (cultivation.sparkGateReductionRef) {
      cultivation.sparkGateReductionRef.current = qiSparks.gateReductionRef.current;
    }
    if (cultivation.sparkPainlessRef) {
      cultivation.sparkPainlessRef.current = qiSparks.painlessActiveRef.current;
    }
    if (cultivation.sparkLingeringActiveRef) {
      cultivation.sparkLingeringActiveRef.current = qiSparks.lingeringActiveRef.current;
    }
    if (cultivation.sparkLingeringResidualMsRef) {
      cultivation.sparkLingeringResidualMsRef.current = qiSparks.lingeringResidualMsRef.current;
    }
    if (cultivation.sparkLingeringResidualMultRef) {
      cultivation.sparkLingeringResidualMultRef.current = qiSparks.lingeringResidualMultRef.current;
    }
    if (cultivation.sparkConsecutiveLadderRef) {
      cultivation.sparkConsecutiveLadderRef.current = qiSparks.consecutiveFocusLadderRef.current;
    }
    if (cultivation.sparkConsecutiveDeepRef) {
      cultivation.sparkConsecutiveDeepRef.current = qiSparks.consecutiveFocusDeepRef.current;
    }
    if (cultivation.sparkCrystalClickRateRef) {
      cultivation.sparkCrystalClickRateRef.current = qiSparks.crystalClickRateRef.current;
    }
    if (cultivation.sparkCrystalClickCapMinRef) {
      cultivation.sparkCrystalClickCapMinRef.current = qiSparks.crystalClickCapMinRef.current;
    }
  }, [qiSparks.activeSparks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tier-A jade tutorial cards (2026-05-21) ─────────────────────────────
  // Five of the eight cards fire from App-level state (welcome, hold-to-
  // focus, first layer breakthrough, first spark offer, first Saint Realm).
  // The other three (Producers tab opened, first producer bought, first
  // major-realm gate appearing) live next to their trigger events in
  // CultivationScreen + HomeScreen so we read fresh state without
  // ferrying it back up through props. Each effect uses
  // `fireTutorialOnce` — idempotent, marks-then-enqueues, no-op if
  // already seen this account.

  // #1 Welcome — first ever app launch with no save state. Defer one
  // animation frame so Home renders the world before the modal slides in.
  useEffect(() => {
    const hasSave = !!localStorage.getItem('mai_save');
    if (hasSave) return undefined;
    const id = window.setTimeout(() => {
      fireTutorialOnce(TUTORIAL_IDS.WELCOME, enqueue);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [enqueue]);

  // #2 Hold to Focus — player has accumulated some idle qi but never held
  // Focus. We poll cultivation.qiRef and boostStartTimeRef every 2 seconds;
  // when qi ≥ 15 AND boost has never started AND we're still in realm 0,
  // fire the card. Interval clears itself once the card fires.
  useEffect(() => {
    if (cultivation.realmIndex > 0) return undefined;
    const tick = () => {
      const qi    = cultivation.qiRef?.current ?? 0;
      const ever  = (cultivation.boostStartTimeRef?.current ?? 0) > 0;
      if (qi >= 15 && !ever) {
        if (fireTutorialOnce(TUTORIAL_IDS.HOLD_TO_FOCUS, enqueue)) {
          window.clearInterval(intervalId);
        }
      }
    };
    const intervalId = window.setInterval(tick, 2000);
    return () => window.clearInterval(intervalId);
  }, [enqueue, cultivation.realmIndex, cultivation.qiRef, cultivation.boostStartTimeRef]);

  // #3b PRODUCERS_HINT — proactive nudge toward the Cultivation tab. Polls
  // every 2s for the first moment the player ever holds focus, then waits
  // 90s and fires the lore-toned hint if they still haven't visited the
  // Cultivation tab. Mutually exclusive with PRODUCERS_TAB — voluntary
  // visit marks both seen (see CultivationScreen), so a player who
  // explores on their own NEVER sees this card.
  const producersHintStartedRef = useRef(false);
  useEffect(() => {
    if (hasSeenTutorial(TUTORIAL_IDS.PRODUCERS_TAB) || hasSeenTutorial(TUTORIAL_IDS.PRODUCERS_HINT)) {
      return undefined;
    }
    let timeoutId = null;
    const intervalId = window.setInterval(() => {
      if (hasSeenTutorial(TUTORIAL_IDS.PRODUCERS_TAB) || hasSeenTutorial(TUTORIAL_IDS.PRODUCERS_HINT)) {
        window.clearInterval(intervalId);
        if (timeoutId) window.clearTimeout(timeoutId);
        return;
      }
      if (producersHintStartedRef.current) return;
      const boostNow = (cultivation.boostStartTimeRef?.current ?? 0) > 0;
      if (boostNow) {
        producersHintStartedRef.current = true;
        timeoutId = window.setTimeout(() => {
          if (hasSeenTutorial(TUTORIAL_IDS.PRODUCERS_TAB) || hasSeenTutorial(TUTORIAL_IDS.PRODUCERS_HINT)) return;
          if (fireTutorialOnce(TUTORIAL_IDS.PRODUCERS_HINT, enqueue)) {
            markTutorialSeen(TUTORIAL_IDS.PRODUCERS_TAB);
          }
        }, 90 * 1000);
        window.clearInterval(intervalId);
      }
    }, 2000);
    return () => {
      window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enqueue, cultivation.boostStartTimeRef]);

  // #5 First layer breakthrough — track previous realmIndex; on first
  // increment, fire once. Skip if the player loaded a save mid-progression
  // (they've already broken through; no point teaching the basics).
  const prevRealmForTutorialRef = useRef(cultivation.realmIndex);
  useEffect(() => {
    const prev = prevRealmForTutorialRef.current;
    const curr = cultivation.realmIndex;
    prevRealmForTutorialRef.current = curr;
    if (curr > prev && prev === 0) {
      // Only fire from realm 0 → 1 transition so a returning player past
      // that point doesn't get the "first breakthrough" copy.
      fireTutorialOnce(TUTORIAL_IDS.FIRST_LAYER_BT, enqueue);
    }
  }, [cultivation.realmIndex, enqueue]);

  // #7 First spark offer — fires the first time pendingOffer becomes
  // non-null after launch. Uses `_currentlyShowing` so a stale offer
  // restored from a previous session also counts (the player still needs
  // the explanation if it's their first time seeing one).
  useEffect(() => {
    if (qiSparks.pendingOffer) {
      fireTutorialOnce(TUTORIAL_IDS.FIRST_SPARK_OFFER, enqueue);
    }
  }, [qiSparks.pendingOffer, enqueue]);

  // #8 First Saint Realm — reincarnation gate. realmIndex 24 is the Saint
  // entry per the game data; fire the card the moment the player crosses
  // it for the first time. Guard with > 0 prev so a save-load straight
  // into Saint doesn't fire on every render.
  useEffect(() => {
    if (cultivation.realmIndex >= 26) {
      fireTutorialOnce(TUTORIAL_IDS.FIRST_SAINT, enqueue);
    }
  }, [cultivation.realmIndex, enqueue]);

  // Consecutive Focus rung escalation — toggle body classes that CSS keys
  // off to drive per-rung aura/glow/tint + a brief upward "pop" burst.
  // Cultivation tick only dispatches on edges, so this listener is cheap.
  useEffect(() => {
    const RUNG_CLASSES = ['cf-rung-1', 'cf-rung-2', 'cf-rung-3', 'cf-rung-4', 'cf-rung-5'];
    let popTimer = 0;

    // Focus-cultivation audio escalates in "levels". Level 1 is the plain hold
    // (fired on press); each Consecutive Focus rung climbed bumps the level by
    // one (rung N → level N+1, see onRung), capped at the 6 uploaded samples.
    // Level 6 is the distinct max-tier loop: the top rung (T5) used to clamp
    // to level 5 and reuse rung 4's sound; now it earns its own pinnacle loop.
    // Entering a NEW level plays an instant focus_tick AND (re)starts the
    // focus_cultivate loop, both at that level's variant. `focusLoopVariant` is
    // the level currently playing (0 = none) so a no-op event (same level,
    // e.g. a rung edge that maps to the level already playing) never re-fires.
    const FOCUS_LEVELS = 6;
    const FOCUS_XFADE_MS = 350;        // crossfade between focus loop levels
    const FOCUS_RELEASE_FADE_MS = 220; // gentle fade when focus is released
    let focusLoopVariant = 0;
    const startOrSwapFocusLoop = (level) => {
      const v = Math.min(FOCUS_LEVELS, Math.max(1, level || 1));
      if (v === focusLoopVariant) return;
      try { AudioManager.playSfx('focus_tick', { variant: v }); } catch {}
      // Crossfade the underlying loop to the new level so the change glides
      // instead of hard-cutting. The tick above still punctuates the moment.
      try { AudioManager.crossfadeSfxLoop('focus_cultivate', { variant: v, duration: FOCUS_XFADE_MS }); } catch {}
      focusLoopVariant = v;
    };
    const stopFocusLoop = () => {
      if (!focusLoopVariant) return;
      // Short fade on release so the loop tails off instead of clicking.
      try { AudioManager.stopSfx('focus_cultivate', { fade: FOCUS_RELEASE_FADE_MS }); } catch {}
      focusLoopVariant = 0;
    };

    // Focus pressed → start the loop at variant 1; released → stop it. This
    // fires for a plain hold too, so focus has sound before Consecutive Focus
    // even unlocks.
    const onBoost = (e) => {
      if (e.detail?.active) startOrSwapFocusLoop(1);
      else stopFocusLoop();
    };

    const onRung = (e) => {
      const { rung, deep, upward } = e.detail ?? {};
      const body = document.body;
      body.classList.remove(...RUNG_CLASSES);
      if (rung > 0) body.classList.add(`cf-rung-${rung}`);
      body.classList.toggle('deep-meditation', !!deep);

      // Climbing rung N escalates focus audio to level N+1 (level 1 is the
      // plain hold), and restarts the pop animation.
      if (upward) {
        startOrSwapFocusLoop(rung + 1);
        body.classList.remove('cf-rung-pop');
        // Force reflow so the animation can replay back-to-back rung-ups.
        // eslint-disable-next-line no-unused-expressions
        body.offsetWidth;
        body.style.setProperty('--cf-pop-rung', String(rung));
        body.classList.add('cf-rung-pop');
        clearTimeout(popTimer);
        popTimer = setTimeout(() => body.classList.remove('cf-rung-pop'), 800);
      }
    };

    window.addEventListener('mai:focus-boost', onBoost);
    window.addEventListener('mai:cf-rung', onRung);
    return () => {
      window.removeEventListener('mai:focus-boost', onBoost);
      window.removeEventListener('mai:cf-rung', onRung);
      stopFocusLoop();
      clearTimeout(popTimer);
      const body = document.body;
      body.classList.remove(...RUNG_CLASSES, 'cf-rung-pop', 'deep-meditation');
    };
  }, []);


  // ── Centralised stat getter (stripped) ──────────────────────────────────
  // The pre-pivot getFullStats blended modifiers from artefacts, pills, law
  // uniques, set bonuses, and the cb_*/al_* tree nodes. Combat, gear, pills,
  // laws, and autoFarm shipped behind feature flags for v1, so the only
  // consumer that still calls in is the focus-mult mirror below. That
  // consumer just needs the raw focus modifier from the reincarnation tree.
  const getFullStats = useCallback(() => {
    // Focus mult — the only field still read downstream. The v1 cultivation
    // baseline is 1; the reincarnation tree's focus-mult node contributes via
    // `tree.modifiers.focusMult` (read inside the mirror effect below).
    return { focusMult: 1 };
  }, []);

  // Mirror focusMult into a ref the cultivation tick reads directly. Combat,
  // gear, pill, and law contributions are gone with the v1 pivot; the only
  // live channels are the Deeper-Breath upgrade adder and the tree node.
  useEffect(() => {
    if (!cultivation.focusMultRef) return;
    const id = setInterval(() => {
      // focusMultRef is a PERCENT — every consumer reads it as (value / 100).
      // Baseline 250 = x2.5, and it MUST match focusMultRef's useRef(250)
      // default in useCultivation, otherwise the badge/rate flashes x2.5 on
      // load and then jumps when this interval first fires. The cb480f5
      // cleanup set this to 1 by mistake (treating focus as a x1 multiplier),
      // so /100 produced x0.01. Tree focus node scales the base; Deeper-Breath
      // upgrades add flat percentage points (max stack 250 + 35+35+35+75 = 430
      // = x4.30).
      const base = 250;
      const upgradeAdd = cultivation.upgradeFocusMultAddRef?.current ?? 0;
      const treeMult   = tree?.modifiers?.focusMult ?? 1;
      cultivation.focusMultRef.current = base * treeMult + upgradeAdd;
    }, 1000);
    return () => clearInterval(id);
  }, [cultivation.focusMultRef, cultivation.upgradeFocusMultAddRef, tree?.modifiers?.focusMult]);

  const notifications = useNotifications({ cultivation });

  // Crystal Discovery. Subscribes to HomeScreen's tier-crossed window event
  // and grants any mechanic-tier T1 sparks attached to the crossed tiers
  // (see data/crystalMechanicGrants.js). These mechanics are deterministic
  // crystal-progression unlocks, NOT random spark offerings, so the cards
  // stay `retired: true` in qiSparks.js and are granted only from here.
  // `qiSparks.grant` is idempotent for mechanics so re-firing is safe; a
  // toast lands per successful grant so the player sees the unlock.
  useEffect(() => {
    const handler = (e) => {
      const { previousTier = 0, newTier = 0 } = e.detail ?? {};
      const ids = sparksToGrantOnEvolution(previousTier, newTier);
      for (const sparkId of ids) {
        const ok = qiSparks?.grant?.(sparkId);
        if (ok) {
          const card = QI_SPARK_BY_ID[sparkId];
          notifications.addToast({
            type: 'unlock',
            kicker: 'New Spark',
            glyph: '符', // talisman / mechanism spark
            message: card?.name ?? sparkId,
            duration: 6000,
          });
        }
      }
    };
    window.addEventListener('mai:crystal-tier-crossed', handler);
    return () => window.removeEventListener('mai:crystal-tier-crossed', handler);
  }, [qiSparks, notifications]);

  // 2026-05-21 bug-fix: surface a toast when the spark modal auto-picks the
  // leftmost card on inactivity timeout. Previously the modal would silently
  // vanish and the player wouldn't know which spark they got.
  useEffect(() => {
    const handler = (e) => {
      const { sparkId } = e.detail ?? {};
      const card = QI_SPARK_BY_ID[sparkId];
      notifications.addToast({
        type: 'info',
        kicker: 'Auto-Picked',
        glyph: '時', // time / timed out
        message: `${card?.name ?? 'Spark'} (modal timed out)`,
        duration: 7000,
      });
    };
    window.addEventListener('mai:spark-auto-picked', handler);
    return () => window.removeEventListener('mai:spark-auto-picked', handler);
  }, [notifications]);

  // Crystal Discovery one-shot backfill. A player whose crystal is already
  // past a grant threshold (e.g. leveled past L10 while the grant path was
  // severed) never saw a live tier-cross event, so walk 0 -> current tier
  // once and grant everything they should already own. `grant` is idempotent
  // so anything already active is skipped. getCrystalTier is the canonical
  // level->tier map (the deleted original hardcoded the stale pre-cap L1000
  // thresholds here). Gated by a localStorage flag so it runs once per device.
  const backfillRanRef = useRef(false);
  useEffect(() => {
    if (backfillRanRef.current) return;
    if (!qiSparks?.grant) return;
    let seen = null;
    try { seen = localStorage.getItem('mai_v1_3_mechanic_backfill_seen'); } catch {}
    if (seen) { backfillRanRef.current = true; return; }
    const level = crystal?.level ?? 0;
    if (level > 0) {
      const ids = sparksToGrantOnEvolution(0, getCrystalTier(level));
      for (const sparkId of ids) qiSparks.grant(sparkId);
    }
    try { localStorage.setItem('mai_v1_3_mechanic_backfill_seen', '1'); } catch {}
    backfillRanRef.current = true;
  }, [qiSparks, crystal?.level]);

  // (Removed) "Combat returns later" one-time toast. Combat may or may
  // not return; we're not committing to it in copy. If we later ship a
  // re-introduction, re-add the toast then with concrete language about
  // what actually changed. The mai_v1_combat_hidden_seen localStorage
  // key is left untouched so existing players who already saw the toast
  // don't have it resurface if we re-add it later.

  const achievements = useAchievements({
    onUnlock: (a) => {
      notifications.addToast({
        type: 'achievement',
        kicker: 'Achievement',
        glyph: '賞', // reward / commendation
        message: a.title,
      });
      try { trackAchievementUnlocked(a.id); } catch {}
    },
  });

  const prevAchCountRef = useRef(achievements.unlockedCount);
  useEffect(() => {
    const count = achievements?.unlockedCount ?? 0;
    if (count > prevAchCountRef.current) setHasNewAch(true);
    prevAchCountRef.current = count;
  }, [achievements?.unlockedCount]);

  // ── Furnace cook-complete SFX ───────────────────────────────────────────
  // Diff cauldron states to detect cooking → idle transitions. Plays the
  // producer_tier_up SFX (same as a tier crossing) so cooks have an
  // audible 'done' cue without inventing a new asset.
  const prevCauldronsRef = useRef(furnace.furnace.cauldrons);
  useEffect(() => {
    const prev = prevCauldronsRef.current || [];
    const next = furnace.furnace.cauldrons   || [];
    for (let i = 0; i < next.length; i++) {
      if (prev[i]?.state === 'cooking' && next[i]?.state !== 'cooking') {
        try { AudioManager.playSfx?.('producer_tier_up'); } catch {}
        break; // one cue per render even if multiple finish together
      }
    }
    prevCauldronsRef.current = next;
  }, [furnace.furnace.cauldrons]);

  // ── Furnace codex discovery toasts ──────────────────────────────────────
  // Diff the codex state and fire a toast on each new entry. addToast already
  // plays the ui_notify chime, so the discovery moment is cued like every
  // other notification — no separate sound needed.
  const prevFurnaceCodexRef = useRef(furnace.furnace.codex);
  useEffect(() => {
    const prev = prevFurnaceCodexRef.current || { materials: {}, pills: {}, foundations: {} };
    const next = furnace.furnace.codex || { materials: {}, pills: {}, foundations: {} };
    const fire = (kicker, glyph, label) => {
      notifications.addToast({ type: 'achievement', kicker, glyph, message: label });
    };
    for (const id of Object.keys(next.materials || {})) {
      if (!prev.materials?.[id]) {
        const mat = (FURNACE_MATERIALS_REF[id] || {}).name || id;
        fire('Codex — Material', '丹', mat);
      }
    }
    for (const id of Object.keys(next.pills || {})) {
      if (!prev.pills?.[id]) {
        const p = (FURNACE_PILLS_REF[id] || {}).name || id;
        fire('Codex — Pill', '丹', p);
      }
    }
    for (const id of Object.keys(next.foundations || {})) {
      if (!prev.foundations?.[id]) {
        const f = (FURNACE_FOUNDATIONS_REF[id] || {}).name || id;
        fire('Codex — Foundation', '丹', f);
      }
    }
    prevFurnaceCodexRef.current = next;
  }, [furnace.furnace.codex, notifications]);

  // ── Achievement snapshot ────────────────────────────────────────────────
  // Pollers and event sources land in two paths:
  //   1. condition-based achievements check this snapshot, polled on
  //      a 2-second interval below. Cheap pass over the visible list.
  //   2. event-based achievements fire via achievementBus from the
  //      relevant subsystem (hold timer, calendar tick, etc.). Those
  //      do not pass through this snapshot at all.
  //
  // Building the snapshot reads from stats.lifetime / stats.run, the
  // karma + tree hooks, daily bonus, and a few computed fields
  // (producer count parity, etc). Bound to a ref so the interval can
  // always see the freshest values without re-subscribing.
  const buildAchSnapshot = useCallback(() => {
    const lifetime = stats.lifetime ?? {};
    const run      = stats.run      ?? {};
    const ownedVals = Object.values(producers?.owned ?? {});
    const maxOwned  = ownedVals.length > 0 ? Math.max(...ownedVals) : 0;
    const exact42   = ownedVals.includes(42);
    return {
      // ── Progression ──────────────────────────────────────────────────────
      realmIndex:             cultivation.realmIndex,
      // ── Crystal / tap ────────────────────────────────────────────────────
      // totalCrystalTaps drives the "Featherlight / Hand of God / Stone
      // Hammer / Mountain Crusher" ladder which is QI-CRYSTAL taps only,
      // NOT cultivator-sprite taps. useCultivation.js increments
      // crystalTaps on crystal taps and cultivatorTaps on sprite taps
      // separately. This line used to read .cultivatorTaps, which made
      // tapping the cultivator unlock the crystal-tap achievements.
      totalCrystalTaps:       lifetime.crystalTaps         ?? 0,
      peakTapsPerSec:         lifetime.peakTapsPerSec      ?? 0,
      longestHoldSec:         lifetime.longestHoldSec      ?? 0,
      // cultivatorSpriteTaps drives ONLY "Tickle the Master" and is
      // intentionally the cultivator counter, not the crystal one.
      cultivatorSpriteTaps:   lifetime.cultivatorTaps      ?? 0,
      // ── Sparks ───────────────────────────────────────────────────────────
      qiSparksCaught:         lifetime.qiSparksCaught      ?? 0,
      // ── Idle / offline ───────────────────────────────────────────────────
      lastSessionGapSec:      lifetime.lastOfflineGapSec   ?? 0,
      offlineQiEarned:        lifetime.offlineQiEarned     ?? 0,
      // ── Time ─────────────────────────────────────────────────────────────
      totalPlayTimeSec:       lifetime.timePlayed          ?? 0,
      // ── Qi ───────────────────────────────────────────────────────────────
      lifetimeQiEarned:       lifetime.qiEarned            ?? 0,
      peakQiPerSec:           lifetime.qiPerSecPeak        ?? 0,
      // ── Reincarnation / tree ─────────────────────────────────────────────
      reincarnations:         karma.lives                  ?? 0,
      karmaNodesUnlocked:     tree.purchased?.size         ?? 0,
      karmaNodesTotal:        tree.nodes?.length           ?? 0,
      // ── Shop ─────────────────────────────────────────────────────────────
      shopVisits:             lifetime.shopVisits          ?? 0,
      cosmeticPurchases:      lifetime.cosmeticPurchases   ?? 0,
      shopPurchasesRun:       run.shopPurchases            ?? 0,
      // ── Daily ────────────────────────────────────────────────────────────
      consecutiveDays:        lifetime.consecutiveDays     ?? 0,
      // ── Settings / discovery ─────────────────────────────────────────────
      audioToggles:           lifetime.audioToggles        ?? 0,
      tutorialsRead:          lifetime.tutorialsRead       ?? 0,
      achievementsPanelOpens: lifetime.achievementsPanelOpens ?? 0,
      // ── Speed gates / All In ─────────────────────────────────────────────
      speedGatesCleared:      lifetime.speedGatesCleared   ?? 0,
      allInPurchases:         lifetime.allInPurchases      ?? 0,
      // ── Producer parity ──────────────────────────────────────────────────
      maxProducerCount:       maxOwned,
      exact42Producer:        exact42,
      // ── Engine virtual fields (filled in by useAchievements.check) ──────
      // unlockedCountExcludingThis is computed per-entry.
      totalAchievementsCount: achievements.totalCount,
      // Legacy v1 snapshot fields kept so any old condition referencing
      // them still resolves to 0 without throwing. The arrays / sets these
      // used to read from are gone with the dead-system cleanup; surface
      // zero so the achievement engine sees a stable shape.
      ownedLawsCount:         0,
      ownedTechniquesCount:   0,
      clearedRegionsCount:    0,
      ownedArtefactsCount:    0,
      discoveredPillsCount:   0,
    };
  }, [
    stats.lifetime, stats.run,
    cultivation.realmIndex,
    karma.lives,
    tree.purchased, tree.nodes,
    producers?.owned,
    achievements.totalCount,
  ]);

  // Run the snapshot check on every relevant state change (cheap pass)
  // plus a 2-second interval so slow-moving stats (timePlayed,
  // longestHoldSec) trigger their thresholds without waiting for
  // another React render.
  useEffect(() => {
    achievements.check(buildAchSnapshot());
  }, [achievements, buildAchSnapshot]);

  useEffect(() => {
    const id = setInterval(() => achievements.check(buildAchSnapshot()), 2000);
    return () => clearInterval(id);
  }, [achievements, buildAchSnapshot]);

  // ── Achievement supporting trackers ─────────────────────────────────────
  // These wire bus.fire(...) and recordStat(...) for the achievements
  // that don't fit cleanly into existing per-system hooks.

  // Session gap on mount. Reads the saved lastSeen timestamp directly
  // from localStorage so it captures the gap whether or not the
  // offline-earnings modal fires (a player can return after a long
  // gap without crossing the qi-cap line). Stamped into the lifetime
  // stat (peakStat keeps the largest gap on record AND surfaces the
  // most recent via the same key).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mai_save');
      if (raw) {
        const data = JSON.parse(raw);
        const lastSeen = Number(data?.lastSeen) || 0;
        if (lastSeen > 0) {
          const gap = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));
          if (gap > 0) {
            recordStat('lastOfflineGapSec', gap);
            recordStat('maxOfflineGapSec',  gap);
          }
        }
      }
    } catch {}
  }, []);

  // Calendar events on mount. Fired once per page load if the local
  // date matches. The bus listener in useAchievements unlocks the
  // matching entry the first time the event arrives.
  useEffect(() => {
    const now = new Date();
    if (isLunarNewYear(now)) achBus.fire('cal_lunar_new_year');
    if (isDoubleNinth(now))  achBus.fire('cal_double_ninth');
  }, []);

  // Shop visit counter. We track the Spirit Bazaar (post nav-audit: now a
  // screen, was the 'lotus-shop' modal). The buy-currency modal (`shop`)
  // is a different surface and is not counted here. Increments once per
  // navigation TO the bazaar — re-entering after leaving counts again.
  useEffect(() => {
    if (currentScreen === 'spirit-bazaar') {
      try { recordStat('shopVisits', 1); } catch {}
    }
  }, [currentScreen]);

  // Screen switches in a rolling 5-minute window for the Restless
  // achievement. Keeps the last 100 switch timestamps; when 100 fit
  // inside the 5-minute window the achievement fires.
  const screenSwitchesRef = useRef([]);
  useEffect(() => {
    const buf = screenSwitchesRef.current;
    const now = Date.now();
    buf.push(now);
    const cutoff = now - 5 * 60 * 1000;
    while (buf.length > 0 && buf[0] < cutoff) buf.shift();
    if (buf.length >= 100) {
      try { achBus.fire('restless_100_5m'); } catch {}
      // Trim back so a streak of 200 switches doesn't refire 100 times.
      screenSwitchesRef.current = [];
    }
  }, [currentScreen]);

  // Time-of-day on realm crossings. The bus consumes the event and
  // unlocks the matching Night Owl / Early Bird entry.
  const prevRealmForTimeRef = useRef(cultivation.realmIndex);
  useEffect(() => {
    const prev = prevRealmForTimeRef.current;
    const curr = cultivation.realmIndex;
    if (curr === prev) return;
    prevRealmForTimeRef.current = curr;
    const h = new Date().getHours();
    if (h >= 1 && h <= 4)  achBus.fire('realm_cross_night');
    if (h >= 5 && h <= 7)  achBus.fire('realm_cross_dawn');
  }, [cultivation.realmIndex]);

  // Sky Watcher: play during all four time brackets within 24h.
  // We keep a Set of brackets seen, anchored to a sliding 24-hour
  // window. Each tick advances the bracket pointer; whenever the
  // set covers all four, fire and reset.
  const skyWatcherRef = useRef({ seen: new Set(), windowStart: Date.now() });
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const state = skyWatcherRef.current;
      if (now - state.windowStart > 24 * 60 * 60 * 1000) {
        state.seen = new Set();
        state.windowStart = now;
      }
      const h = new Date().getHours();
      const bracket = h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
      state.seen.add(bracket);
      if (state.seen.size >= 4) {
        try { achBus.fire('time_all_brackets'); } catch {}
        state.seen = new Set();
        state.windowStart = now;
      }
    };
    tick();
    const id = setInterval(tick, 5 * 60 * 1000); // every 5 min is plenty
    return () => clearInterval(id);
  }, []);

  // Lunch break detector: 10 cumulative minutes between 12:00 and
  // 13:00 local time on a weekday (Mon-Fri). Counted in 60-second
  // ticks across the noon hour, persisted to localStorage so a
  // refresh mid-lunch does not reset progress.
  useEffect(() => {
    const KEY = 'mai_lunch_break_progress';
    const tick = () => {
      const now = new Date();
      const dow = now.getDay();
      const h   = now.getHours();
      const isWeekday  = dow >= 1 && dow <= 5;
      const isLunchHr  = h === 12;
      if (!isWeekday || !isLunchHr) return;
      let acc = 0;
      try { acc = Number(localStorage.getItem(KEY)) || 0; } catch {}
      acc += 1;
      try { localStorage.setItem(KEY, String(acc)); } catch {}
      if (acc >= 10) {
        try { achBus.fire('lunch_break_10min'); } catch {}
      }
    };
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Bonk: consecutive taps on a `[data-bonk]` element that is not a
  // real interactive control. Counter resets on a 2-second silence or
  // on a tap that lands outside any data-bonk subtree. Fires at 20.
  useEffect(() => {
    let streak = 0;
    let lastBonkAt = 0;
    const onTap = (e) => {
      const target = e.target?.closest?.('[data-bonk]');
      const now = Date.now();
      if (!target) {
        // Reset only on taps that hit an obviously interactive surface.
        // Plain background clicks should not punish the streak.
        const interactive = e.target?.closest?.('button, a, input, [role="button"]');
        if (interactive) streak = 0;
        return;
      }
      // Reset if more than 2 seconds passed since the last bonk.
      if (now - lastBonkAt > 2000) streak = 0;
      streak += 1;
      lastBonkAt = now;
      if (streak >= 20) {
        try { achBus.fire('bonk_20'); } catch {}
        streak = 0;
      }
    };
    document.addEventListener('pointerdown', onTap);
    return () => document.removeEventListener('pointerdown', onTap);
  }, []);

  // Drought: 1 hour of play time with no spark caught. Polls the
  // lifetime spark counter and resets the clock whenever it advances.
  const droughtRef = useRef({ lastSparks: -1, anchor: Date.now() });
  useEffect(() => {
    const id = setInterval(() => {
      const sparksNow = (stats.lifetime?.qiSparksCaught) ?? 0;
      const state = droughtRef.current;
      // First poll: just record the baseline.
      if (state.lastSparks < 0) { state.lastSparks = sparksNow; state.anchor = Date.now(); return; }
      if (sparksNow !== state.lastSparks) {
        state.lastSparks = sparksNow;
        state.anchor = Date.now();
        return;
      }
      if (Date.now() - state.anchor >= 60 * 60 * 1000) {
        try { achBus.fire('spark_drought_1h'); } catch {}
        // Reset so it does not refire every second past the threshold.
        state.anchor = Date.now();
      }
    }, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Number of the Beast: hold exactly 666 qi/s for one full second.
  // Polls the rate ref every 250ms; counts consecutive samples in the
  // 660-672 inclusive band (1.8% tolerance so the achievement is
  // achievable by a player tuning producers but does not require an
  // implausible exact match).
  useEffect(() => {
    let onBeat = 0;
    const id = setInterval(() => {
      const rate = cultivation.rateRef?.current ?? 0;
      const inBand = rate >= 660 && rate <= 672;
      onBeat = inBand ? onBeat + 1 : 0;
      if (onBeat >= 4) { // 4 × 250ms = 1 sec sustained
        try { achBus.fire('qis_666_held'); } catch {}
        onBeat = 0;
      }
    }, 250);
    return () => clearInterval(id);
  }, [cultivation]);

  // 30-minute fully-muted detector. Increments a counter while every
  // audio channel is muted and zeros it whenever any is unmuted.
  // Persists to localStorage so a reload mid-muted carries progress.
  useEffect(() => {
    const KEY = 'mai_audio_muted_progress';
    const tick = () => {
      try {
        const settings = JSON.parse(localStorage.getItem('mai_audio_settings') || '{}');
        const allMuted = !!(settings.masterMuted || (settings.bgmMuted && settings.sfxMuted));
        let acc = Number(localStorage.getItem(KEY)) || 0;
        if (allMuted) {
          acc += 1;
          if (acc >= 30 * 60) {
            achBus.fire('audio_muted_30m');
          }
        } else {
          acc = 0;
        }
        localStorage.setItem(KEY, String(acc));
      } catch {}
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Wired into useQiSparks above via featureFlagsRef so its mechanic-card
  // pool gating (Crystal Click T1 etc.) can query feature unlocks.
  const featureFlags = useFeatureFlags({
    cultivation,
    // clearedRegions + inventory used to feed the combat/gathering gates;
    // both surfaces are gone with the v1 pivot. Pass an empty set + a stub
    // getQuantity so the remaining always/realm gates still resolve cleanly.
    clearedRegions: new Set(),
    inventory: { getQuantity: () => 0 },
    onUnlock: (featureId, msg) => {
      // qi_crystal is the only feature unlock that still routes to a live
      // screen — everything else (worlds / production / character / collection)
      // pointed at screens that no longer exist in the v1 build, so they fall
      // back to home via the navigate() guard.
      const targetScreen = featureId === 'qi_crystal' ? 'home' : null;
      const targetParam  = featureId === 'qi_crystal' ? { openCrystal: true } : null;
      notifications.addToast({
        type: 'unlock',
        kicker: 'New Feature',
        glyph: '解', // unlock / open
        message: msg,
        targetScreen,
        targetParam,
      });
    },
  });
  featureFlagsRef.current = featureFlags;

  // Keep a live ref to the hooks debug commands need. Combat / gear / pill
  // / autoFarm hooks were retired with the v1 pivot — only the live ones
  // are surfaced here.
  const hooksRef = useRef({});
  hooksRef.current = { cultivation, crystal, qiSparks, producers, upgrades };
  useEffect(() => { initDebug(hooksRef); }, []);

  // Audio start-up. BGM is requested immediately; how it actually starts depends
  // on the platform. Native app (Capacitor) and desktop (Electron/Steam) allow
  // autoplay, so we unlock right now and music plays on launch like a native
  // game. Browser / PWA hard-blocks autoplay, so we arm a first-gesture unlock;
  // unlock() is re-entrant, so even on a shell that refused autoplay the first
  // tap still kicks the music in.
  useEffect(() => {
    // One global click→ui_click handler for every <button> in the app.
    // Idempotent; safe to call before unlock (playSfx no-ops until unlocked).
    installGlobalClickSfx();

    // Request the initial track now; playBgm buffers it until unlock fires.
    AudioManager.playBgm('cultivation');

    // Autoplay-capable shells: start immediately, no gesture needed.
    if (Platform.isNative || Platform.isSteam) {
      AudioManager.unlock();
    }

    // Browser fallback (and recovery net for a shell that blocked autoplay).
    const onFirstGesture = () => {
      AudioManager.unlock();
      document.removeEventListener('pointerdown', onFirstGesture);
      document.removeEventListener('keydown',     onFirstGesture);
    };
    document.addEventListener('pointerdown', onFirstGesture);
    document.addEventListener('keydown',     onFirstGesture);

    return () => {
      document.removeEventListener('pointerdown', onFirstGesture);
      document.removeEventListener('keydown',     onFirstGesture);
    };
  }, []);

  // BGM: one continuous main track plays across the whole game. playBgm()
  // early-returns when the track is already playing, so navigation leaves the
  // music untouched; this just re-asserts it (a recovery net if it was stopped).
  useEffect(() => {
    AudioManager.playBgm('cultivation');
  }, [currentScreen]);

  // Navigate to a screen, optionally carrying a parameter (e.g. region data).
  // Routes targeting flag-blocked screens silently fall back to home so a
  // stale notification or external nav call can't strand the player on a
  // hidden surface.
  const navigate = (screen, param = null) => {
    // Hard lock: while offline earnings are showing, that event is the pinned
    // head of the queue and the player MUST collect (or watch x2) first. Refuse
    // ALL navigation so no nav tab, top-bar action, deep link, or notification
    // can strand them past the modal. Cleared the instant they collect.
    if (currentEvent?.kind === 'offline-earnings') return;
    const target = isScreenAllowed(screen) ? screen : 'home';
    setCurrentScreen(target);
    setScreenParam(param);
    notifications.clearBadge(target);
    try { trackScreenView(target); } catch {}
  };

  // The `mai:nav-sparks` deep-link listener was removed 2026-05-25.
  // It used to route the old ActiveSparksBar popover's "View all
  // sparks" footer to Cultivation > Sparks; that footer is gone now
  // (the chip + popover IS the canonical surface for temporary
  // buffs, and the Sparks tab is reachable through normal navigation).


  const handleReincarnate = useCallback(() => {
    // Safety net — the button is already disabled below Saint, but we
    // refuse here too so any future callsite can't bypass the gate.
    if (cultivation.realmIndex < 24) return;
    // Commit the Eternal Tree session NOW — this is the confirmed
    // reincarnation. Pays the staged karma and folds the provisional anchors
    // into the persisted set. Until this point anchoring is in-memory only, so
    // a page refresh without reincarnating resets the anchors and karma spent.
    tree.commit();
    try {
      trackReincarnation(cultivation.realmIndex, (karma.lives ?? 0) + 1);
      trackFirstTime('Reincarnation', cultivation.realmIndex);
    } catch {}
    // Sync-persist karma with karmaEarnedThisLife reset before the wipe.
    // ── Achievement: Lin Family Trash ──
    // Reincarnating at the exact minimum threshold (Saint Early, the
    // first realm where reincarnation is even allowed). Fires the bus
    // event before karma.reincarnate() so the listener still sees the
    // pre-wipe realm context for any future payload needs.
    if (cultivation.realmIndex === 24) {
      try { achBus.fire('reincarnate_at_lowest', { realmIndex: 24 }); } catch {}
    }
    karma.reincarnate();

    // Snapshot producer counts + crystal level BEFORE the wipe so the Eternal
    // Tree rebirth-carry nodes can restore a fraction into the new life.
    let prodSnapshot = null, crystalSnapshot = null;
    try { prodSnapshot = JSON.parse(localStorage.getItem('mai_producers') || 'null'); } catch {}
    try { crystalSnapshot = JSON.parse(localStorage.getItem('mai_qi_crystal') || 'null'); } catch {}

    // Give React a tick to flush the karma state to localStorage before we
    // wipe the rest of the save + remount the tree.
    setTimeout(() => {
      // Stats — wipe the in-memory run bucket BEFORE wipeReincarnation
      // so the next-mount lifetime read sees the correct values
      // (including the +1 livesLived just fired by karma.reincarnate()).
      try { stats.resetRun(); } catch {}
      wipeReincarnation();
      // ── Eternal Tree rebirth carries ──────────────────────────────────────
      // tree.commit() above persisted the owned set; re-seed the just-wiped
      // keys before the remount re-reads them.
      try {
        const ownedTree = new Set(JSON.parse(localStorage.getItem('mai_reincarnation_tree') || '[]'));
        // foundation Eternal Foundation — keep 20% of each producer's count.
        if (ownedTree.has('foundation') && prodSnapshot && typeof prodSnapshot === 'object') {
          const kept = {};
          for (const [pid, n] of Object.entries(prodSnapshot)) {
            const c = Math.floor((Number(n) || 0) * 0.20);
            if (c > 0) kept[pid] = c;
          }
          if (Object.keys(kept).length) localStorage.setItem('mai_producers', JSON.stringify(kept));
        }
        // core Unbroken Core — keep 25% of crystal level.
        if (ownedTree.has('core') && crystalSnapshot && (crystalSnapshot.level ?? 0) > 0) {
          const lvl = Math.floor(crystalSnapshot.level * 0.25);
          if (lvl > 0) localStorage.setItem('mai_qi_crystal', JSON.stringify({ level: lvl, refinedQi: 0 }));
        }
        // bloom Spirit Bloom — begin each life with +50 Spirit Dew.
        if (ownedTree.has('bloom')) {
          const g = loadGarden();
          g.dew = (Number(g.dew) || 0) + 50;
          saveGarden(g);
        }
      } catch {}
      // Continuous-experience reincarnation: dispatch a reset event
      // instead of window.location.reload(). The outer App wrapper
      // catches this, mounts a cream-wash overlay, bumps the key on
      // AppInner so every hook unmounts + remounts (re-reading the
      // now-correctly-pruned localStorage), then fades the wash out.
      // No browser reload, no full document fetch, no re-fire of
      // already-earned achievements or already-seen tutorial cards
      // (those are preserved across reincarnation by wipeReincarnation
      // since reincarnation is a NEW life, not a NEW player).
      window.dispatchEvent(new CustomEvent('mai:full-reset'));
    }, 50);
  }, [karma, cultivation.realmIndex, stats, tree.commit]);

  // goBack used to route Combat Arena back to its parent Worlds hub. Both
  // screens are gone with the v1 pivot; the back-to-Worlds helper goes
  // with them.

  // Tree screen: accessible once the player reaches Saint realm (so they can
  // spend karma before reincarnating) OR in any subsequent life (lives ≥ 1).
  const reincarnationUnlocked = cultivation.realmIndex >= 26 || (karma.lives ?? 0) >= 1;

  const screens = {
    // Inventory / pills / law-selection / idle-assignment props are gone with
    // the v1 Cookie-Clicker pivot. The Rewards chip + idle assignment chip
    // are already null-guarded inside HomeScreen, so omitting the props lets
    // those branches fall through to render nothing.
    home:   <HomeScreen cultivation={cultivation} selections={null} onNavigate={navigate} crystal={crystal} isCrystalUnlocked={featureFlags.isUnlocked('qi_crystal')} openCrystal={screenParam?.openCrystal ?? false} activeSparks={qiSparks.activeSparks} activeBuffs={shopInventory.activeBuffs} furnaceBuffs={furnace.activePillBuffs} crystalReservoirRef={cultivation.crystalReservoirRef} crystalClickCapMinRef={cultivation.sparkCrystalClickCapMinRef} collectCrystalReservoir={cultivation.collectCrystalReservoir} bypassTokenCount={shopInventory.getConsumable('consumable_major_bt_bypass')} onUseBypassToken={() => { if (shopInventory.useConsumable('consumable_major_bt_bypass')) cultivation.bypassGate?.(); }} pendingSparkOffers={qiSparks.pendingOffersCount} sparkModalOpen={qiSparks.isOfferModalOpen} onReviewSparkQueue={qiSparks.openOfferModal} equippedParticle={shopInventory.inv?.equipped?.['particles'] ?? null} equippedCharacter={shopInventory.inv?.equipped?.['character'] ?? null} equippedCrystal={shopInventory.inv?.equipped?.['crystal'] ?? null} resonanceActive={shopInventory.resonanceActive} getResonanceRemainingMs={shopInventory.getResonanceRemainingMs} />,
    // The qi-investment shop — main loop of v1, always visible.
    cultivation: <CultivationScreen cultivation={cultivation} producers={producers} upgrades={upgrades} crystal={crystal} qiSparks={qiSparks} unlockedHiddenArts={tree.modifiers.unlockedHiddenArts} initialTab={typeof screenParam === 'string' ? screenParam : null} legendaryPoolInfo={legendaryPoolInfo} autoBuyOwned={shopInventory.hasQol('qol_autobuy_cheapest')} autoBuyEnabled={autoBuyEnabled} onToggleAutoBuy={toggleAutoBuy} treeMods={tree.modifiers} />,
    journey:    <JourneyScreen cultivation={cultivation} />,
    'spirit-bazaar': <SpiritBazaarScreen
                       inventory={shopInventory}
                       balance={getBloodLotusBalance()}
                       onBack={() => navigate('home')}
                       onOpenTopUp={() => openModal('shop')}
                       onOpenCodex={() => openModal('codex')}
                     />,
    settings:   <SettingsScreen
                  onBack={() => navigate('home')}
                  onOpenAbout={() => navigate('about')}
                  onOpenBazaar={() => navigate('spirit-bazaar')}
                  realmName={cultivation.realmMajor}
                  realmStage={cultivation.realmStage}
                  realmIndex={cultivation.realmIndex}
                  totalRealms={cultivation.totalRealms}
                  lifeIndex={karma.lives}
                  timePlayedSec={stats.lifetime?.timePlayed ?? 0}
                  shopInventory={shopInventory}
                  autoBuyEnabled={autoBuyEnabled}
                />,
    about:      <AboutScreen onBack={() => navigate('settings')} />,
    // The Eternal Tree (reincarnation) is no longer a routed screen. It opens as
    // a root-level full-screen overlay behind a confirmation gate so it sits
    // above the nav and cannot be escaped once entered. See the overlay render
    // at the bottom of this component and reincarnationStage.
  };

  const BASE = import.meta.env.BASE_URL;

  return (
    <DiscipleMergeContext.Provider value={discipleMerge}>
    <div className="app" style={{ '--screen-bg-url': `url(${BASE}backgrounds/ui_screens.png)` }}>
      {/* Inline SVG filter — referenced by .pl-leader-silhouette (Cookie-
          Clicker producer-teaser). feColorMatrix crushes RGB to 0 (black);
          feComponentTransfer's discrete alpha table snaps every non-zero
          alpha to 1, killing the anti-aliased grey halo on the PNG edges
          so the silhouette comes out as a hard-edged true-black cutout. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="mai-silhouette" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
          />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 1 1 1 1 1 1 1 1 1 1" />
          </feComponentTransfer>
        </filter>
      </svg>
      {currentScreen !== 'home' && (
        <>
          <div
            className="app-bg"
            style={{ '--app-bg-url': `url(${BASE}backgrounds/default_bg.png)` }}
          />
          <div className="app-vignette" />
        </>
      )}
      <TopBar
        bloodLotusBalance={getBloodLotusBalance()}
        /* Top-left has TWO separate buttons now:
             onOpenShop      → IAP modal (Top Up — buy more Blood Lotus)
             onOpenLotusShop → spend shop (buffs / QoL / cosmetics)
           The lotus chip shows the player's balance and acts as the
           Top Up entry point; the shop button right next to it is the
           dedicated spend surface. */
        onOpenShop={() => openModal('shop')}
        onOpenLotusShop={() => navigate('spirit-bazaar')}
        onOpenProgress={() => openModal('codex', () => setHasNewAch(false))}
        onOpenSettings={() => navigate('settings')}
        hasNewAchievement={hasNewAch}
        activeModal={activeModal}
        currentScreen={currentScreen}
        onOpenReincarnation={() => setReincarnationStage('confirm')}
        reincarnationUnlocked={reincarnationUnlocked}
        qiRef={cultivation.qiRef}
        karma={karma.karma}
      />
      <NavBar
        currentScreen={currentScreen}
        onNavigate={(screen) => navigate(screen)}
        badges={notifications.badges}
        isUnlocked={featureFlags.isUnlocked}
        isHidden={featureFlags.isHidden}
        getHint={featureFlags.getHint}
        getDesc={featureFlags.getDesc}
      />
      <main className={`screen-container${currentScreen === 'home' ? ' sc-fullbleed' : ''}`}>
        {/* HomeScreen is ALWAYS mounted AND always laid out. Previously
            switched to display:none on tab change, which destroyed
            layout - qi-flow particle layer's clientWidth dropped to 0,
            spawners halted, every return-to-home felt like the scene
            had been "paused and rewound". To make Home feel like it's
            running continuously in the background:
            . Wrapper uses visibility:hidden + pointer-events:none
              instead of display:none. Layout is preserved, so the
              qi-flow + crystal-spark rAF loops keep spawning into a
              real-dimensions layer.
            . Particles + floaters animate invisibly while another
              screen overlays Home; when the player returns, in-flight
              items are already mid-animation at their true positions.
            . The non-home screen renders on top with an opaque
              background, so the invisible Home underneath isn't seen.
            Cost: ~5-6 DOM elements animating invisibly when off-tab.
            Negligible vs the perceptual win. */}
        <div
          className="home-host"
          style={{
            visibility:    currentScreen === 'home' ? 'visible' : 'hidden',
            pointerEvents: currentScreen === 'home' ? 'auto'    : 'none',
          }}
        >
          {screens.home}
        </div>
        {currentScreen !== 'home' && (screens[currentScreen] ?? null)}
      </main>
      <ToastStack
        toasts={notifications.toastQueue}
        onDismiss={notifications.dismissToast}
        onNavigate={navigate}
      />
      {/* SelectionModal (law-offer picker) removed with the v1 pivot.
          Laws / useLawOffers are gone; if they ship again, restore the modal
          render here behind the FEATURES.laws flag. */}
      {/* Qi Sparks pick-1-of-2 modal — fires on every layer breakthrough.
          Suppressed while higher-priority overlays are showing so it doesn't
          stack with breakthrough banners or law offers.

          ALSO suppressed while a tutorial card is showing. The FIRST_SPARK_
          OFFER tutorial enqueues at the SAME moment pendingOffer becomes
          truthy (via the useEffect at line ~757). Previously the tutorial
          was the one suppressed-by-spark-modal, which meant the "Choose
          wisely" explainer appeared AFTER the player had already chosen.
          Now the spark modal yields to the tutorial: explainer first,
          then the picker. Generalises to any future tutorial that wants
          to fire alongside a spark offer. */}
      {qiSparks.pendingOffer
        && qiSparks.isOfferModalOpen
        && !cultivation.majorBreakthrough
        && currentEvent?.kind !== 'breakthrough'
        && currentEvent?.kind !== 'crystal-evolution'
        && currentEvent?.kind !== 'offline-earnings'
        && currentEvent?.kind !== 'tutorial'
        && (
        <QiSparkChoiceModal
          offer={qiSparks.pendingOffer}
          queueCount={qiSparks.pendingOffersCount}
          bloodLotusBalance={qiSparks.bloodLotusBalance}
          nextRerollCostFor={qiSparks.nextRerollCost}
          onChoose={qiSparks.choose}
          onRerollOffer={qiSparks.rerollOffer}
          onDismiss={qiSparks.dismiss}
          onSkip={qiSparks.skip}
          pityCounter={qiSparks.pityCounter}
          pityThreshold={qiSparks.pityThreshold}
          legendaryChance={qiSparks.legendaryChance}
          legendaryPoolInfo={legendaryPoolInfo}
        />
      )}
      {/* Tutorial cards (Tier A onboarding + crystal-tier mechanic unlocks).
          Rendered at App.jsx level so they fire regardless of active screen
          — e.g. first_producer triggers while still on Cultivation, not
          after navigating Home. Suppressed only while a major-realm
          breakthrough cinematic is showing (those own the full screen).
          The spark choice modal now yields to tutorials instead of the
          other way around, so FIRST_SPARK_OFFER ('Choose wisely') shows
          BEFORE the picker, not after. */}
      {currentEvent?.kind === 'tutorial'
        && !cultivation.majorBreakthrough
        && (
        <TutorialModal
          key={currentEvent.id}
          kicker={currentEvent.payload?.id ? gt('tutorials', currentEvent.payload.id, 'kicker', currentEvent.payload.kicker) : currentEvent.payload?.kicker}
          title={currentEvent.payload?.id ? gt('tutorials', currentEvent.payload.id, 'title', currentEvent.payload.title) : currentEvent.payload?.title}
          body={currentEvent.payload?.id ? gt('tutorials', currentEvent.payload.id, 'body', currentEvent.payload.body) : currentEvent.payload?.body}
          iconSrc={currentEvent.payload?.iconSrc}
          ctaText={currentEvent.payload?.id ? gt('tutorials', currentEvent.payload.id, 'ctaText', currentEvent.payload.ctaText) : currentEvent.payload?.ctaText}
          glowA={currentEvent.payload?.glowA}
          glowB={currentEvent.payload?.glowB}
          onDone={() => dismiss(currentEvent.id)}
        />
      )}
      {activeModal === 'shop'         && <BloodLotusShopModal  onClose={() => setActiveModal(null)} onBalanceChange={null} addToast={notifications.addToast} />}
      {activeModal === 'codex'        && (
        <CodexModal
          achievements={achievements}
          stats={stats}
          qiRef={cultivation.qiRef}
          rateRef={cultivation.rateRef}
          inventory={shopInventory}
          gating={{
            // Per-minigame tab visibility. Each codex section only appears
            // when the matching minigame is unlocked / engaged.
            garden:  producers.isUnlocked('p_herb_garden',      cultivation.realmIndex),
            roster:  (producers.getOwned?.('p_disciple') ?? 0) >= 1,
            furnace: producers.isUnlocked('p_meridian_furnace', cultivation.realmIndex),
          }}
          discipleTranscendUnlocked={!!tree.modifiers.discipleTranscendUnlocked}
          onNavigateBazaar={() => navigate('spirit-bazaar')}
          onClose={() => setActiveModal(null)}
        />
      )}
      {/* PillDrawer modal removed with the v1 pivot — the old pill brewing
          recipes are gone, and the new pill design is TBD. The activeModal
          'pills' key + openModal('pills') call sites have been pruned too. */}
      {(activeModal === 'daily' || currentEvent?.kind === 'daily-bonus') && (
        <DailyBonusModal
          streak={dailyBonus.streak}
          todayReward={dailyBonus.todayReward}
          isAvailable={dailyBonus.isAvailable}
          onCollect={() => dailyBonus.collect()}
          onClose={() => {
            setActiveModal(null);
            if (currentEvent?.kind === 'daily-bonus') dismiss(currentEvent.id);
          }}
        />
      )}
      {/* Reincarnation. A confirmation gate, then the Eternal Tree as a
          root-level full-screen overlay (above the nav, no escape but to turn
          the wheel). Rendered here, OUTSIDE screen-container, so its fixed
          z-index covers the chrome instead of being trapped beneath it. */}
      {reincarnationStage === 'confirm' && (
        <ReincarnationConfirmModal
          canReincarnate={cultivation.realmIndex >= 26}
          karma={karma.karma}
          realmName={cultivation.realmMajor}
          onConfirm={() => setReincarnationStage('severing')}
          onCancel={() => setReincarnationStage(null)}
        />
      )}
      {(reincarnationStage === 'severing' || reincarnationStage === 'rising') && (
        <SeveringRite
          fading={reincarnationStage === 'rising'}
          onComplete={() => setReincarnationStage('rising')}
        />
      )}
      {(reincarnationStage === 'rising' || reincarnationStage === 'tree') && (
        <EternalTreeScreen
          karma={tree.availableKarma}
          karmaEarnedThisLife={karma.karmaEarnedThisLife}
          cumulativeQi={karma.cumulativeQi}
          qiForNextKarma={karma.qiForNextKarma}
          tree={tree}
          lives={karma.lives}
          realmIndex={cultivation.realmIndex}
          // Defer the actual wipe until the Dissolution cinematic finishes —
          // the wheel turns, the orb beats out, the dawn blooms, THEN the
          // world is reset. The dissolution rite owns the visual+emotional
          // moment; handleReincarnate owns the destructive act.
          //
          // Mirror handleReincarnate's Saint-realm gate here so we don't
          // play the cinematic for a wipe that would silently no-op (which
          // would strand the user staring at the dawn end-state forever).
          onReincarnate={() => {
            if (cultivation.realmIndex < 24) return;
            setReincarnationStage('dissolution');
          }}
        />
      )}
      {reincarnationStage === 'dissolution' && (
        <DissolutionRite
          realmName={cultivation.realmMajor}
          onComplete={() => {
            handleReincarnate();
            // Safety net: handleReincarnate gates on realm >= Saint and
            // ALSO defers its wipe+reload behind a 50ms setTimeout. If
            // either the gate returns early OR the localStorage write
            // throws, no reload fires and the dissolution overlay would
            // stay stranded at its dawn end-state. Clear the stage after
            // 1.2s so the player at least returns to the Tree. On the
            // happy path, window.location.reload() unloads the page well
            // before this timer would trigger, so it harmlessly cancels.
            setTimeout(() => {
              setReincarnationStage((prev) => prev === 'dissolution' ? null : prev);
            }, 1200);
          }}
        />
      )}
    </div>
    </DiscipleMergeContext.Provider>
  );
}

/**
 * Continuous-experience reincarnation.
 *
 * handleReincarnate dispatches a `mai:full-reset` event INSTEAD of calling
 * window.location.reload(). This outer App catches the event and:
 *
 *   1. Sets `transitioning = true` — a cream-wash overlay mounts at full
 *      opacity, painted before the next React commit. The DissolutionRite's
 *      own whiteout was at ~75% opacity at this exact moment, so the
 *      handoff reads as a single continuous wash.
 *   2. requestAnimationFrame → bumps `gen`. AppInner unmounts (every hook
 *      cleans up, the DissolutionRite portal unmounts with it) and remounts
 *      with the new key. The fresh AppInner re-reads localStorage, which
 *      wipeReincarnation just pruned correctly — karma + tree + laws +
 *      stats lifetime + achievements + tutorial-seen + feature-seen +
 *      world-seen all survive.
 *   3. After 1100ms (enough for the new home screen to mount + paint),
 *      the cream wash fades over 600ms and unmounts. Net effect: cinematic
 *      flows directly into the new life with no browser reload pause and
 *      no re-firing of already-earned achievements or tutorial cards.
 */
function App() {
  const [gen, setGen]                   = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timersRef                       = useRef([]);

  useEffect(() => {
    const onReset = () => {
      // Clear any timers from a previous reset that might still be pending
      // (defensive — should never happen in practice).
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      // Mount the wash at opacity 1 immediately. The DissolutionRite's own
      // whiteout is at ~75% at this moment, so the eye sees a small ~25%
      // brightness pop in a single frame, then a continuous wash. No fade-
      // in animation because a partially-transparent wash during the
      // AppInner remount would briefly expose the background.
      setTransitioning(true);
      // One paint frame later, bump gen so AppInner unmounts + remounts
      // BENEATH the wash — the wash covers the reconcile, the new home
      // screen mounts invisibly.
      requestAnimationFrame(() => setGen(g => g + 1));
      // 800ms hold: enough for the new AppInner to mount + paint even on
      // mid-tier mobile. Then begin the cream fade-out via .is-finishing.
      const fadeT = setTimeout(() => {
        const node = document.querySelector('.app-reset-wash');
        if (node) node.classList.add('is-finishing');
      }, 800);
      // Fade-out is 700ms (CSS transition), so unmount at 1500ms.
      const endT = setTimeout(() => setTransitioning(false), 1500);
      timersRef.current = [fadeT, endT];
    };
    window.addEventListener('mai:full-reset', onReset);
    return () => {
      window.removeEventListener('mai:full-reset', onReset);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <EventQueueProvider>
      <AppInner key={gen} />
      {transitioning && <div className="app-reset-wash" aria-hidden="true" />}
    </EventQueueProvider>
  );
}

export default App;
