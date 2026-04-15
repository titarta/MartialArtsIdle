# QI Crystal

A permanent cultivation upgrade on the **Home Screen** that adds flat qi/sec to the player's cultivation rate. Upgraded by consuming [[Materials#QI Stones (Cultivation Materials)|QI Stones]].

---

## Overview

- Maximum level: **10**
- Bonus per level: **+2 flat qi/sec** (additive to the BASE_RATE of 5 qi/sec)
- The bonus stacks with all other multipliers (law mult, boost mult, pill mult, etc.)

> At level 10 the crystal adds 20 flat qi/sec — quadrupling the base cultivation rate before any multipliers.

---

## Upgrade Costs

QI stones are consumed in pairs of levels per rarity tier.  
Cost formula: `ceil(10 × within^1.5)` where `within` = position within the two-level tier (1 or 2).

| Level | Material | Qty |
|---|---|---|
| 1 | Iron QI Stone 1 | 10 |
| 2 | Iron QI Stone 1 | 29 |
| 3 | Bronze QI Stone 1 | 10 |
| 4 | Bronze QI Stone 1 | 29 |
| 5 | Silver QI Stone 1 | 10 |
| 6 | Silver QI Stone 1 | 29 |
| 7 | Gold QI Stone 1 | 10 |
| 8 | Gold QI Stone 1 | 29 |
| 9 | Transcendent QI Stone 1 | 10 |
| 10 | Transcendent QI Stone 1 | 29 |

---

## Implementation Notes

- **Hook:** `src/hooks/useQiCrystal.js`
- **Persistence:** `localStorage` key `mai_qi_crystal` → `{ level }`
- **Cultivation wiring:** `useCultivation.js` exposes `crystalQiBonusRef`; `App.jsx` syncs the bonus from `useQiCrystal` into it
- **No UI yet:** Hook only. UI will be added in a future design pass.

---

## Debug Commands

Available on `window.__debug.qiCrystal` in the browser console:

```js
window.__debug.qiCrystal.getLevel()          // current crystal level
window.__debug.qiCrystal.setLevel(5)         // force level 5 (no cost check)
window.__debug.qiCrystal.upgrade()           // attempt upgrade (checks inventory)
window.__debug.qiCrystal.getCost(6)          // cost to reach level 6
window.__debug.qiCrystal.getBonus()          // current flat qi/sec bonus
```

---

## Related

- [[Materials#QI Stones (Cultivation Materials)|QI Stones]]
- [[Cultivation System]]
- [[Home]]
