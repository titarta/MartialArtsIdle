# Combat

## Implementation Status: STUB

`src/screens/CombatScreen.jsx` — card grid with 3 placeholder buttons (Sparring, Tournament, Boss Fight). No logic implemented.

---

## Overview

Combat is **idle/automated** — the player assigns their character to a zone and leaves them to fight. The character earns drops.

---

## Map

- **Procedurally generated**
- Divided into **zones** (Risk-style territories)

### Zones

Each zone has:
- A **set of enemy types** that spawn
- A **power range** (enemies have a normally distributed power level)

### Player Interaction

- Assign character to a zone → they fight automatically
- Gain **drops** from killed enemies (gold, materials, XP potentially)
- **Risk of death**: if a stronger-than-expected enemy spawns (tails of the distribution), the player can die

---

## Enemy Power Distribution

Enemies in a zone have a **normally distributed** power level:
- Mean = zone difficulty
- Players need to be comfortably above the mean to farm safely
- Outliers can kill an undergeared character

---

## Income from Combat

| Zone | Reward |
|---|---|
| Body Prep zones | Gold + Materials (possibly XP) |
| Chi Foundation zones | More focused — law-relevant drops |
| Higher realms | TBD |

---

## Combat Mechanics (from stat doc)

### Attack Formula (Secret Technique)
```
Damage = K * (Essence + Soul + Body + artefact_dmg_flat) * arte_mult * elem_bonus + bonus
```

### Default Attack
- Every [[Laws|Law]] provides a default attack
- Used when no secret technique is available or on cooldown

### Combat Stats
- **DEF** = Essence + Body (combo)
- **Dodge** — increased by Dodge-type secret techniques

---

## TODO

- [ ] Define zone count and difficulty scaling
- [ ] Define enemy types per realm tier
- [ ] Define drop tables
- [ ] Define death penalty / respawn mechanic
- [ ] Define how laws affect combat beyond default attack

---

## Related

- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Items]]
- [[Materials]]
- [[Realm Progression]]

---

## Claude Commands
