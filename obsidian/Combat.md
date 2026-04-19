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

## Combat Mechanics

### Player Attack — Secret Technique
```
Damage = K × (Essence + Soul + Body + artefact_dmg_flat) × arte_mult × elem_bonus + bonus
```
See [[Secret Techniques]] for K table (rank × quality) and cooldowns.

### Player Attack — Basic
```
Damage = Essence + Body
```
Fires when no technique is ready. No cooldown — triggers immediately each player turn.

### Player HP
```
HP = (Essence + Body) × 12 + Soul × 4
```

### Enemy Stats
```
Enemy HP  = max(100, 150 × 1.12^region_index × enemy_hp_mult)
Enemy ATK = max(10,  (Essence + Soul + Body) × enemy_atk_mult)
```
`region_index` is the region's `minRealmIndex` (0–50 across the six worlds).
The 1.12×-per-index curve gives a ~300× HP spread from W1 R1 to W6 R4, independent of
the qi economy. Early zones always have low HP, late zones always have high HP,
regardless of the player's current power.

Enemy ATK still scales with the player's current stats — it measures danger TO this player.
`hp_mult` and `atk_mult` are per-enemy constants defined in `data/enemies.js`.

Reference HP (before `hp_mult`):

| Region | Index | Base HP |
|---|---|---|
| W1 R1 Outer Sect Training Grounds | 0  | 150   |
| W1 R5 Misty Spirit Forest         | 14 | 647   |
| W2 R1 Shattered Sky Desert        | 18 | 981   |
| W3 R1 Saint Burial Grounds        | 24 | 1 836 |
| W4 R1 Origin Qi Spring Depths     | 30 | 3 435 |
| W5 R1 Fractured Space Corridors   | 36 | 6 427 |
| W6 R1 Heaven Pillar Ascent        | 45 | 16 775 |
| W6 R4 Heaven's Core               | 51 | 31 392 |

### Enemy Damage Formula (scale-independent)
```
DEF       = (Essence + Body) × def_buff_mult
EnemyDmg  = EnemyATK² / (EnemyATK + DEF)
```
This formula is fully scale-independent: **hits-to-die depends only on enemy_atk_mult, not on absolute qi**. At `EnemyATK = DEF`, the enemy deals 50% of its raw attack. The `def_buff_mult` is 1 normally, raised by Defend-type [[Secret Techniques]].

**Reference hits-to-die** (default law, no defence buffs):

| enemy_atk_mult | Hits to die | Example enemy |
|---|---|---|
| 0.3 | ~107 | Sparring Dummy |
| 0.7 | ~27 | Outer Sect Disciple |
| 1.0 | ~16 | Wandering Beast |
| 1.4 | ~10 | Thunder Hawk |
| 1.6 | ~9 | Storm Elemental |
| 2.0 | ~7 | Blood Leviathan |
| 2.5 | ~5 | Burial Guardian |
| 4.0 | ~3 | Origin Guardian |

### Combat Stats
- **DEF** = Essence + Body (combo)
- **Dodge** — increased by Dodge-type [[Secret Techniques]]

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
