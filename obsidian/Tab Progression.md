# Tab Progression

Defines when each tab unlocks. Gates evaluated by `useFeatureFlags` against live state. Thresholds editable in Designer panel without code changes.

---

## Current Gate Definitions

| Tab / Feature | Gate | Condition |
|---|---|---|
| Home | always | — |
| Character | always | — |
| Collection | always | — |
| Settings | always | — |
| Shop | always | — |
| QI Crystal | realm ≥ 3 | Tempered Body L4 |
| Combat | realm ≥ 3 | Tempered Body L4 |
| Mining | realm ≥ 7 | Tempered Body L8 |
| Gathering | realm ≥ 7 | Tempered Body L8 |
| Production | any crafting material in inventory | After first gather/mine/combat drop |

### Production Sub-tabs

| Sub-tab | Gate |
|---|---|
| Transmutation | same as Production |
| Refining | realm ≥ 7 |
| Alchemy | first herb collected |

---

## World Unlocking

- **World 1** — always open
- **World N (N ≥ 2)** — requires `realmIndex >= world.minRealmIndex` AND final region of previous world cleared

---

## Implementation

- `src/data/featureGates.js` — gate definitions
- `src/hooks/useFeatureFlags.js` — evaluator
- `NavBar` — consumes `isUnlocked(tabId)` and `getHint(tabId)`

---

## Related

- [[Realm Progression]]
- [[Combat]]
