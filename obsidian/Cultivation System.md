# Cultivation System

## Overview

The player cultivates (gains Qi/energy) over time, progressing through **realms** and **sub-realms** via **breakthroughs**.

## Cultivation Types

Types are **procedurally generated** — found via books in the world.

### Variants per Cultivation Type

| Property | Description |
|---|---|
| **Element** | Fire, Water, Stone, Air, Metal, Wood, Normal, Ice (possibly combinations at higher realms) |
| **Tier Range** | Iron, Bronze, Silver, Gold, Transcendent |
| **Cultivation Speed** | How fast Qi accumulates |
| **Affinity Amount** | Bonus resonance with element |
| **Artefact Bonus** | Bonus for specific artefact types |
| **Strong Base** | Raw stat multiplier |
| **Unique Passives** | Special effects (TBD) |

## Gaining Qi

- Qi accumulates passively over time (idle)
- Cultivation speed affected by current cultivation type and stats
- Meditation room UI shows current law + cultivation type

### Implemented: Qi Rates

| Mode | Rate |
|---|---|
| Passive (idle) | 5 qi / second |
| Boosted (hold button) | 15 qi / second (3× multiplier) |

The game loop runs via `requestAnimationFrame` with delta-time so rates are frame-rate independent.

```js
// src/hooks/useCultivation.js
BASE_RATE = 1        // qi/sec
BOOST_MULTIPLIER = 3 // 3x when holding boost button
qi += BASE_RATE * (boosted ? BOOST_MULTIPLIER : 1) * dt
```

## Breakthroughs

- Breakthrough is **automatic** — when `qi >= cost`, realm increments and cost is deducted
- Each major realm has **sub-realms** (stages) — design TBD, currently realms are flat
- See [[Realm Progression]] for current realm list and costs

## Reincarnation Gains

On reincarnation, the player carries over:
- **Element affinity** (mental and physical)
- **Talent**
- At higher realms: **starting cultivation boost**

## Related

- [[Primary Stats]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Laws]]
- [[Secret Techniques]]

---

## Claude Commands
