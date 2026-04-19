# Stats

Complete reference for every stat in the game — what it does and what sources can change it. The [[#Modifiers|Modifiers]] section catalogues every modifier type that can exist on any stat.

---

## Stacking Types

Every modifier on every stat belongs to one of these five types. Understanding the order of operations is critical for the damage and stat formulae.

| Type | Notation | How It Applies |
|---|---|---|
| **Increased Base** | `#% increased base` | Multiplies the base value of the stat (before anything else) |
| **Base Flat** | `adds # to base` | Adds a flat amount to the base value of the stat |
| **Flat** | `+#` | Adds a flat amount after all base calculations are done |
| **Increased Value** | `#% increased` | Additive % bonus applied to the value after flat additions — all sources of this type sum together then apply once |
| **Multiplier** | `#% more` | Multiplicative — each source of this type multiplies independently; stacks multiplicatively with other `more` sources |
| **Unique** | — | Special-case modifiers with their own rules (see [[#Unique Modifiers]]) |

### Order of Operations

```
Final Value = ((Base × (1 + Σ increased_base%) + Σ base_flat) + Σ flat) × (1 + Σ increased%) × Π more_mult
```

---

## Special Resource: Qi

Qi is the raw cultivation energy. It cannot be increased directly — only its **generation speed** can be modified. It accumulates passively over time and is **spent** on realm breakthroughs.

**Generation formula:**
```
qi/sec = BASE_RATE × (1 + Σ increased_qi_speed%) × Π more_qi_speed × focus_mult (when focusing)
```

- `BASE_RATE` = 1 qi/sec (hardcoded baseline)
- `focus_mult` = the Qi Focus Multiplier stat (base 300%; can be modified)
- Qi generation speed is modified via [[Laws|Law]] cultivation speed, reincarnation talent, and pills
- Qi is **spent** on realm breakthroughs; it does not convert to primary stats

---

## Primary Stats

```
Base values: Essence = 20, Body = 20, Soul = 0
Final = ((Base × (1 + Σ increased_base%) + Σ base_flat) + Σ flat) × (1 + Σ increased%) × Π more
```

The new compound stat **`all_primary_stats`** acts as sugar — its modifiers
are folded into each of `essence` / `body` / `soul` at the top of
`computeAllStats`, so a single `+25% all_primary_stats` source benefits
every primary equally. Used by amulet (neck) artefacts.

---

### Essence

Elemental power — the cultivator's chosen element made manifest.

- **Base value:** 20.
- Drives **elemental damage** (fire/water/earth) when the active law has
  Essence-anchored `types` (multiplied by `law.typeMults.essence`).
- Sole source of **Elemental Defense** (`elem_def = essence + modifiers`).
- Always unlocked.

---

### Soul

Spiritual power — consciousness and will made tangible.

- **Base value:** 0.
- Drives **psychic damage** (spirit/void/dao) when the active law has
  Soul-anchored `types` (multiplied by `law.typeMults.soul`).
- Sole source of **Soul Toughness** (`soul_toughness = soul + modifiers`).
- Drives **Harvest Speed** (`floor(soul × 0.1) + modifiers`, min 1).
- **Locked to 0** until the [[Realm Progression#Saint|Saint]] realm
  (`SAINT_INDEX = 24`).

---

### Body

Physical power — the cultivated flesh, bones, and meridians.

- **Base value:** 20.
- Drives **physical damage** (physical/sword/fist) when the active law has
  Body-anchored `types` (multiplied by `law.typeMults.body`).
- Sole source of **Defense** (`def = body + modifiers`).
- Drives **Mining Speed** (`floor(body × 0.1) + modifiers`, min 1).
- Always unlocked.

---

## Combat Stats

---

### Health

- **Base:** `(essence + body) × 12 + soul × 4`, floored at 100.

### Physical / Elemental / Psychic Damage

The three **damage categories** — flat bonuses applied during damage
resolution (calcDamage in `src/data/techniques.js` and the basic-attack
branch in `src/hooks/useCombat.js`). Each is gated by the law's
type-pool share:

- `physical_damage` applies when the law has body-anchored types
  (physical / sword / fist).
- `elemental_damage` applies when the law has essence-anchored types
  (fire / water / earth).
- `psychic_damage` applies when the law has soul-anchored types
  (spirit / void / dao).

Per-attack contribution = `damageStats[category] × (count of category-pools / total law.types)`.

### Per-pool Damage (`dmg_<pool>`)

Nine narrower damage stats — one per pool: `dmg_physical`, `dmg_sword`,
`dmg_fist`, `dmg_fire`, `dmg_water`, `dmg_earth`, `dmg_spirit`,
`dmg_void`, `dmg_dao`. Stack on top of the category bonus, scaled by
the SAME share-math as the categories. Source-agnostic: applies to
both basic attacks and secret techniques whenever the relevant pool
is in `law.types`.

### `damage_all`

Whole-attack flat bonus; no share scaling, no source gate. Stacks on
both basic attacks and secret techniques. Aggregate-stat (rolls at
`AGGREGATE_SCALE = 0.5` of single-stat range when sourced from artefacts).

### `default_attack_damage`

Multiplier applied **only to basic attacks**, after the typeMults sum
or the no-law fallback. Stacks multiplicatively with exploit and the
reincarnation tree damage multiplier.

### `secret_technique_damage`

Multiplier applied **only to secret-technique damage** in `calcDamage`,
after the K formula. Mirrors `default_attack_damage` but for the
technique branch.

### Defense

`def = body + modifiers`. Reduces enemy attack damage via the
defense-curve formula `dmg = eAtk² / (eAtk + def)`. A live `defBuff`
multiplies it for the next N enemy attacks (charge-based, see
[[Secret Techniques]] and [[Combat]]).

### Elemental Defense

`elem_def = essence + modifiers`. Mechanically TBD — the engine reads
the stat but doesn't yet branch enemy damage by element category.

### Soul Toughness

`soul_toughness = soul + modifiers`. Mechanically TBD; locked at 0
until Saint via the `soul`-locked rule.

### Exploit Chance

Per-attack roll % (0–100) for an attack to be flagged as an exploit
hit. Base 0; rolled additively to itself when triggered.

### Exploit Attack Multiplier

Multiplier on damage when an attack is an exploit hit. Base 150%.

---

## Activity Stats

---

### Qi Generation Speed

How fast Qi accumulates per second. See [[#Special Resource Qi|Qi]] above.

- All five modifier types apply
- Focus multiplier is a separate stat (see below)

---

### Qi Focus Multiplier

The multiplier applied to Qi generation while the player is actively focusing (holding the boost button).

- **Base value:** 300%
- All five modifier types apply

---

### Harvest Speed

`harvest_speed = floor(soul × 0.1) + modifiers`, min 1. Locked at 0
while Soul is locked. Adds to BASE_GATHER_SPEED in `simulateGathering`.

### Harvest Luck

Per-cycle % chance for a primary gather drop to yield +1 quantity.
Stored decimal (0.05 = 5pp).

### Mining Speed

`mining_speed = floor(body × 0.1) + modifiers`, min 1. Adds to
BASE_MINE_SPEED in `simulateMining`.

### Mining Luck

Same shape as Harvest Luck but for mineral drops.

### Heavenly QI Multiplier

`heavenly_qi_mult` — only applies while the rewarded-ad qi boost is
live. Multiplicative bonus on the boosted qi rate (`×2 × (1 + value)`).
Stacks multiplicatively with the reincarnation tree's heavenly node
when both are present.

### Buff Effect

`buff_effect` — multiplier applied to a Defend tech's `defMult` and a
Dodge tech's `dodgeChance` **at cast time**. Doesn't touch the buff's
attack-charge count (that's `buff_duration`).

### Buff Duration

`buff_duration` — scales the `buffAttacks` count of Defend / Dodge
casts (resolved by `resolveBuffAttacks` in `useCombat`). +20% means
+20% to the cast's charge count, ceiled, min 1.

---

## Modifiers

Every stat above accepts all five stacking types. Affixes are emitted
programmatically as `(slot, stat, mod_type)` tuples — see the per-slot
allowlist in [[Artefacts]]. There is no longer a hand-curated U1–U10
"unique modifier" rule list; all unique-flavour mechanics now live in
the **Law Uniques** pool ([[Laws]]) and the artefact-uniques pool
(presentation-only today, see [[Artefacts]]).

---

## Related

- [[Primary Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Items]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Worlds/World]]
- [[Worlds/Gathering]]
- [[Worlds/Mining]]

---

## Claude Commands

> **[CONCLUDED]**
> *Commands executed (2026-04-11):*
>
> - ~~Update stacking types: Increased Base, Base Flat, Flat, Increased Value, Multiplier, Unique~~
> - ~~Clear previously generated modifier tables — modifier system is now generic (any stat can take any type)~~
> - ~~Qi reframed as generation-speed-only; cannot be increased directly~~
> - ~~Added stats: Essence, Soul, Body (primary); Elemental/Physical/Psychic Damage; Health; Defense; Elemental Defense; Soul Toughness; Exploit Chance; Exploit Attack Multiplier; Qi Generation Speed; Qi Focus Multiplier; Harvest Gathering Speed; Harvest Gathering Luck; Mining Speed; Mining Luck~~
> - ~~Unique modifier catalogue added (U1–U10)~~
>
> *Changes made:* Full rewrite of Stats.md. Old per-source modifier tables removed. New stat list with stacking type formula and order-of-operations. Generic modifier model (no per-stat source tables). Unique Modifiers table with all 10 entries.
