import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import NavBar from './components/NavBar';
import TopBar from './components/TopBar';
import HomeScreen from './screens/HomeScreen';
import BloodLotusShopModal from './components/BloodLotusShopModal';
import SpiritBazaarScreen from './screens/SpiritBazaarScreen';
import { addBloodLotus as addBloodLotusBalance, getBloodLotusBalance } from './systems/bloodLotus';
import useShopInventory from './hooks/useShopInventory';
import { SHOP_ITEMS_BY_ID } from './data/shopItems';
import PillDrawer from './components/PillDrawer';
import CodexModal from './components/CodexModal';
import JourneyScreen from './screens/JourneyScreen';
import DailyBonusModal from './components/DailyBonusModal';
import { useDailyBonus } from './hooks/useDailyBonus';
import EternalTreeScreen from './components/EternalTreeScreen';
import ReincarnationConfirmModal from './components/ReincarnationConfirmModal';
import { initAds } from './rewards/rewardService';
import { restoreResolution } from './systems/desktopResolution';
import {
  initAnalytics,
  trackReincarnation,
  trackAchievementUnlocked,
  trackScreenView,
  trackFirstTime,
} from './analytics';
import CombatScreen from './screens/CombatScreen';
import WorldsScreen from './screens/WorldsScreen';
import CharacterScreen from './screens/CharacterScreen';
import CollectionScreen from './screens/CollectionScreen';
import ProductionScreen from './screens/ProductionScreen';
import CultivationScreen from './screens/CultivationScreen';
import SettingsScreen from './screens/SettingsScreen';
import AboutScreen    from './screens/AboutScreen';
import useReincarnationKarma from './hooks/useReincarnationKarma';
import useReincarnationTree  from './hooks/useReincarnationTree';
import { useDiscipleMergeProvider, DiscipleMergeContext } from './hooks/useDiscipleMerge';
import { wipeReincarnation, SAVE_VERSION, SAVE_VERSION_KEY } from './systems/save';
import useCultivation from './hooks/useCultivation';
import useInventory   from './hooks/useInventory';
import useTechniques  from './hooks/useTechniques';
import useCombat      from './hooks/useCombat';
import useArtefacts   from './hooks/useArtefacts';
import usePills       from './hooks/usePills';
import useQiCrystal  from './hooks/useQiCrystal';
import useProducers  from './hooks/useProducers';
import useUpgrades   from './hooks/useUpgrades';
import useAutoFarm    from './hooks/useAutoFarm';
import useStats       from './hooks/useStats';
import { recordStat } from './systems/statsRecorder';
import WORLDS         from './data/worlds';
import { mineralForRarity } from './data/materials';
import { computeAllStats, computeStat, mergeModifiers } from './data/stats';
import { evaluateLawUniques, buildContext } from './systems/lawEngine';
import { getSetBonusModifiers } from './data/artefactSets';
import { initDebug } from './debug/gameDebug';
import { preloadImages, PLAYER_SPRITE_SRCS } from './utils/preload';
import { loadGraphics, applyGraphics } from './systems/graphics';
import useNotifications from './hooks/useNotifications';
import useLawOffers from './hooks/useLawOffers';
import useQiSparks  from './hooks/useQiSparks';
import useClearedRegions from './hooks/useClearedRegions';
import useFeatureFlags from './hooks/useFeatureFlags';
import useAchievements from './hooks/useAchievements';
import achBus from './systems/achievementBus';
import { isLunarNewYear, isDoubleNinth } from './systems/calendarEvents';
import { FEATURES } from './data/featureFlags';
import { sparksToGrantOnEvolution } from './data/crystalMechanicGrants';
import { QI_SPARK_BY_ID, QI_SPARKS } from './data/qiSparks';
import { PRODUCERS_BY_ID } from './data/producers';
import { loadGarden, gardenActiveQiMult } from './data/spiritGarden';
import { fireTutorialOnce } from './systems/fireTutorial';
import { hasSeenTutorial, markTutorialSeen } from './systems/tutorialSeen';
import { TUTORIAL_IDS } from './data/tutorialCards';
import TutorialModal from './components/TutorialModal';

// Which screens are hidden by which build-time feature flag. Routes to a
// blocked screen are silently rewritten to `home` by navigate() below, so
// stale saves or stray notification deeplinks can't land on a null entry.
const SCREEN_FLAGS = {
  worlds:         'combat',
  'combat-arena': 'combat',
  character:      'combat',
  collection:     'combat',
  production:     'combat',
};
const isScreenAllowed = (screenId) => {
  const flag = SCREEN_FLAGS[screenId];
  return !flag || FEATURES[flag];
};
import ToastStack from './components/ToastStack';
import SelectionModal from './components/SelectionModal';
import QiSparkChoiceModal from './components/QiSparkChoiceModal';
import { AudioManager } from './audio';
import { installGlobalClickSfx } from './audio/clickSfx';
import { Platform } from './platform';
import { EventQueueProvider, useEventQueue, useBlockingPresence } from './contexts/EventQueueContext';
import './App.css';

function AppInner() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParam,   setScreenParam]   = useState(null);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);

  // Single active modal — only one top-bar popup can be open at a time.
  // Toggling the same key closes it; opening a new key replaces the current one.
  const [activeModal, setActiveModal] = useState(null);
  const [hasNewAch,   setHasNewAch]   = useState(false);
  // Reincarnation flow: null = closed, 'confirm' = the warning modal, 'tree' =
  // the committed full-screen Eternal Tree (no nav, no cancel). Confirming the
  // modal is the point of no return; the tree's only exit is to reincarnate.
  const [reincarnationStage, setReincarnationStage] = useState(null);

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
    const ours = new Set(['shop', 'codex', 'pills', 'daily']);
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
  const inventory       = useInventory();
  const karma           = useReincarnationKarma();
  const tree            = useReincarnationTree({ karma: karma.karma, spendKarma: karma.spendKarma, lives: karma.lives });
  const techniques      = useTechniques({ extraSlots: 0 });
  const combat          = useCombat();
  const artefacts       = useArtefacts();
  const pills           = usePills();
  const totalOwnedPills = Object.values(pills.ownedPills).reduce((s, n) => s + n, 0);
  const crystal         = useQiCrystal({ getQuantity: inventory.getQuantity, removeItem: inventory.removeItem });
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

  const { clearedRegions, clearRegion } = useClearedRegions();
  const selections      = useLawOffers({ cultivation });
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

  // Keep pill qi multiplier in sync with cultivation game loop.
  const pillQiMult = pills.getQiMult();
  useEffect(() => {
    cultivation.pillQiMultRef.current = pillQiMult;
  }, [pillQiMult, cultivation.pillQiMultRef]);

  // Push reincarnation-tree cultivation speed bonus into the loop.
  // n_1 Devoted Path: treeQiMult = 1 + 0.001 × karmaSpentOnTree.
  useEffect(() => {
    cultivation.treeQiMultRef.current       = tree.modifiers.treeQiMult ?? 1;
    cultivation.treeHeavenlyMultRef.current = 1; // no tree node drives heavenly mult
    // qiOnRealmFrac — no tree node; stays at 0 (Yin Reservoir was yy_2).
    if (cultivation.qiOnRealmFracRef) {
      cultivation.qiOnRealmFracRef.current  = 0;
    }
    // treeProducerOutputMultRef — no new node; stays at 1.
    if (cultivation.treeProducerOutputMultRef) {
      cultivation.treeProducerOutputMultRef.current = 1;
    }
    // n_5 Frugal Cultivation — write producer cost discount ref.
    if (producers.costMultRef) {
      producers.costMultRef.current = tree.modifiers.producerCostMult ?? 1;
    }
  }, [tree.modifiers, cultivation.treeQiMultRef, cultivation.treeHeavenlyMultRef, cultivation.qiOnRealmFracRef, cultivation.treeProducerOutputMultRef, producers.costMultRef]); // eslint-disable-line react-hooks/exhaustive-deps


  // Ref updated every render so effects always see the latest breakthrough state
  // without needing it as a dep (avoids stale-closure false-negatives).
  const majorBreakthroughRef = useRef(null);
  majorBreakthroughRef.current = cultivation.majorBreakthrough;

  // Auto-enqueue selection cards when pendingCount increases mid-session
  // (i.e. a real level-up just happened). Skip on load so players aren't
  // greeted by the modal immediately — the notification badge is enough.
  // Major breakthroughs: BreakthroughBanner.onDone enqueues the cards after
  // the animation; suppress here so they don't double-fire.
  const prevPendingRef = useRef(null);
  useEffect(() => {
    const prev = prevPendingRef.current;
    prevPendingRef.current = selections.pendingCount;
    if (prev === null) return; // first render — treat as load, don't enqueue
    // Laws are hidden until combat ships. The hook keeps writing pending
    // offers to localStorage so when FEATURES.laws flips on in v2 the
    // player picks up where they left off; we just don't surface them now.
    if (!FEATURES.laws) return;
    if (selections.pendingCount > prev && currentScreen === 'home') {
      if (!majorBreakthroughRef.current) {
        enqueue('selection-cards', null, { dedupe: true });
      }
    }
  }, [selections.pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-enqueue offline earnings when they appear. Pinned priority so it
  // stays at the head of the queue even if a crystal/character evolution fires
  // simultaneously -- the player must collect (or watch the ad) before anything
  // else pops over it.
  useEffect(() => {
    if (cultivation.offlineEarnings > 0) {
      enqueue('offline-earnings', null, { priority: 'pinned', dedupe: true });
    }
  }, [cultivation.offlineEarnings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror the queue's selection-cards event onto the legacy modal flag so
  // the existing render path stays simple. Player-tap on the rewards chip
  // also flips this flag directly, bypassing the queue.
  useEffect(() => {
    if (!FEATURES.laws) return;
    if (currentEvent?.kind === 'selection-cards') setSelectionModalOpen(true);
  }, [currentEvent]);

  // Once all pending selections are resolved, retire the queue event and
  // collapse the modal flag — covers the "player picked the last reward"
  // path where SelectionModal unmounts on its own without firing onClose.
  useEffect(() => {
    if (selections.pendingCount === 0) {
      if (selectionModalOpen) setSelectionModalOpen(false);
      if (currentEvent?.kind === 'selection-cards') dismiss(currentEvent.id);
    }
  }, [selections.pendingCount, selectionModalOpen, currentEvent, dismiss]);

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
    // Blood Lotus Shop — "Producer Surge" buff. Multiplies every
    // producer's contribution uniformly. Folded into the perProducer
    // callback so it stacks naturally with upgrade-driven and spark-
    // driven per-producer multipliers (multiplicative chain).
    const shopProducerMult = shopInventory.getActiveBuffMult('producer_mult');
    // Disciple Promotion grid (merge minigame) → +X% to p_disciple per-unit
    // qi/s. Folded into perProducer so it composes with upgrade doubling,
    // spark synergies, and shop buffs in the same multiplicative chain.
    const discipleMergeMult = discipleMerge?.producerMult ?? 1;
    const perProducer = (pid) =>
      upgrades.getProducerMult(pid)
        * qiSparks.getProducerSparkMult(pid, ownedMap)
        * shopProducerMult
        * (pid === 'p_disciple' ? discipleMergeMult : 1);
    // 2026-05-21 Dial-9 — Sect Discipline (common timed spark) adds +N to
    // every producer's per-unit qi/s while active. Read from the spark ref
    // (default 0). The bonus flows through per-producer mults and all
    // downstream global mults the same way the producer's own base does.
    const flatPerUnit = qiSparks.producerFlatPerUnitRef?.current ?? 0;
    const effective = producers.getRate(perProducer, flatPerUnit, {
      selfSynergyPct:  tree.modifiers.producerSelfSynergyPct  ?? 0,
      crossSynergyPct: tree.modifiers.producerCrossSynergyPct ?? 0,
    });
    cultivation.producerRateRef.current = effective;
    // Trinity Convergence + producer_pair_global_mult — global multipliers
    // from legendary sparks, folded into the rate calc downstream.
    if (cultivation.sparkLegendaryGlobalMultRef) {
      cultivation.sparkLegendaryGlobalMultRef.current = qiSparks.getGlobalSparkMult(ownedMap);
    }
    try {
      localStorage.setItem('mai_producers_rate_snapshot', JSON.stringify({ rate: effective }));
    } catch {}
  }, [producers.owned, upgrades.owned, qiSparks.activeSparks, shopInventory.inv, tree.modifiers, cultivation.producerRateRef, cultivation.sparkLegendaryGlobalMultRef, discipleMerge?.producerMult]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Producer surge is folded into the producer-rate effect above via
  // shopInventory.getActiveBuffMult('producer_mult') in the perProducer
  // callback — keeps producer composition in one place.
  useEffect(() => {
    if (cultivation.shopBuffQiMultRef) {
      cultivation.shopBuffQiMultRef.current = shopInventory.getActiveBuffMult('qi_mult');
    }
    if (cultivation.shopBuffCrystalTapMultRef) {
      cultivation.shopBuffCrystalTapMultRef.current = shopInventory.getActiveBuffMult('crystal_tap_mult');
    }
  }, [shopInventory.inv, cultivation.shopBuffQiMultRef, cultivation.shopBuffCrystalTapMultRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror the Spirit Garden elixir buff into cultivation once per second. The
  // garden persists to localStorage independently of this component tree, so we
  // poll rather than subscribe: the qi/s multiplier stays live whether the
  // garden overlay is open, closed, or the elixir was brewed in a past session
  // (timed buffs expire on a timestamp, so only polling catches the expiry).
  useEffect(() => {
    const apply = () => {
      if (cultivation.gardenBuffQiMultRef) {
        cultivation.gardenBuffQiMultRef.current = gardenActiveQiMult(loadGarden());
      }
    };
    apply();
    const id = setInterval(apply, 1000);
    return () => clearInterval(id);
  }, [cultivation.gardenBuffQiMultRef]);

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
    if (cultivation.realmIndex >= 24) {
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
    // one (rung N → level N+1, see onRung), capped at the 5 uploaded samples.
    // Entering a NEW level plays an instant focus_tick AND (re)starts the
    // focus_cultivate loop, both at that level's variant. `focusLoopVariant` is
    // the level currently playing (0 = none) so a no-op event (same level,
    // e.g. a rung edge that maps to the level already playing) never re-fires.
    const FOCUS_LEVELS = 5;
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


  // ── Centralised stat getter ─────────────────────────────────────────────
  // Builds the FULL computeAllStats bundle including modifier contributions
  // from artefacts, pills, and law uniques. Used by autoFarm (gather/mine
  // speed + luck), combat (exploit chance/mult), and cultivation (focus mult).
  // Called per-tick from autoFarm and per-fight from CombatScreen — kept
  // pure / read-only so it never triggers React renders.
  // Multiplicatively combine per-tech-type CD scalers from law + set sources.
  // e.g. law gives Heal ×2 and a set gives Heal ×0.8 → final Heal ×1.6.
  const mergeCdTypeMults = (a, b) => {
    const out = { ...(a ?? {}) };
    for (const [t, m] of Object.entries(b ?? {})) {
      out[t] = (out[t] ?? 1) * m;
    }
    return out;
  };

  const getFullStats = useCallback(() => {
    const qi         = cultivation.qiRef.current;
    const law        = cultivation.activeLaw;
    const realmIndex = cultivation.indexRef.current;

    // Pre-compute light context fields the new element-themed law uniques
    // need (per-element artefact counts + per-type tech counts). Stat-driven
    // fields (current dodge chance, damage multiplier, etc.) aren't known
    // until *after* stats compute below; lawEngine handles their absence
    // gracefully (resolvers default to 0 → effect contributes nothing).
    const equippedArtefactsByElement = artefacts?.getEquippedArtefactsByElement?.()
      ?? { fire: 0, water: 0, earth: 0, wood: 0, metal: 0 };
    const equippedTechsByType = (() => {
      const out = { Attack: 0, Heal: 0, Defend: 0, Dodge: 0, Expose: 0 };
      for (const t of (techniques?.equippedTechniques ?? [])) {
        if (t?.type && out[t.type] !== undefined) out[t.type] += 1;
      }
      return out;
    })();
    const lawCtx    = buildContext({
      inCombat: false,
      realmIndex,
      lawElement: law?.element,
      isAtPeak: realmIndex >= 46,
      equippedArtefactsByElement,
      equippedTechsByType,
    });
    const lawBundle = evaluateLawUniques(law, lawCtx);

    // hw_4 Soul Crucible — multiply every pill-derived mod value by 1.25.
    // Multiplies the raw flat / increased / more values themselves so the
    // scaling shows up as a simple post-roll boost on the existing pill mods.
    // Artefact uniques (a_alchemist_hands / a_sage_belt / a_alchemy_ring)
    // stack multiplicatively with the tree bonus.
    const artefactMods = artefacts?.getStatModifiers?.() ?? {};
    const artefactPillPct = (artefactMods.pill_effect_mult ?? []).reduce((s, m) => s + (m.value ?? 0), 0);
    const pillMult = (1 + artefactPillPct);
    const scalePillBundle = (mods) => {
      if (!mods || pillMult === 1) return mods ?? {};
      const out = {};
      for (const [statId, list] of Object.entries(mods)) {
        out[statId] = list.map(m =>
          m.type === 'more'
            ? { ...m, value: 1 + (m.value - 1) * pillMult }
            : { ...m, value: m.value * pillMult }
        );
      }
      return out;
    };
    const scaledPillMods = scalePillBundle(pills?.getStatModifiers?.() ?? {});

    const artefactMult = 1;
    const scaleArtefactBundle = (mods) => {
      if (!mods || artefactMult === 1) return mods ?? {};
      const out = {};
      for (const [statId, list] of Object.entries(mods)) {
        out[statId] = list.map(m =>
          m.type === 'more'
            ? { ...m, value: 1 + (m.value - 1) * artefactMult }
            : { ...m, value: m.value * artefactMult }
        );
      }
      return out;
    };
    const scaledArtefactMods = scaleArtefactBundle(artefactMods);

    // ── Set-bonus aggregation (depends on lawBundle's setCountBonus) ──────
    // Set bonuses can be inflated by law uniques like "<Ember Legacy> counts
    // as +1". Compute once with the law-side count bonus piped in; the
    // statMods stack with artefact + law mods below, while flags + triggers
    // + cdTypeMults attach directly to the combat stats bundle further down.
    const setBundle = getSetBonusModifiers(
      artefacts?.equipped ?? {},
      artefacts?.owned ?? [],
      { hpPct: 1 }, // out-of-combat placeholder ctx; conditional set effects evaluate inactive
      lawBundle?.setCountBonus ?? null,
    );
    // Push set-bonus statMods into the scaledArtefactMods bundle so they
    // flow through the usual merge path below.
    for (const [stat, list] of Object.entries(setBundle.statMods)) {
      (scaledArtefactMods[stat] ??= []).push(...list);
    }
    // Collapse artefact-only qi_speed mods into a single multiplier fed to
    // the cultivation tick. Law-unique qi_speed is handled inside cultivation
    // directly, so it is NOT included here (double-count guard).
    const artefactQiMods = scaledArtefactMods.qi_speed ?? [];
    const artefactQiMult = artefactQiMods.length > 0
      ? computeStat(1, artefactQiMods)
      : 1;

    // typeMults removed in Stage 4 of the Damage & Element Overhaul —
    // basic-attack damage is scaled purely by realm index now (see
    // useCombat's placeholder formula). The cb_is reincarnation node
    // has been retired alongside it.
    const lawForCompute = law;

    const mergedMods = mergeModifiers(
      scaledArtefactMods,
      scaledPillMods,
      lawBundle.statMods,
      tree?.getStatModifiers?.(),
    );

    const bundle = computeAllStats(qi, lawForCompute, realmIndex, mergedMods);

    // Collapse a percentage-style stat into a single scalar via the same
    // 5-layer formula (so artefacts / law uniques / pills / selections all
    // contribute the same way they would for a primary stat).
    const collapsePct = (statId) => {
      const list = mergedMods[statId];
      if (!list || !list.length) return 0;
      return computeStat(0, list);
    };
    const collapseFlat = (statId) => {
      const list = mergedMods[statId];
      if (!list || !list.length) return 0;
      return computeStat(0, list);
    };

    // Per-pool damage flats were read by the 9-pool calcDamage split
    // (removed in Stage 5). The `dmg_<pool>` affixes and STAT_META entries
    // still exist and roll harmlessly until the Stage-6 cleanup; they
    // simply don't feed into damage anymore.

    return {
      // Primary stats (essence/soul/body) were retired stage 15 and stripped
      // from the bundle 2026-04-27 alongside the calcDamage cleanup. The
      // associated lawElement holdover is retained for any law-engine
      // condition that still keys off it.
      health:     bundle.combat.health,
      lawElement: law?.element ?? null,
      law: lawForCompute,
      // Flat damage bonuses + source-gated multipliers, all consumed by
      // calcDamage and useCombat's basic-attack.
      damageStats: {
        physical:                bundle.combat.physDmg,
        elemental:               bundle.combat.elemDmg,
        damage_all:              collapseFlat('damage_all'),
        secret_technique_damage: collapsePct('secret_technique_damage'),
        default_attack_damage:   collapsePct('default_attack_damage'),
      },
      // Activity stats — needed by autoFarm + Gathering/Mining screens.
      // Artefact `loot_luck` (a_lucky_ring) boosts both luck pools equally
      // so one ring covers gather + mine; `all_loot_bonus` (a_seer_locket)
      // feeds into qty multipliers downstream via getAllLootBonus below.
      harvestSpeed: bundle.activity.harvestSpeed,
      harvestLuck:  bundle.activity.harvestLuck   + collapseFlat('loot_luck'),
      miningSpeed:  bundle.activity.miningSpeed,
      miningLuck:   bundle.activity.miningLuck    + collapseFlat('loot_luck'),
      focusMult:    bundle.activity.focusMult,
      // Combat-only
      exploitChance: bundle.combat.exploitChance,
      exploitMult:   bundle.combat.exploitMult,
      // Defence stats — useCombat picks the one matching the enemy's damage
      // type when computing mitigation.
      defense:          bundle.combat.defense,
      elementalDefense: bundle.combat.elemDef,
      // Expose-pipeline stats (added 2026-04-26 secret-tech overhaul).
      defPen:                   bundle.combat.defPen,
      incomingDamageReduction:  bundle.combat.incomingDamageReduction,
      // Scales the attack-count of Defend / Dodge buffs at cast time.
      buffDurationMult: 1 + collapsePct('buff_duration'),
      // Scales magnitude (defMult / dodgeChance) at cast time.
      buffEffectMult:   collapsePct('buff_effect'),
      // ── Artefact-derived extras ───────────────────────────────────────
      // crit_chance / crit_damage / crit_twice_chance were consolidated
      // into exploit_chance / exploit_attack_mult on 2026-04-26.
      lifestealPct:           collapseFlat('lifesteal'),              // 0–100
      dodgeChancePct:         collapseFlat('dodge_chance'),           // 0–100
      dodgeFatalChancePct:    collapseFlat('dodge_fatal_chance'),     // 0–100
      ignoreDefensePct:       collapseFlat('ignore_defense_pct'),     // 0–100
      ignoreDefenseChancePct: collapseFlat('ignore_defense_chance'),  // 0–100
      reflectPct:             collapseFlat('reflect_pct'),            // 0–100
      healingReceivedPct:     collapsePct('healing_received'),        // 0–1 (30% → 0.30)
      cooldownReductionPct:   Math.min(0.8, collapsePct('cooldown_reduction_all')
                                         + collapsePct('technique_cd_reduction')
                                         + collapsePct('attack_cd_reduction')),
      freeCastChancePct:      collapseFlat('tech_free_cast_chance'),  // 0–100
      hpRegenInCombatPct:     collapsePct('hp_regen_in_combat'),      // fraction of maxHP / sec
      hpRegenOutCombatPct:    collapsePct('hp_regen_out_combat'),     // fraction of maxHP / sec
      offlineQiMult:          1 + collapsePct('offline_qi_mult'),     // 1 + 0.30 = 1.30
      pillEffectArtefactMult: 1 + collapsePct('pill_effect_mult'),    // stacked with tree in App
      craftingCostReduction:  Math.min(0.75, collapsePct('crafting_cost_reduction')),
      allLootBonusPct:        collapsePct('all_loot_bonus'),          // 0–1
      lootLuckPct:            collapseFlat('loot_luck'),              // 0–100
      // Set-bonus flags + triggers (the artefact-uniques flag bag was deleted
      // in 2026-04-27 alongside the unique system). setBundle is the
      // law-aware aggregate computed earlier in this same callback.
      setFlags:               setBundle?.flags ?? {},
      setTriggers:            setBundle?.triggers ?? [],
      // Law-unique flags + triggers (sourced from the active law's uniques).
      // Per-tech-type CD multipliers stack across law + set sources.
      lawFlags:               lawBundle?.flags ?? {},
      lawTriggers:            lawBundle?.triggers ?? [],
      lawCdTypeMults:         mergeCdTypeMults(lawBundle?.cdTypeMults, setBundle?.cdTypeMults),
      // Per-element artefact counts (drives per-element scaling laws).
      equippedArtefactsByElement: artefacts?.getEquippedArtefactsByElement?.() ?? { fire: 0, water: 0, earth: 0, wood: 0, metal: 0 },
      // Heavenly QI multiplier (artefact rings) — only applies during ad boost.
      heavenlyQiMult:   collapsePct('heavenly_qi_mult'),
      // Artefact-derived qi_speed aggregate — mirrored to useCultivation so
      // affix rolls affect the live cultivation rate.
      artefactQiMult,
      // Reincarnation tree — combat/autoFarm modifiers (all removed from new tree).
      maxOfflineHours:          undefined,
      cooldownMult:             1,
      undyingResolve:           false,
      killingStride:            false,
      hpRegenPerSec:            0,
      freeCastEvery:            0,
      qiOnEveryRealmFrac:       0,
      gatherMineRarityUpChance: 0,
      regionKillBonus:          false,
      // cb_ts Veteran's Hunt — pending bump *count*. autoFarm decrements
      // it explicitly when it consumes a bump (see useAutoFarm tick).
      huntBumpsPendingRef:    combat.huntBumpsPendingRef,
      damageMult:             1,
      // Context useCombat needs to evaluate artefact conditional flags.
      realmIndex,
      equippedArtefactCount:  Object.values(artefacts?.equipped ?? {}).filter(Boolean).length,
    };
  }, [cultivation, artefacts, pills, selections, tree]);

  // Mirror focusMult into a ref the cultivation tick reads directly so
  // boost speed reflects equipment / pill modifiers. Same loop also keeps
  // the artefact-derived heavenly_qi multiplier in sync so cultivation
  // sees ring rolls without the cultivation hook needing to know about
  // the artefact layer.
  useEffect(() => {
    if (!cultivation.focusMultRef) return;
    const id = setInterval(() => {
      const full = getFullStats();
      // Deeper Breath upgrades add flat percentage points (50/50/50/100) to
      // the focus mult coming from stats/artefacts/laws. Sourced via a ref so
      // this interval doesn't need to be re-created on every upgrade change.
      const upgradeAdd = cultivation.upgradeFocusMultAddRef?.current ?? 0;
      cultivation.focusMultRef.current = full.focusMult + upgradeAdd;
      if (cultivation.heavenlyQiMultRef) {
        cultivation.heavenlyQiMultRef.current = full.heavenlyQiMult ?? 0;
      }
      if (cultivation.artefactQiMultRef) {
        cultivation.artefactQiMultRef.current = full.artefactQiMult ?? 1;
      }
      // Mirror the artefact offline-qi multiplier to localStorage so that
      // useCultivation's offline bootstrap (runs before React mounts) can
      // still read it. Small snapshot, written once a second.
      try {
        localStorage.setItem('mai_artefact_offline_snapshot',
          JSON.stringify({ offlineQiMult: full.offlineQiMult ?? 1 }));
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, [cultivation.focusMultRef, cultivation.heavenlyQiMultRef, cultivation.artefactQiMultRef, getFullStats]);

  // Auto-farm — stat getter reads live refs so the hook never triggers re-renders
  const autoFarm = useAutoFarm({
    worlds: WORLDS,
    getStats: getFullStats,
  });

  // Derive the single active idle assignment from the config
  const idleAssignment = useMemo(() => {
    const cfg = autoFarm.autoFarmConfig;
    for (const activity of ['combat', 'gathering', 'mining']) {
      if (cfg[activity]?.enabled) {
        return {
          activity,
          worldIndex:  cfg[activity].worldIndex,
          regionIndex: cfg[activity].regionIndex,
        };
      }
    }
    return null;
  }, [autoFarm.autoFarmConfig]);

  const notifications = useNotifications({ cultivation, inventory });

  // Round 3 — Crystal Discovery. Subscribes to HomeScreen's tier-crossed
  // window event and grants any mechanic-tier sparks attached to crossed
  // tiers. `qiSparks.grant` is idempotent for mechanics so re-firing is safe.
  // A toast lands per successful grant so the player sees the unlock.
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

  // Round 3 — one-shot backfill for combat-alpha saves whose crystal is
  // already past a mechanic-grant threshold but who never rolled the rare
  // spark (now retired). Walks 0→currentTier through CRYSTAL_TIER_GRANTS;
  // `grant` is idempotent so anything already owned is skipped. Gated by a
  // localStorage flag so it runs exactly once per device.
  const backfillRanRef = useRef(false);
  useEffect(() => {
    if (backfillRanRef.current) return;
    if (!qiSparks?.grant) return;
    let seen = null;
    try { seen = localStorage.getItem('mai_v1_3_mechanic_backfill_seen'); } catch {}
    if (seen) { backfillRanRef.current = true; return; }
    // crystal.level is React state; on first render after load it's the
    // saved value. Walk tiers 1..currentTier (CRYSTAL_TIER_GRANTS starts at 2).
    const level = crystal?.level ?? 0;
    if (level > 0) {
      // Map level → visual tier using the same thresholds as useQiCrystal.
      // Inline rather than importing to keep the effect self-contained.
      const TIERS = [
        [1000, 10], [750, 9], [500, 8], [350, 7], [200, 6],
        [100,  5], [ 50, 4], [ 25, 3], [ 10, 2], [  1, 1],
      ];
      let currentTier = 0;
      for (const [thresh, t] of TIERS) {
        if (level >= thresh) { currentTier = t; break; }
      }
      const ids = sparksToGrantOnEvolution(0, currentTier);
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
      totalCrystalTaps:       lifetime.cultivatorTaps      ?? 0,
      peakTapsPerSec:         lifetime.peakTapsPerSec      ?? 0,
      longestHoldSec:         lifetime.longestHoldSec      ?? 0,
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
      // them still resolves to 0 / [] without throwing.
      ownedLawsCount:         cultivation.ownedLaws.length,
      ownedTechniquesCount:   Object.keys(techniques.ownedTechniques).length,
      clearedRegionsCount:    clearedRegions.size,
      ownedArtefactsCount:    artefacts.owned.length,
      discoveredPillsCount:   Object.keys(pills.discoveredPills).length,
    };
  }, [
    stats.lifetime, stats.run,
    cultivation.realmIndex,
    cultivation.ownedLaws.length,
    karma.lives,
    tree.purchased, tree.nodes,
    producers?.owned,
    achievements.totalCount,
    techniques.ownedTechniques,
    clearedRegions.size,
    artefacts.owned.length,
    pills.discoveredPills,
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
    clearedRegions,
    inventory,
    onUnlock: (featureId, msg) => {
      const SCREEN = {
        worlds: 'worlds', gathering: 'worlds', mining: 'worlds',
        production: 'production', alchemy: 'production',
        character: 'character', collection: 'collection',
        qi_crystal: 'home',
      };
      const targetScreen = SCREEN[featureId] ?? null;
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

  // Keep a live ref to all hooks so debug commands always see fresh state.
  const hooksRef = useRef({});
  hooksRef.current = { cultivation, inventory, techniques, combat, artefacts, pills, autoFarm, crystal, qiSparks };
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

  // BGM: one continuous main track for the whole game; combat-arena swaps to
  // the combat track and we cross-fade back to main on exit. AudioManager's
  // playBgm() early-returns when the requested track is already playing, so
  // navigating between non-combat screens leaves the music untouched.
  useEffect(() => {
    const trackId = currentScreen === 'combat-arena' ? 'combat' : 'cultivation';
    AudioManager.playBgm(trackId);
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
    setSelectionModalOpen(false);
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

    // Give React a tick to flush the karma state to localStorage before we
    // wipe the rest of the save + hard-reload.
    setTimeout(() => {
      // Stats — wipe the in-memory run bucket BEFORE wipeReincarnation
      // so the beforeunload flush (triggered by reload below) doesn't
      // restore the old run counters. resetRun also persists, so when
      // wipeReincarnation reads mai_stats it sees the correct lifetime
      // (including the +1 livesLived just fired by karma.reincarnate()).
      try { stats.resetRun(); } catch {}
      wipeReincarnation();
      window.location.reload();
    }, 50);
  }, [karma, cultivation.realmIndex, stats]);

  const goBack = () => {
    navigate('worlds', {
      expandWorldId: screenParam?.worldId ?? null,
      activeTab:     screenParam?.fromTab  ?? null,
    });
  };

  // Tree screen: accessible once the player reaches Saint realm (so they can
  // spend karma before reincarnating) OR in any subsequent life (lives ≥ 1).
  const reincarnationUnlocked = cultivation.realmIndex >= 24 || (karma.lives ?? 0) >= 1;

  const screens = {
    // Under !FEATURES.laws the SelectionModal is suppressed, so we also drop
    // the Rewards chip on HomeScreen (HomeScreen already null-checks selections).
    home:   <HomeScreen cultivation={cultivation} inventory={inventory} onOpenPills={() => openModal('pills')} totalOwnedPills={totalOwnedPills} selections={FEATURES.laws ? selections : null} onOpenSelections={() => setSelectionModalOpen(true)} onNavigate={navigate} crystal={crystal} isCrystalUnlocked={featureFlags.isUnlocked('qi_crystal')} lastIdleAssignment={autoFarm.lastIdleAssignment} openCrystal={screenParam?.openCrystal ?? false} activeSparks={qiSparks.activeSparks} activeBuffs={shopInventory.activeBuffs} crystalReservoirRef={cultivation.crystalReservoirRef} crystalClickCapMinRef={cultivation.sparkCrystalClickCapMinRef} collectCrystalReservoir={cultivation.collectCrystalReservoir} bypassTokenCount={shopInventory.getConsumable('consumable_major_bt_bypass')} onUseBypassToken={() => { if (shopInventory.useConsumable('consumable_major_bt_bypass')) cultivation.bypassGate?.(); }} pendingSparkOffers={qiSparks.pendingOffersCount} sparkModalOpen={qiSparks.isOfferModalOpen} onReviewSparkQueue={qiSparks.openOfferModal} equippedParticle={shopInventory.inv?.equipped?.['particles'] ?? null} />,
    // Combat-adjacent screens are mounted only when FEATURES.combat is true.
    // Otherwise they're null and `navigate` rewrites any attempt to land on
    // them to `home` (see the SCREEN_FLAGS guard above).
    worlds: isScreenAllowed('worlds')
      ? <WorldsScreen cultivation={cultivation} onNavigate={navigate} expandWorldId={screenParam?.expandWorldId ?? null} activeTab={screenParam?.activeTab ?? null} clearedRegions={clearedRegions} idleAssignment={idleAssignment} lastIdleAssignment={autoFarm.lastIdleAssignment} onSetIdle={(act, w, r) => autoFarm.setIdleActivity(act, w, r, false)} pendingGains={autoFarm.pendingGains} hasPendingGains={autoFarm.hasPendingGains} onCollectGains={(applyFn) => autoFarm.collectGains(applyFn)} inventory={inventory} techniques={techniques} getFullStats={getFullStats} />
      : null,
    // Sub-screens launched from the Worlds hub
    'combat-arena': isScreenAllowed('combat-arena')
      ? <CombatScreen
          cultivation={cultivation}
          techniques={techniques}
          combat={combat}
          inventory={inventory}
          artefacts={artefacts}
          region={screenParam?.region ?? null}
          onBack={goBack}
          getFullStats={getFullStats}
          onRegionCleared={clearRegion}
        />
      : null,
    character:  isScreenAllowed('character')
      ? <CharacterScreen cultivation={cultivation} techniques={techniques} artefacts={artefacts} pills={pills} tree={tree} />
      : null,
    collection: isScreenAllowed('collection')
      ? <CollectionScreen inventory={inventory} artefacts={artefacts} techniques={techniques} cultivation={cultivation} />
      : null,
    production: isScreenAllowed('production')
      ? <ProductionScreen inventory={inventory} pills={pills} tree={tree} />
      : null,
    // The qi-investment shop — main loop of v1, always visible.
    cultivation: <CultivationScreen cultivation={cultivation} producers={producers} upgrades={upgrades} crystal={crystal} qiSparks={qiSparks} initialTab={typeof screenParam === 'string' ? screenParam : null} legendaryPoolInfo={legendaryPoolInfo} autoBuyOwned={shopInventory.hasQol('qol_autobuy_cheapest')} autoBuyEnabled={autoBuyEnabled} onToggleAutoBuy={toggleAutoBuy} />,
    journey:    <JourneyScreen cultivation={cultivation} />,
    'spirit-bazaar': <SpiritBazaarScreen
                       inventory={shopInventory}
                       balance={selections.bloodLotusBalance ?? getBloodLotusBalance()}
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
        bloodLotusBalance={selections.bloodLotusBalance}
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
        badges={{ ...notifications.badges, home: FEATURES.laws && selections.pendingCount > 0, worlds: notifications.badges.worlds || autoFarm.hasPendingGains }}
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
      {FEATURES.laws && selectionModalOpen && selections.pending[0] && currentScreen === 'home' &&
       !(cultivation.majorBreakthrough && selections.pending[0]?.kind === 'law') && (
        <SelectionModal
          selection={selections.pending[0]}
          bloodLotusBalance={selections.bloodLotusBalance}
          onPickLaw={selections.pickLaw}
          onSkipLaw={selections.skipLaw}
          onRerollLawOne={selections.rerollLawOne}
          ownedLaws={cultivation.ownedLaws}
          activeLawId={cultivation.activeLaw?.id ?? null}
          onDismantleLaw={(lawId) => {
            const r = cultivation.dismantleLaw(lawId);
            if (r) inventory.addItem(mineralForRarity(r), 1);
          }}
          onClose={() => {
            setSelectionModalOpen(false);
            if (currentEvent?.kind === 'selection-cards') dismiss(currentEvent.id);
          }}
        />
      )}
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
        && !(selectionModalOpen && selections.pending[0]?.kind === 'law')
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
          kicker={currentEvent.payload?.kicker}
          title={currentEvent.payload?.title}
          body={currentEvent.payload?.body}
          iconSrc={currentEvent.payload?.iconSrc}
          ctaText={currentEvent.payload?.ctaText}
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
          onNavigateBazaar={() => navigate('spirit-bazaar')}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'pills'        && pills        && <PillDrawer open pills={pills} onClose={() => setActiveModal(null)} />}
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
          canReincarnate={cultivation.realmIndex >= 24}
          karma={karma.karma}
          realmName={cultivation.realmMajor}
          onConfirm={() => setReincarnationStage('tree')}
          onCancel={() => setReincarnationStage(null)}
        />
      )}
      {reincarnationStage === 'tree' && (
        <EternalTreeScreen
          karma={karma.karma}
          karmaEarnedThisLife={karma.karmaEarnedThisLife}
          cumulativeQi={karma.cumulativeQi}
          qiForNextKarma={karma.qiForNextKarma}
          tree={tree}
          lives={karma.lives}
          realmIndex={cultivation.realmIndex}
          onReincarnate={handleReincarnate}
        />
      )}
    </div>
    </DiscipleMergeContext.Provider>
  );
}

function App() {
  return (
    <EventQueueProvider>
      <AppInner />
    </EventQueueProvider>
  );
}

export default App;
