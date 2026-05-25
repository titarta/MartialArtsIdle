# Implementation Notes

Technical reference. Updated 2026-05-24.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 (hooks, no Redux/Context for game state) |
| Bundler | Vite |
| Mobile | Capacitor 8.3.0 |
| Persistence | localStorage only |
| Localization | EN + PT (`src/i18n/index.js`) |

## Project Structure (key files)

```
src/
├── App.jsx                      # Router, screen container, global state wiring
├── hooks/
│   ├── useCultivation.js        # Main game loop + Qi tick
│   ├── useCombat.js             # Combat loop + enemy management
│   ├── useAutoFarm.js           # Gather/mine automation
│   ├── useArtefacts.js          # Artefact equip + roll
│   ├── usePills.js              # Pill consumption + timed effects
│   ├── useQiCrystal.js          # Qi Crystal bonus
│   ├── useQiSparks.js           # Qi Spark selection + passives
│   ├── useTechniques.js         # Secret technique slots
│   ├── useReincarnationTree.js  # Eternal tree node purchases
│   ├── useReincarnationKarma.js # Karma accrual + prestige tracking
│   ├── useProducers.js          # Producer system (Cookie-Clicker idle layer)
│   ├── useUpgrades.js           # Upgrade purchases
│   └── useFeatureFlags.js       # Feature gate resolution
├── systems/
│   ├── autoFarm.js              # Gather/mine tick (MAX_OFFLINE_HOURS = 8)
│   ├── lawEngine.js             # Law stat aggregation
│   ├── save.js                  # localStorage persistence + export/import
│   └── bloodLotus.js            # Blood Lotus premium currency
├── data/
│   ├── realms.js                # 46 sub-stages across 13 major realms
│   ├── laws.js + lawUniques.js  # Law definitions + unique passives
│   ├── techniques.js            # Secret technique catalogue (60 entries)
│   ├── artefacts.js + affixPools.js + uniqueModifiers.js
│   ├── pills.js + crafting.js   # Pill definitions + recipes
│   ├── materials.js             # Herbs, ores (ORES, ORE_ITEMS)
│   ├── producers.js             # Producer definitions (idle upgrade layer)
│   ├── qiSparks.js              # Spark card pool (common/uncommon/mechanic)
│   ├── reincarnationTree.js     # 7 eternal tree nodes
│   └── featureGates.js          # Feature unlock thresholds by realm index
└── designer/                    # In-app data editor (dev tool)
```

## Game Loop Formula

```js
// src/hooks/useCultivation.js
qi += BASE_RATE                    // 1 qi/s
    × lawCultMult
    × (1 + Σ qi_speed_increased) × Π qi_speed_more
    × (focusing ? focusMult : 1)   // focusMult = qi_focus_mult stat, base 3×
    × pillQiMult × treeQiMult × selectionQiMult
    × (adBoost ? 2 × (1 + heavenlyQiMult) : 1)
    × dt
  + crystalQiBonus × dt            // Qi Crystal flat add
  + producerRate × dt              // Cookie-Clicker producer layer
```

Offline Qi: `rate × 0.20`, capped at 8 hours. Crystal flat add is **online-only**.

## Save Keys (key subset)

| Key | Contents |
|---|---|
| `mai_save` | realmIndex, qi, active law, sparks, technique slots, qiEarnedThisLife |
| `mai_producers` | `{producerId: ownedCount}` |
| `mai_upgrades` | Set of purchased upgrade IDs |
| `mai_reincarnation` | `{karma, lives, karmaEarnedThisLife}` |
| `mai_reincarnation_tree` | Set of purchased node IDs |
| `mai_qi_crystal` | `{level}` |
| `mai_inventory` | Material quantities |
| `mai_artefacts` | Equipped artefact state |

## Feature Status

| Feature | Status |
|---|---|
| Qi cultivation loop, realms, offline Qi | ✅ |
| Qi Crystal, Qi Sparks, ad boost | ✅ |
| Producer/upgrade idle layer | ✅ |
| Laws, Secret Techniques, Combat | ✅ |
| Artefacts (drop, equip, roll, sets, upgrades) | ✅ |
| Gathering, Pills, Alchemy/Production | ✅ |
| Reincarnation (karma, 7-node tree) | ✅ |
| Daily bonus, IAP/Blood Lotus, Achievements, Audio, i18n | ✅ |
| Mining UI screen | ❌ Data layer ready; hook + screen pending |
| World bosses, domain drops | ❌ Not started |

## Related

- [[Home]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Reincarnation]]
