# Combat

## Implementation Status: LIVE

Turn-based loop in `src/hooks/useCombat.js`. Player and enemy alternate
turns; the player picks the highest-priority technique whose cooldown is
ready, otherwise fires a basic attack. Turn delays are real-time gated
on sprite animation completion.

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
base    = K × (Essence + Soul + Body + artefact_flat) × arteMult × elemBonus + bonus
+ category bonus (per damage category × law-share)
+ per-pool bonus  (per pool × law-share)
+ damage_all      (whole-attack flat, no share)
× (1 + secret_technique_damage)
```

`elemBonus` only fires when `tech.element === lawElement` (and tech is
not Normal). Category / pool / damage_all flats come from artefact
affixes and law uniques (see [[Stats]] and [[Artefacts]]).

### Player Attack — Basic

When a law IS equipped:
```
base = Essence × tm.essence + Body × tm.body + Soul × tm.soul   // tm = law.typeMults
```
When NO law is equipped (legal sustained state):
```
base = (Essence + Body) / 2
```
Then in BOTH paths:
```
damage = floor( max(5, base × (1 + default_attack_damage)) )
       + damage_all flat
       × (1 if not exploit else exploit_attack_mult)
       × reincarnation tree damage multiplier
```
Fires every player turn whose ready-technique queue is empty. No
cooldown of its own.

### Player HP

```
HP = max(100, (Essence + Body) × 12 + Soul × 4)
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

- **DEF** = `body + modifiers` (artefact / pill / law-unique flats and
  multipliers all stack via the standard 5-layer formula).
- **Defend buff** — Defend-type [[Secret Techniques]] cast applies a
  `defBuff = { mult: defMult × (1 + buff_effect), attacksLeft: N }` for
  the next N enemy attacks (charge-based, NOT a wall-clock timer).
  Re-casting overwrites — no stacking.
- **Dodge buff** — Dodge-type techniques apply
  `dodgeBuff = { chance × (1 + buff_effect), attacksLeft: N }`. Each
  enemy turn rolls `Math.random() < chance`; success negates damage
  fully. Both branches consume one charge regardless of roll outcome.
  No passive dodge stat; only the buff matters today.
- Buff `N` (`buffAttacks`) is rolled at generation: Defend 2–4 hits,
  Dodge 2–4 hits. The `buff_duration` stat scales N at cast time.

---

## TODO

- [ ] Define death penalty / respawn mechanic (today: defeated → fight ends, no penalty)
- [ ] Drop-rate tuning pass once full enemy roster lands
- [ ] Wire `elem_def` / `soul_toughness` into enemy damage branching (engine already
      reads the stats; nothing routes by element category yet)

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
