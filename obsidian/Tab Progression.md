# Tab Progression

Defines when each navigation tab and feature is accessible to the player. Gates are evaluated by `useFeatureFlags` against live game state.

---

## Gate Types

| Type | Description |
|---|---|
| `always` | Always unlocked from the start |
| `realm` | Requires `realmIndex >= minRealmIndex` |
| `region_clear_any` | Player has won combat in at least one region *(legacy — no longer used)* |
| `item_any` | Inventory contains at least one item *(legacy)* |
| `item_category` | Inventory contains at least one item in `category` *(legacy)* |
| `all` | Every sub-gate must pass |
| `any` | At least one sub-gate must pass |

> **Current design:** Gameplay tabs unlock in tempo with realm progression. Early gameplay is pure cultivation (Home + Qi); combat and transmutation open at the QI Crystal realm; mining + refining come next; gathering + alchemy open at Qi Transformation. Thresholds are editable in the Designer panel without code changes.

---

## Current Gate Definitions

| Tab / Feature | Gate | Condition | Unlock message |
|---|---|---|---|
| Home | `always` | — | — |
| Combat | `realm` 3 | Tempered Body L4 | Worlds are open. Begin your conquest. |
| Character | `always` | — | — |
| Mining | `realm` 7 | Tempered Body L8 | Mining unlocked. |
| Gathering | `realm` 10 | Qi Transformation Early | Gathering unlocked. |
| Collection | `always` | — | — |
| Production | `any` of item_category herbs / minerals / bloodCores | Player owns any crafting material (gathered, mined, or combat-dropped) | Production unlocked. Craft pills and gear. |
| Settings | `always` | — | — |
| Shop | `always` | — | — |
| QI Crystal | `realm` 3 | Tempered Body L4 | The Key Crystal awakens. |

### Production Sub-tabs

Each Production sub-tab is gated individually and mirrors the activity that feeds it.

| Sub-tab | Gate | Paired activity |
|---|---|---|
| Transmutation | same as Production (`any` of crafting materials) | Combat (modifies artefact / technique / law drops) |
| Refining | `realm` 7 | Mining (ores → artefacts, techniques, laws) |
| Alchemy | `realm` 10 | Gathering (herbs → pills) |

---

## World Unlocking

Worlds (combat zones) use their own separate unlock logic in `featureGates.js`:

- **World 1** — Always open
- **World N (N ≥ 2)** — Requires:
  1. `realmIndex >= world.minRealmIndex` (or 1 for World 2)
  2. The final region of the **previous world** has been cleared in combat

---

## Region Sub-tabs

Within the Worlds screen, sub-tabs (Combat / Gathering / Mining) inherit their lock state from the corresponding top-level feature gate (`gathering`, `mining`). Since both currently start at realm 0, sub-tabs are always accessible once the player opens Worlds.

---

## Adjusting via Designer Panel

Open `?designer=1` → **Feature Gates** to change any gate's type and minRealmIndex without modifying source code. Changes persist in `src/data/config/featureGates.override.json`.

---

## Implementation

- **File:** `src/data/featureGates.js`
- **Hook:** `src/hooks/useFeatureFlags.js`
- **Consumer:** `NavBar` — receives `isUnlocked(tabId)` and `getHint(tabId)` props

---

## Related

- [[Realm Progression]]
- [[Combat]]
- [[Worlds/Gathering]]
- [[Worlds/Mining]]
