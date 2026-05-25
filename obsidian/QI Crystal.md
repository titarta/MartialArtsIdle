# QI Crystal

Permanent cultivation upgrade on the **Home Screen**. Adds flat qi/s. Upgraded by consuming QI Stones from any activity.

## Mechanics

- No level cap.
- **Bonus per level L:** `+(L + 1)` flat qi/s. Cumulative at level N: `N × (N + 3) / 2` qi/s.
- Sample: Lv 1 → +2, Lv 5 → +20, Lv 10 → +65.
- Bonus stacks additively with BASE_RATE, before all multipliers. **Online only** (offline path excludes crystal).
- `n_3 Crystalline Focus` (Eternal Tree): +20% INCREASED to crystal bonus multiplier.

## Level Cost

```
required(level) = round_to_2sf(25 × level^1.30)
```
Sample: 25, 60, 105, 155, 210, 270, … (`getRequiredRefinedQi(level)` in `src/hooks/useQiCrystal.js`)

## Implementation

- Hook: `src/hooks/useQiCrystal.js`
- Persistence: `mai_qi_crystal` → `{level}`
- `App.jsx` syncs `crystal.crystalQiBonus × tree.modifiers.crystalQiBonusMult` into `cultivation.crystalQiBonusRef`

## Related

- [[Materials]]
- [[Reincarnation]]
