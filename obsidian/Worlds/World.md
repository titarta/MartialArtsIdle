# World

The main activity area. The world is a map of regions that unlock progressively as the player advances through realms. Each region is a **combat zone** — the player assigns their character to a region and they fight automatically, earning gold, materials, and drops.

Unlocking a region also makes it available for [[Worlds/Gathering|Gathering]] and [[Worlds/Mining|Mining]].

---

## Overview

- **Idle/automated**: assign character to a region → they fight and loot continuously
- Combat runs via [[Combat]] mechanics (auto-attack + equipped [[Secret Techniques]])
- Enemies scale with the region's power tier — the player needs to comfortably exceed the zone mean to farm safely
- Regions must be **unlocked** before Gathering and Mining are available there

---

## Region Tiers

Each major realm unlocks a new tier of regions. Within a tier there are multiple named regions with increasing difficulty.

| Major Realm | Region Tier | Example Regions |
|---|---|---|
| Tempered Body | Mortal Lands | Outer Sect Training Grounds, Borderland Wilds |
| Qi Transformation | Spirit Wilds | Misty Spirit Forest, Qi-Vein Ravines |
| True Element | Inner Sect Zones | Heaven's Edge Peak, Thunderstorm Plateau |
| Separation & Reunion | Outer World Frontiers | Shattered Sky Desert, Demon Beast Plains |
| Immortal Ascension | Ancient Ruins | Sunken Immortal City, Blood Sea Periphery |
| Saint | Forbidden Lands | Saint Burial Grounds, Primal Qi Wastes |
| Saint King | Deep Forbidden Zones | Void Rift Expanse, Nine-Death Mountain Range |
| Origin Returning | Origin Veins | Origin Qi Spring Depths, World Root Caverns |
| Origin King | Ancient Beast Territory | Primordial Forest Core, Heaven Beast Sanctuary |
| Void King | Void Rifts | Fractured Space Corridors, Void Sea Shores |
| Dao Source | Dao Grounds | Dao Inscription Ruins, Source Peak Summits |
| Emperor Realm | Emperor Domains | Ancient Emperor Tomb, Heaven Sword Ridge |
| Open Heaven | Cosmic Zones | Star Sea Approaches, Heaven Pillar Ascent |

---

## Region Unlock

- Reaching the required major realm automatically unlocks the first region of that tier
- Further regions within a tier are unlocked by clearing the previous one (killing a set number of enemies or a boss — TBD)
- Once unlocked, a region stays unlocked permanently (persists through [[Reincarnation]] — TBD)

---

## Combat in a Region

- Enemies spawn continuously while the character is assigned
- Each enemy has a **power level** drawn from a normal distribution centred on the region's difficulty rating
- On enemy death: gold drop + chance of [[Materials]] drop + rare chance of [[Items]] (pills, artefact fragments)
- If an outlier enemy is significantly stronger than the character, the character can **die** → sent back to the last safe region

---

## First-Unlock Events

When a region is unlocked for the first time:

| Event | Chance | Reward |
|---|---|---|
| Treasure Cache | Moderate | Random materials or pills |
| Secret Manual | Rare | New Law or Secret Technique scroll |
| Ancient Site | Very rare | Permanent passive bonus tied to the region |

---

## TODO

- [ ] Define region count per tier (suggest 3–5 per major realm)
- [ ] Define enemy types and power distributions per tier
- [ ] Define boss unlock / region clear condition
- [ ] Define drop tables per region tier (gold, materials, items)
- [ ] Decide if region unlocks persist through reincarnation
- [ ] Define death penalty (loss of run progress? respawn cost?)
- [ ] Define Ancient Site passive bonuses

---

## Related

- [[Combat]]
- [[Realm Progression]]
- [[Worlds/Gathering]]
- [[Worlds/Mining]]
- [[Materials]]
- [[Items]]
- [[Laws]]
- [[Secret Techniques]]

---

## Claude Commands
