# Implementation Notes

Technical details of the current codebase. Updated 2026-05-20.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 (hooks only, no Redux/Context for game state) |
| Bundler | Vite |
| Mobile | Capacitor 8.3.0 |
| Persistence | localStorage only (no backend) |
| Localization | EN + PT (src/i18n/index.js) |

---

## Project Structure

```
src/
├── App.jsx                         # Main router, screen container, global state wiring
├── main.jsx                        # Entry point
├── components/
│   ├── NavBar.jsx                  # Bottom tab bar
│   ├── RealmProgressBar.jsx        # Vertical Qi progress indicator
│   ├── SpriteAnimator.jsx          # Sprite sheet animation engine
│   ├── VFXLayer.jsx                # Particle / VFX system
│   ├── ActiveSparksBar.jsx         # Active Qi Sparks display
│   ├── QiSparkChoiceModal.jsx      # Spark choice on breakthrough
│   ├── SelectionModal.jsx          # Selection event UI
│   ├── TechniqueSlotModal.jsx      # Technique slot management
│   ├── GearSlotModal.jsx           # Artefact gear slot UI
│   ├── ArtefactTooltip.jsx         # Artefact detail popup
│   ├── EnemyTooltip.jsx            # Enemy stat popup
│   ├── DailyBonusModal.jsx         # Daily login reward modal
│   ├── DailyBonusWidget.jsx        # Daily bonus HUD widget
│   ├── JourneyModal.jsx            # Journey / narrative modal
│   ├── ReincarnationModal.jsx      # Reincarnation confirm + preview
│   ├── ToastStack.jsx              # In-game notification toasts
│   ├── LockTooltip.jsx             # Feature gate lock tooltip
│   └── ItemModal.jsx               # Item detail popup
├── screens/
│   ├── HomeScreen.jsx              # Cultivation UI + character display — IMPLEMENTED
│   ├── CultivationScreen.jsx       # Meditation room / law detail — IMPLEMENTED
│   ├── CombatScreen.jsx            # Combat zones + enemy loop — IMPLEMENTED
│   ├── WorldsScreen.jsx            # Gather + Mine sub-tabs — IMPLEMENTED (Gather); Mining data only, no active screen
│   ├── CharacterScreen.jsx         # Character / gear / artefacts — IMPLEMENTED
│   ├── ProductionScreen.jsx        # Alchemy + crafting — IMPLEMENTED
│   ├── ReincarnationScreen.jsx     # Prestige tree + karma — IMPLEMENTED
│   ├── CollectionScreen.jsx        # Achievements + collection — IMPLEMENTED
│   ├── BuildTab.jsx                # Build / artefact assembly — IMPLEMENTED
│   ├── StatsTab.jsx                # Full stat display — IMPLEMENTED
│   └── SettingsScreen.jsx          # Settings (audio, graphics, save) — IMPLEMENTED
├── hooks/
│   ├── useCultivation.js           # Main game loop + Qi cultivation
│   ├── useCombat.js                # Combat loop + enemy management
│   ├── useAutoFarm.js              # Gather/mine automation driver
│   ├── useArtefacts.js             # Artefact equip + roll
│   ├── usePills.js                 # Pill consumption + timed effects
│   ├── useQiCrystal.js             # QI Crystal bonus (flat Qi/s add)
│   ├── useQiSparks.js              # Qi Spark selection + passive effects
│   ├── useTechniques.js            # Secret technique slots + active effects
│   ├── useReincarnationTree.js     # Eternal tree node purchases
│   ├── useReincarnationKarma.js    # Karma accrual + prestige tracking
│   ├── useDailyBonus.js            # Daily login reward
│   ├── useLawOffers.js             # Law discovery / offer rotation
│   ├── useInventory.js             # Inventory CRUD
│   ├── useClearedRegions.js        # Combat region unlock tracking
│   ├── useFeatureFlags.js          # Feature gate resolution
│   ├── useProducers.js             # Producer system
│   ├── useUpgrades.js              # Upgrade purchases
│   ├── useAchievements.js          # Achievement tracking
│   └── useNotifications.js         # In-app notification queue
├── systems/
│   ├── autoFarm.js                 # Gather/mine tick engine (shared); MAX_OFFLINE_HOURS = 8
│   ├── lawEngine.js                # Law stat aggregation
│   ├── bloodLotus.js               # Blood Lotus premium currency
│   ├── dailyBonus.js               # Daily bonus computation
│   ├── save.js                     # localStorage persistence + export/import
│   └── graphics.js                 # Graphics quality settings
├── data/
│   ├── realms.js                   # 46 sub-stages across 13 major realms
│   ├── laws.js                     # Law definitions (element, rarity, cult_speed_mult, typeMults)
│   ├── lawUniques.js               # Law-specific unique passives
│   ├── techniques.js               # Secret technique catalogue
│   ├── techniqueDrops.js           # Technique drop tables by region
│   ├── artefacts.js                # Artefact base definitions
│   ├── artefactSets.js             # Set bonus definitions
│   ├── artefactUpgrades.js         # Artefact upgrade paths
│   ├── artefactDrops.js            # Drop tables by region
│   ├── artefactNames.js            # Procedural artefact name parts
│   ├── affixDisplay.js             # Affix tooltip formatting
│   ├── affixPools.js               # Affix pool definitions
│   ├── uniqueModifiers.js          # Unique modifier pool
│   ├── pills.js                    # Pill definitions (effect, duration, cost)
│   ├── materials.js                # Herbs, ores (ORES, ORE_ITEMS, getMineCost, mineralForRarity)
│   ├── crafting.js                 # Crafting recipes
│   ├── elements.js                 # Element definitions
│   ├── stats.js                    # Stat definitions
│   ├── featureGates.js             # Feature unlock thresholds by realm index
│   ├── worlds.js                   # World/region definitions (TIER_MINERALS)
│   ├── enemies.js (+ i18n)         # Enemy definitions, stat profiles, technique pools
│   └── reincarnationTree.js        # Eternal tree node definitions
├── iap/
│   ├── iapService.js               # IAP purchase flow
│   └── useIAP.js                   # IAP React hook
├── ads/
│   ├── adService.js                # Ad provider abstraction
│   ├── useRewardedAd.js            # Rewarded ad hook
│   └── providers/                  # AdMob, IMA, Mock
├── audio/
│   ├── index.js                    # Audio system
│   └── useAudio.js                 # Audio hook
├── i18n/
│   └── index.js                    # EN / PT locale strings
└── designer/                       # In-app data editor (dev tool, not shipped to players)
    ├── Designer.jsx
    └── categories/                 # Per-data-type editors (Laws, Pills, Artefacts, etc.)
```

---

## Game Loop (`src/hooks/useCultivation.js`)

```js
// requestAnimationFrame with delta-time — frame-rate independent
qi += BASE_RATE
    × lawCultMult
    × (1 + Σ qi_speed_increased) × Π qi_speed_more
    × (focusing ? focusMult : 1)          // focusMult = qi_focus_mult stat, base 3×
    × pillQiMult × treeQiMult × selectionQiMult
    × (adBoost ? 2 × (1 + heavenlyQiMult) × treeHeavenlyMult : 1)
    × dt
  + crystalQiBonus × dt                   // QI Crystal flat add (level × 2)
```

Offline Qi: `rate × OFFLINE_QI_MULTIPLIER (0.20)`, capped at `MAX_OFFLINE_HOURS = 8`.

Breakthrough is **automatic**: when `qi >= cost`, realm increments and cost is deducted.

---

## Save System (`src/systems/save.js`)

Auto-saves every 2 seconds. Export/import via base64 (`btoa`/`atob`). Settings screen has Save / Export / Import / Wipe.

Key `localStorage` keys (non-exhaustive):

| Key | Contents |
|---|---|
| `mai_save` | realmIndex, qi, active law, sparks, technique slots |
| `mai_inventory` | Material quantities by ID |
| `mai_artefacts` | Equipped artefact state |
| `mai_reinc` | Karma, eternal tree purchases |
| `mai_combat` | Cleared regions, current zone |
| `mai_dailyBonus` | Last claim timestamp |

---

## Feature Gates (`src/data/featureGates.js`)

Tabs and features unlock progressively by realm index. The gate list controls what the player sees at each stage of progression, preventing the UI from being overwhelming at the start.

---

## Implementation Status by Layer

### Layer 1 — Qi Cultivation Core ✅ DONE

| Feature | File | Status |
|---|---|---|
| Qi cultivation loop | `hooks/useCultivation.js` | ✅ |
| Realm progression (46 sub-stages) | `data/realms.js`, `components/RealmProgressBar.jsx` | ✅ |
| Focused cultivation (hold-to-boost) | `hooks/useCultivation.js` | ✅ |
| Offline Qi (20%, 8h cap) | `hooks/useCultivation.js`, `systems/autoFarm.js` | ✅ |
| QI Crystal flat bonus | `hooks/useQiCrystal.js`, `components/CrystalFeedModal.jsx` | ✅ |
| Qi Sparks (breakthrough choices) | `hooks/useQiSparks.js`, `components/QiSparkChoiceModal.jsx` | ✅ |
| Selection events | `components/SelectionModal.jsx` | ✅ |
| Ad-boosted Qi | `ads/useRewardedAd.js`, `ads/adService.js` | ✅ |
| Feature gates | `data/featureGates.js`, `hooks/useFeatureFlags.js` | ✅ |

### Layer 2 — Combat / Techniques / Laws ✅ LARGELY DONE

| Feature | File | Status |
|---|---|---|
| Laws (element, rarity, cult_speed_mult, typeMults) | `data/laws.js`, `data/lawUniques.js`, `systems/lawEngine.js` | ✅ |
| Law discovery + offers | `hooks/useLawOffers.js` | ✅ |
| Secret Techniques | `data/techniques.js`, `hooks/useTechniques.js`, `components/TechniqueSlotModal.jsx` | ✅ |
| Technique drops | `data/techniqueDrops.js` | ✅ |
| Combat loop + enemies | `hooks/useCombat.js`, `screens/CombatScreen.jsx` | ✅ |
| Enemy definitions | `data/enemies.js` + i18n | ✅ |
| Artefacts (drop, equip, roll) | `data/artefacts.js`, `hooks/useArtefacts.js` | ✅ |
| Artefact sets + upgrades | `data/artefactSets.js`, `data/artefactUpgrades.js` | ✅ |
| Unique modifiers | `data/uniqueModifiers.js`, `data/affixPools.js` | ✅ |
| Primary stats (Essence/Soul/Body) | `data/stats.js` | ⚠️ Data defined; some stats are placeholder / not fully wired into formulas |
| World bosses | — | ❌ Not started |
| Domain drops | — | ❌ Not started |

### Layer 3 — Harvesting / Alchemy ✅ LARGELY DONE

| Feature | File | Status |
|---|---|---|
| Gathering (idle herb collection) | `systems/autoFarm.js`, `hooks/useAutoFarm.js` | ✅ |
| Pills (crafting + timed effects) | `data/pills.js`, `hooks/usePills.js`, `components/PillDrawer.jsx` | ✅ |
| Crafting recipes | `data/crafting.js` | ✅ |
| Production screen (alchemy UI) | `screens/ProductionScreen.jsx` | ✅ |
| Material definitions (herbs) | `data/materials.js` | ✅ |
| Pill DR curve | `hooks/usePills.js` | ⚠️ See [[Proposals/Combat Tuning — DR Curve + Simulator]] |

### Layer 4 — Mining / Items ⚠️ PARTIAL

| Feature | File | Status |
|---|---|---|
| Ore data (ORES, ORE_ITEMS, getMineCost, mineralForRarity) | `data/materials.js` | ✅ |
| World region mineral mapping (TIER_MINERALS) | `data/worlds.js` | ✅ |
| Mining tick engine | `systems/autoFarm.js` | ⚠️ Engine is shared with gather; mining path may be partial |
| Mining UI screen | — | ❌ No dedicated screen — WorldsScreen shows Gather tab only |
| Mining hook | — | ❌ No `useMining.js`; autoFarm handles gather only |
| Artefact refinement (ore → artefact material) | — | ❌ Not started |

### Reincarnation ✅ CORE DONE

| Feature | File | Status |
|---|---|---|
| Karma accrual | `hooks/useReincarnationKarma.js` | ✅ |
| Eternal tree | `data/reincarnationTree.js`, `hooks/useReincarnationTree.js` | ✅ |
| Reincarnation modal + screen | `components/ReincarnationModal.jsx`, `screens/ReincarnationScreen.jsx` | ✅ |
| Wipe rules (what carries over) | `hooks/useCultivation.js` | ✅ |

### Infrastructure ✅ DONE

| Feature | File | Status |
|---|---|---|
| Daily login bonus | `systems/dailyBonus.js`, `hooks/useDailyBonus.js` | ✅ |
| IAP + Blood Lotus shop | `iap/iapService.js`, `systems/bloodLotus.js` | ✅ |
| Achievements | `hooks/useAchievements.js` | ✅ |
| Notifications | `hooks/useNotifications.js` | ✅ |
| Audio | `audio/index.js`, `audio/useAudio.js` | ✅ |
| EN/PT localization | `i18n/index.js` | ✅ |
| In-app designer (dev tool) | `designer/` | ✅ |

---

## Not Yet Started

| Feature | Notes |
|---|---|
| Mining UI screen | Data layer ready; hook + screen pending |
| World bosses | Planned for Layer 2 expansion |
| Domain drops | Planned for Layer 2 expansion |
| Active play content | See [[Proposals/Early Game Hook — Engagement Pass]] |
| Return-visit signal | Day-N content hooks not designed yet |

---

## Color Palette (`src/index.css`)

| Token | Value | Usage |
|---|---|---|
| Background | `#1a1a2e` → `#0f3460` | Page gradient |
| Card BG | `#0f3460` | UI cards |
| Accent | `#e94560` | Buttons, highlights |
| Gold | `#f5c842` | Currency, special text |
| Text primary | `#eee` | Main text |
| Text secondary | `#aaa` | Subtitles |
| Text muted | `#777` | Disabled |
| Border | `#2a2a4a` | Card borders |

---

## Related

- [[Home]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Laws]]
- [[Combat]]
- [[Worlds/Gathering]]
- [[Worlds/Mining]]
- [[Reincarnation]]

---

## Claude Commands
