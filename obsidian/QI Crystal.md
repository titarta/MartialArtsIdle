# QI Crystal

A permanent cultivation upgrade on the **Home Screen** that adds flat qi/sec to the player's cultivation rate. Upgraded by consuming [[Materials#QI Stones (Cultivation Materials)|QI Stones]].

---

## Overview

- **No level cap.** Level scales infinitely; cost grows with the level curve below.
- Bonus per level: **+2 flat qi/sec** (additive to the BASE_RATE of 1 qi/sec).
- The bonus stacks with all other multipliers (law mult, boost mult, pill mult, etc.).

---

## Refined-QI Curve

The crystal is fed QI stones, each carrying a refined-QI value. Levelling
auto-triggers the moment accumulated refined QI crosses the next-level
threshold, and any overflow rolls into the next bar.

```
required(level) = round_to_2sf( 50 × level^1.30 )
```

The exponent was lowered from 1.55 → 1.30 to keep late-level upgrades
within reach during normal play. Sample progression: 50, 120, 210, 310,
420, 540, 660, 790, 930, 1100, …

Authoritative implementation: `getRequiredRefinedQi(level)` in
[src/hooks/useQiCrystal.js](../src/hooks/useQiCrystal.js).

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
