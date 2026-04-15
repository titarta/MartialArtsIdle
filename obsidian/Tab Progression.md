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

> **Current design:** All gameplay tabs use the `realm` gate type with `minRealmIndex: 0`. This means all tabs are unlocked from the very start of the game (realm index 0 = Tempered Body Layer 1). The realm gate exists so future designs can raise the threshold per tab via the designer panel without code changes.

---

## Current Gate Definitions

| Tab / Feature | Gate type | Min realm index | Unlock message |
|---|---|---|---|
| Home | `always` | — | — |
| Combat | `realm` | 0 | Worlds are open. Begin your conquest. |
| Character | `realm` | 0 | Character screen unlocked. |
| Gathering | `realm` | 0 | Gathering unlocked. |
| Mining | `realm` | 0 | Mining unlocked. |
| Collection | `realm` | 0 | Collection unlocked. |
| Production | `realm` | 0 | Production unlocked. |
| Settings | `always` | — | — |
| Shop | `always` | — | — |

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
