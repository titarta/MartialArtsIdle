# Cultivation System

The player gains Qi over time, progressing through **realms** and **sub-stages** via automatic **breakthroughs**.

## Cultivation Identity = Laws

Laws define the cultivation type. Each law has: element, rarity, `cultivation_speed_mult`, primary-stat typeMults, unique passives, and pool-based damage type bonuses. See [[Realm Progression]] for realm list and costs.

## Qi Rate

| Mode | Rate |
|---|---|
| Passive (idle) | `BASE_RATE = 1` qi/s |
| Focused (hold) | `BASE_RATE × focusMult` (base 3×; modifiable by artefacts, pills, law uniques, sparks) |
| Offline | Online rate × 0.20, capped at 8 hours |

```js
// src/hooks/useCultivation.js
qi += BASE_RATE
    × lawCultMult
    × (1 + Σ qi_speed_increased) × Π qi_speed_more
    × (focusing ? focusMult : 1)
    × pillQiMult × treeQiMult × selectionQiMult
    × (adBoost ? 2 × (1 + heavenlyQiMult) : 1)
    × dt
  + crystalQiBonus × dt    // Qi Crystal flat add (online only)
  + producerRate × dt      // Producer idle layer
```

## Breakthroughs

Automatic: when `qi >= cost`, realm increments and cost is deducted. Major-realm transitions require a minimum sustained qi/s rate (see [[Realm Progression#Major-Realm Breakthrough Gate]]).

## Reincarnation

On reincarnation the player's cultivation resets. Karma and the Eternal Tree persist. See [[Reincarnation]].

## Related

- [[Realm Progression]]
- [[Reincarnation]]
- [[QI Crystal]]
