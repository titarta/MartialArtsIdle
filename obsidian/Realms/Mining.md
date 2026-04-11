# Mining

Idle activity where the player dispatches their character to extract **ores, crystals, and minerals** from explored regions. Mined materials are the primary input for **Artefact Refining**.

---

## Overview

- **Idle/automated**: assign character to a discovered region and mine over time
- Yields **Minerals** and **Cultivation Materials** from [[Materials]]
- Mining speed and ore tier scale with **Body** stat and realm tier
- A region must be **explored** before mining is available there (see [[Realms/Exploration]])

---

## Realm Unlock Table

| Major Realm | Ore Tier Available | Notable Drops |
|---|---|---|
| Tempered Body | Common | Black Tortoise Iron |
| Qi Transformation | Common–Uncommon | Black Tortoise Iron, Crimson Flame Crystal |
| True Element | Uncommon | Crimson Flame Crystal |
| Separation & Reunion | Uncommon–Rare | Void Stone, Mithril Essence |
| Immortal Ascension | Rare | Mithril Essence, Deep Sea Cold Iron |
| Saint | Rare–Epic | Deep Sea Cold Iron, Star Metal Ore |
| Saint King | Epic | Star Metal Ore, Skyfire Meteorite |
| Origin Returning | Epic–Legendary | Skyfire Meteorite, Heavenly Profound Metal |
| Origin King+ | Legendary | Heavenly Profound Metal |

Cultivation Materials (Spirit Stones, Origin Crystals, etc.) drop as secondary loot across all tiers.

---

## Mining Mechanics

- Each region has a **Vein Richness** value that slowly replenishes over time
- Mining depletes vein richness; it regenerates at a base rate
- Yield per tick = `Body * RealmMult * VeinRichness * (1 + LawBonus)`

### Drop Weighting

| Rarity | Base Weight |
|---|---|
| Common | 60% |
| Uncommon | 25% |
| Rare | 10% |
| Epic | 4% |
| Legendary | 1% |

Weights shift upward as realm tier advances (lower-tier ores phase out).

---

## Mining Rate Formula

```
Mine Rate = Body * RealmMult * (1 + LawBonus)
```

| Modifier | Source |
|---|---|
| `RealmMult` | ~1.5× per major realm |
| `LawBonus` | Earth/Metal-attribute Laws grant +10–25% mining speed |

---

## Vein Respawn

- Vein Richness regenerates at a flat rate per second (baseline)
- Upgrades (at Artefact Refining or Shop) can increase respawn rate
- Deeper veins (higher realm zones) are slower to replenish but yield richer ores

---

## Ore Grades

Some minerals have a **grade** variant that represents a purer extraction:

| Base Ore | Grade Up | Unlock Condition |
|---|---|---|
| Black Tortoise Iron | Refined Black Tortoise Iron | TBD (upgrade/formation) |
| Star Metal Ore | Star Metal Ingot | TBD |
| Heavenly Profound Metal | Profound Metal Essence | TBD |

Grades may be required by high-tier artefact refining recipes.

---

## TODO

- [ ] Define vein richness values per region
- [ ] Define vein respawn rates and upgrade tiers
- [ ] Tie Law attribute bonuses to mining speed in implementation
- [ ] Design mining-specific upgrades (tools, formations, drills)
- [ ] Define which ores are used in which artefact recipes (see [[Items]])
- [ ] Spec out ore grade refinement system

---

## Related

- [[Materials]]
- [[Items]]
- [[Realm Progression]]
- [[Realms/Exploration]]
- [[Realms/Gathering]]
- [[Laws]]

---

## Claude Commands
