# Mining

A resource activity where the character is sent into a region to extract **ores, crystals, and minerals**. Like Gathering, it is focused on harvesting rather than combat — but enemies occasionally appear and interrupt work.

Mined minerals are the primary input for **Artefact Refining**, unlocked at [[Realm Progression#Emperor Realm|Emperor Realm]].

---

## Overview

- **Idle/automated**: assign character to an unlocked region → they mine ore veins continuously
- The region must first be **unlocked via** [[Worlds/World|the World map]]
- Mining speed is driven by **Body** stat
- Enemies occasionally spawn and interrupt mining — the character fights them off automatically, then resumes

---

## Ore Availability by Realm

Each region tier yields minerals of a corresponding rarity range. Lower-rarity ores remain available in higher-tier regions at reduced weight.

| Major Realm | Primary Tier | Notable Ores |
|---|---|---|
| Tempered Body | Common | Black Tortoise Iron |
| Qi Transformation | Common – Uncommon | Black Tortoise Iron, Crimson Flame Crystal |
| True Element | Uncommon | Crimson Flame Crystal |
| Separation & Reunion | Uncommon – Rare | Void Stone, Mithril Essence |
| Immortal Ascension | Rare | Mithril Essence, Deep Sea Cold Iron |
| Saint | Rare – Epic | Deep Sea Cold Iron, Star Metal Ore |
| Saint King | Epic | Star Metal Ore, Skyfire Meteorite |
| Origin Returning | Epic – Legendary | Skyfire Meteorite, Heavenly Profound Metal |
| Origin King+ | Legendary | Heavenly Profound Metal |

Cultivation Materials (Spirit Stones, Origin Crystals, etc.) can also drop as a secondary yield.

---

## Mining Mechanics

- Each region has a **Vein Richness** value that depletes as ore is extracted and recovers over time
- Yield per tick scales with Body, realm tier, Law bonuses, and current richness

```
Mine Rate = Body × RealmMult × (1 + LawBonus) × richness_factor
```

| Variable | Notes |
|---|---|
| `RealmMult` | ~1.5× per major realm |
| `LawBonus` | Earth/Metal-attribute Laws grant +10–25% mining speed |
| `richness_factor` | 0–1 based on current Vein Richness in the region |

---

## Enemy Interruptions

- Enemies spawn at a lower frequency than in World combat zones
- Cave-dwelling enemy types dominate mining zones — tend to be Body-heavy, slow, and durable
- Mining pauses while the character fights; it resumes automatically on kill
- Combat drops (gold, materials) are still earned from interrupted enemies
- If the character cannot defeat an interrupting enemy, they are expelled from the zone

---

## Vein Richness Regeneration

- Vein Richness recovers passively when not being mined
- Higher-tier veins are slower to replenish but yield higher-rarity ores
- Regen rate can be increased via upgrades (TBD — drilling formations, spiritual tools)

---

## Ore Grades

Some ores have a **refined grade** variant — a purer form required by high-tier artefact recipes. Grades are produced through a separate refining step, not mined directly.

| Base Ore | Refined Grade | Use Case |
|---|---|---|
| Black Tortoise Iron | Refined Black Tortoise Iron | Mid-tier armour base |
| Star Metal Ore | Star Metal Ingot | High-tier weapon core |
| Heavenly Profound Metal | Profound Metal Essence | Emperor-grade artefact base |

Refinement mechanic TBD.

---

## Drop Weights

| Rarity | Base Weight |
|---|---|
| Common | 60% |
| Uncommon | 25% |
| Rare | 10% |
| Epic | 4% |
| Legendary | 1% |

Weights shift toward higher tiers as realm tier advances.

---

## TODO

- [ ] Define vein richness values and regen rates per region
- [ ] Define enemy spawn frequency in Mining zones
- [ ] Design mining-specific upgrades (formations, drills)
- [ ] Map ores to artefact recipes in [[Items]]
- [ ] Define ore grade refinement mechanic
- [ ] Define Cultivation Material secondary drop rates

---

## Related

- [[Materials]]
- [[Items]]
- [[Realm Progression]]
- [[Worlds/World]]
- [[Worlds/Gathering]]
- [[Combat]]
- [[Laws]]

---

## Claude Commands
