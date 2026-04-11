# Gathering

Idle activity where the player dispatches their character to collect **herbs and botanical materials** from explored regions. Gathered materials feed directly into the [[Items|Alchemy]] crafting system.

---

## Overview

- **Idle/automated**: assign character to a discovered region and gather over time
- Yields **Herbs** and **Cultivation Materials** from [[Materials]]
- Gathering speed and loot tier scale with **Soul** stat and realm tier
- A region must be **explored** before gathering is available there (see [[Realms/Exploration]])

---

## Realm Unlock Table

| Major Realm | Herb Tier Available | Notable Drops |
|---|---|---|
| Tempered Body | Common | Soul Calming Grass |
| Qi Transformation | Common–Uncommon | Soul Calming Grass, Jade Heart Flower, Netherworld Flame Mushroom |
| True Element | Uncommon | Jade Heart Flower, Netherworld Flame Mushroom |
| Separation & Reunion | Uncommon–Rare | Thousand-Year Ginseng, Blood Lotus |
| Immortal Ascension | Rare | Blood Lotus, Dragon Saliva Grass |
| Saint | Rare–Epic | Dragon Saliva Grass, Purple Cloud Vine |
| Saint King | Epic | Purple Cloud Vine |
| Origin Returning | Epic–Legendary | Purple Cloud Vine, Immortal Revival Leaf |
| Origin King+ | Legendary | Immortal Revival Leaf |

Cultivation Materials (Spirit Stones, Beast Cores, etc.) drop as secondary loot across all tiers.

---

## Gathering Mechanics

- Each region has a **Herb Density** value that slowly replenishes over time
- Gathering depletes density; it regenerates at a base rate (can be boosted with upgrades)
- Yield per tick = `Soul * RealmMult * HerbDensity * (1 + LawBonus)`

### Drop Weighting

| Rarity | Base Weight |
|---|---|
| Common | 60% |
| Uncommon | 25% |
| Rare | 10% |
| Epic | 4% |
| Legendary | 1% |

Weights shift upward as realm tier advances (lower-tier herbs phase out).

---

## Gathering Rate Formula

```
Gather Rate = Soul * RealmMult * (1 + LawBonus)
```

| Modifier | Source |
|---|---|
| `RealmMult` | ~1.5× per major realm |
| `LawBonus` | Wood/Nature-attribute Laws grant +10–25% gather speed |

---

## Herb Respawn

- Herb Density recovers at a flat rate per second (baseline)
- Upgrades (at Alchemy or Shop) can increase respawn rate
- Clearing enemies from a zone (Combat) can boost herb density temporarily

---

## TODO

- [ ] Define herb density values per region
- [ ] Define herb respawn rates and upgrade tiers
- [ ] Tie Law attribute bonuses to gather speed in implementation
- [ ] Design gathering-specific upgrades (tools, formations)
- [ ] Define which herbs are used in which pill recipes (see [[Items]])

---

## Related

- [[Materials]]
- [[Items]]
- [[Realm Progression]]
- [[Realms/Exploration]]
- [[Realms/Mining]]
- [[Laws]]

---

## Claude Commands
