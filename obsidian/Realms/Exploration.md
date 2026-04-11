# Exploration

Idle activity where the player dispatches their character to traverse new territories, unlock zones, and discover points of interest. Exploration is the gateway to all other realm-based activities — a zone must be **discovered** before it can be farmed, gathered, or mined.

---

## Overview

- **Idle/automated**: assign character to an unexplored region and wait
- Completing exploration of a region **unlocks it permanently** (persists through reincarnation — TBD)
- Exploration speed scales with **Body** stat and realm tier
- Some regions require a minimum realm to enter

---

## Realm Unlock Table

| Major Realm | Region Tier Unlocked | Example Areas |
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

## Discovery Mechanics

- Each region has a **discovery progress bar** (0–100%)
- Progress accumulates over time based on the character's **Exploration Rate**
- Exploration Rate = `Body * realm_multiplier * law_bonus`
- On completion, the region unlocks its **Combat**, **Gathering**, and **Mining** sub-zones

### Discovery Events (on completion)
- Random chance to find a **Treasure Cache** (materials, pills, or artefact fragments)
- Rare chance to uncover a **Secret Manual** (new Law or Secret Technique)
- Very rare: **Ancient Site** — a permanent passive bonus location

---

## Exploration Rate Formula

```
Exploration Rate = Body * RealmMult * (1 + LawBonus)
```

| Modifier | Source |
|---|---|
| `RealmMult` | Scales with major realm index (~1.5× per major realm) |
| `LawBonus` | Wind/Space-attribute Laws grant +10–25% exploration speed |

---

## TODO

- [ ] Design region count per realm tier (suggest 3–5 per major realm)
- [ ] Define treasure cache drop tables
- [ ] Decide if exploration persists through reincarnation (permanent unlock vs. reset)
- [ ] Define "Ancient Site" passive bonuses
- [ ] Consider exploration-gated Law/Technique discovery events

---

## Related

- [[Realm Progression]]
- [[Combat]]
- [[Realms/Gathering]]
- [[Realms/Mining]]
- [[Materials]]
- [[Laws]]

---

## Claude Commands
