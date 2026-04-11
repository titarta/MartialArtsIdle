# Gathering

A resource activity where the character is sent into a region to collect **herbs and botanical materials**. Unlike pure combat zones, Gathering is focused on harvest — but enemies occasionally appear and must be dealt with before work can resume.

Gathered herbs feed into the [[Items|Alchemy]] system for pill crafting.

---

## Overview

- **Idle/automated**: assign character to an unlocked region → they gather herbs continuously
- The region must first be **unlocked via** [[Worlds/World|the World map]]
- Gathering speed is driven by **Soul** stat
- Enemies occasionally spawn and interrupt gathering — the character fights them off automatically, then resumes

---

## Herb Availability by Realm

Each region tier yields herbs of a corresponding rarity range. Lower-rarity herbs remain available in higher-tier regions at reduced weight.

| Major Realm | Primary Tier | Notable Herbs |
|---|---|---|
| Tempered Body | Common | Soul Calming Grass |
| Qi Transformation | Common – Uncommon | Soul Calming Grass, Jade Heart Flower, Netherworld Flame Mushroom |
| True Element | Uncommon | Jade Heart Flower, Netherworld Flame Mushroom |
| Separation & Reunion | Uncommon – Rare | Thousand-Year Ginseng, Blood Lotus |
| Immortal Ascension | Rare | Blood Lotus, Dragon Saliva Grass |
| Saint | Rare – Epic | Dragon Saliva Grass, Purple Cloud Vine |
| Saint King | Epic | Purple Cloud Vine |
| Origin Returning | Epic – Legendary | Purple Cloud Vine, Immortal Revival Leaf |
| Origin King+ | Legendary | Immortal Revival Leaf |

Cultivation Materials (Spirit Stones, Beast Cores, etc.) can also drop as a secondary yield.

---

## Gathering Mechanics

- Each region has a **Herb Density** value that depletes as herbs are gathered and recovers over time
- Yield per tick scales with Soul, realm tier, Law bonuses, and current density

```
Gather Rate = Soul × RealmMult × (1 + LawBonus) × density_factor
```

| Variable | Notes |
|---|---|
| `RealmMult` | ~1.5× per major realm |
| `LawBonus` | Wood/Nature-attribute Laws grant +10–25% gather speed |
| `density_factor` | 0–1 based on current Herb Density in the region |

---

## Enemy Interruptions

- Enemies spawn at a lower frequency than in World combat zones
- They are drawn from the lower end of the region's power distribution (not the hardest the zone can produce)
- Gathering pauses while the character fights; it resumes automatically on kill
- Combat drops (gold, materials) are still earned from interrupted enemies
- If the character cannot defeat an interrupting enemy, they are expelled from the zone

---

## Herb Density Regeneration

- Herb Density recovers passively when not being gathered
- Fully depleted regions still allow gathering but at near-zero yield until density recovers
- Regen rate can be increased via upgrades (TBD — formations, spiritual tools)

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

- [ ] Define herb density values and regen rates per region
- [ ] Define enemy spawn frequency in Gathering zones
- [ ] Design gathering-specific upgrades (formation arrays, spiritual tools)
- [ ] Map herbs to pill recipes in [[Items]]
- [ ] Define Cultivation Material secondary drop rates

---

## Related

- [[Materials]]
- [[Items]]
- [[Realm Progression]]
- [[Worlds/World]]
- [[Worlds/Mining]]
- [[Combat]]
- [[Laws]]

---

## Claude Commands
