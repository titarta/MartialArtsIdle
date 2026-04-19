# Artefacts

Mechanical design for all equippable artefacts. For lore names and slot descriptions see [[Items]]. For modifier stacking rules see [[Stats]]. For crafting and refining operations see [[Crafting]].

---

## Slots

Eight equipment slots total: one **Weapon**, six **Armour** pieces, and one **Ring** slot.

| Slot | Role |
|---|---|
| **Weapon** | Damage — every damage stat lives here exclusively |
| **Head** | Defensive (HP / Def / Elem Def / Soul Tough) + Soul |
| **Body** | Defensive + Body |
| **Hands** | Offensive utility (exploit + per-pool luck) + activity QoL |
| **Waist** | Defensive + Essence |
| **Feet** | Defensive + activity speed (qi, harvest, mining) + exploit |
| **Neck** | Primary stats + `all_primary_stats` + `buff_effect` |
| **Ring** | Pure utility — qi/s, focus mult, harvest/mining speed/luck, heavenly_qi_mult |

---

## Quality & Affix Count

Every artefact has the same fixed slot layout: **2 Iron slots + 1 per higher quality** (so a Transcendent artefact has 6 total slots). Quality gates which slots are unlocked — an Iron item only has its 2 Iron slots, a Silver item has 2 Iron + 1 Bronze + 1 Silver, etc.

| Quality | Total slots | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|---|
| Iron | 2 | 2 | — | — | — | — |
| Bronze | 3 | 2 | 1 | — | — | — |
| Silver | 4 | 2 | 1 | 1 | — | — |
| Gold | 5 | 2 | 1 | 1 | 1 | — |
| Transcendent | 6 | 2 | 1 | 1 | 1 | 1 |

Authoritative constant: `ARTEFACT_TIER_SLOTS` in `src/data/affixPools.js`.

### Item-wide uniqueness

No affix id may repeat anywhere on the same item. This is stricter than the previous "per-tier" rule — rolling Iron Sharpness on one slot means no other slot on that item (any tier) can roll Sharpness.

### Unique modifiers

- **On creation:** 2% chance (global constant `UNIQUE_ON_CREATION_CHANCE`) that one of the two Iron slots rolls an **artefact-unique** instead of a normal affix. Uniques are drawn from `ARTEFACT_UNIQUES` (see `src/data/uniqueModifiers.js`) filtered by the item's slot type.
- **Transcendent slot:** the candidate pool is the normal Transcendent affixes merged with slot-matching uniques at uniform weighting — Add transmutations on a Transcendent slot can therefore roll a unique.
- **Locked (Iron only):** Iron-tier uniques cannot be honed or replaced. **Transcendent uniques CAN be rerolled** — Hone keeps the unique's id and re-rolls its value, Replace draws from the merged Transcendent pool (and so may land on another unique, a different unique, or a normal affix). Replace on any NON-Transcendent affix can never produce a unique.
- **UI:** uniques render with the magenta accent `#ff7ae6` and a ★ tag so they're distinguishable from any rarity colour.

---

## Item Generation

When an artefact is generated (dropped, found, or crafted):

1. **Slot** is determined by the source (drop table, boss, etc.)
2. **Quality** is rolled (weighted by zone tier — higher zones bias toward better quality)
3. **Base stat** is applied (fixed per slot, scales with realm tier of the zone it drops in)
4. **All visible tier slots** are filled immediately (no empty slots on new items):
   - For each tier slot up to the item's quality: pick a modifier the item doesn't already carry and roll a value within the modifier's range for that tier
   - With `UNIQUE_ON_CREATION_CHANCE` (2%) probability, one of the two Iron slots is replaced with a slot-matching unique
   - Transcendent slot's candidate pool includes uniques (uniform weighting)

Players **start with no artefacts** — inventory and equipped loadout are both empty. Gear is acquired through refining or drops.

---

## Base Stats

Every artefact has one fixed base stat regardless of affixes. It scales with the **realm tier** of the zone it drops in (exact multipliers TBD — flagged for balancing).

| Slot | Base Stat |
|---|---|
| Weapon | Flat Physical Damage *or* Flat Elemental Damage (matches weapon element/type) |
| Head | Soul flat |
| Body | DEF flat |
| Hands | Essence flat *or* Body flat (split by weapon affinity — TBD) |
| Waist | Body flat |
| Feet | Body flat |
| Neck | Elemental Defense flat |
| Finger | Any one primary stat flat (Essence / Soul / Body — rolled at generation) |

---

## Affix Pools — Programmatic Generation

Per-slot pools are no longer hand-listed. `src/data/affixPools.js` emits one
affix entry per `(slot, stat, mod_type)` tuple at module load. Every covered
stat appears in **all four mod types** (`flat`, `base_flat`, `% increased`,
`% more`), giving 20–60 entries per slot before any filtering. Item-wide
dedupe is by full id — an item *can* hold both `+15 essence` and `+25%
essence` (different mod types) but never two `+15 essence` rolls.

### Per-slot stat allowlist

| Slot | Stats |
|---|---|
| **Weapon** | `damage_all`, `physical_damage`, `elemental_damage`, `psychic_damage`, `dmg_physical`, `dmg_sword`, `dmg_fist`, `dmg_fire`, `dmg_water`, `dmg_earth`, `dmg_spirit`, `dmg_void`, `dmg_dao`, `default_attack_damage`, `secret_technique_damage` |
| **Head** | `elemental_defense`, `defense`, `soul_toughness`, `health`, `soul` |
| **Body** | `elemental_defense`, `defense`, `soul_toughness`, `health`, `body` |
| **Hands** | `qi_speed`, `harvest_luck`, `mining_luck`, `elemental_defense`, `defense`, `soul_toughness`, `health`, `exploit_chance`, `exploit_attack_mult` |
| **Waist** | `elemental_defense`, `defense`, `soul_toughness`, `health`, `essence` |
| **Feet** | `elemental_defense`, `defense`, `soul_toughness`, `health`, `exploit_chance`, `exploit_attack_mult`, `mining_speed`, `harvest_speed`, `qi_speed` |
| **Neck** | `essence`, `soul`, `body`, `all_primary_stats`, `buff_effect` |
| **Ring** | `qi_speed`, `harvest_speed`, `harvest_luck`, `mining_speed`, `mining_luck`, `qi_focus_mult`, `heavenly_qi_mult` |

### Value ranges (per rarity tier)

Each `(stat, mod_type)` chooses a value family:

| Family | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| `INCR_BASIC` (single-stat % increased) | 6–12 | 10–18 | 16–28 | 24–40 | 35–60 |
| `INCR_LARGE` (damage % increased) | 8–15 | 14–24 | 22–36 | 32–50 | 45–75 |
| `MORE_TIER` (% more) | 1.03–1.07 | 1.05–1.11 | 1.09–1.18 | 1.14–1.26 | 1.20–1.40 |
| `FLAT_DMG` (damage flat) | 6–14 | 14–32 | 32–70 | 70–150 | 150–300 |
| `FLAT_HP` (health flat) | 20–50 | 50–120 | 120–280 | 280–600 | 600–1200 |
| `FLAT_PRIMARY` (primary stat flat) | 3–8 | 8–18 | 18–35 | 35–60 | 60–100 |
| `FLAT_PCT_POINT` (exploit / luck flat) | 1–3 | 2–5 | 4–8 | 6–12 | 10–20 |
| `FLAT_QI` (qi_speed flat) | 0.05–0.15 | 0.15–0.30 | 0.30–0.55 | 0.55–0.90 | 0.90–1.50 |

**Aggregate scaling.** `all_primary_stats` and `damage_all` use the SAME
family as a single-stat roll but the value is multiplied by
`AGGREGATE_SCALE = 0.5` at roll time — so an "all primaries" roll lands
between 1/3 and 1/1 of an equivalent single-stat roll.

**Per-pool damage** (`dmg_fire`, `dmg_sword`, etc.) uses the full
single-stat range — its conditioning (must be in `law.types`, scaled by
share) is its balance.

---

### Per-slot pool stub

Hand-tuned per-slot weight tables have been removed. Pool composition is
determined entirely by the per-slot stat allowlist above × the four mod
types × the per-rarity value families. Selection is uniform within the
pool (post-dedupe). For exact ids see `affixPoolFor(slot)` in
[src/data/affixPools.js](../src/data/affixPools.js).

---

## Quality Drop Bias

The zone tier biases which quality can drop. Higher zones make Iron drops increasingly rare and Transcendent increasingly possible.

| Zone Tier | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| World 1 | 60% | 30% | 9% | 1% | 0% |
| World 2 | 35% | 38% | 20% | 6% | 1% |
| World 3 | 15% | 32% | 32% | 18% | 3% |
| World 4 | 5% | 18% | 35% | 32% | 10% |
| World 5 | 1% | 8% | 26% | 40% | 25% |
| World 6 | 0% | 2% | 13% | 38% | 47% |

---

## Crafting Summary

Full operation rules in [[Crafting]]. Quick reference for artefacts:

| Goal | Operation | Key Materials (minerals only) |
|---|---|---|
| Start over completely | **Refine** | Black Tortoise Iron × (3×tier) + Crimson Flame Crystal × tier |
| Fix one bad affix value | **Hone** | Chaos Jade × (2×tier) |
| Add a missing affix | **Imbue** | Mithril Essence × (2×tier) |
| Delete one affix | **Extract** | Black Tortoise Iron × 5 |
| Protect one affix | **Seal** | Deep Sea Cold Iron × 3 |
| Change affix type | **Transmute** | Void Stone × (2×tier) |
| Gain an extra affix slot | **Upgrade** | Two bracket minerals (see [[Crafting#Upgrade Costs]]) |

---

## TODO

- [ ] Per-pool damage UI on equipped-weapon tooltip (today they render in the
      affix list but the equipped slot doesn't itemize "fire share")
- [ ] Define base-stat scaling per realm tier
- [ ] Decide if `% more` should be rarer via per-family weight bias

---

## Related

- [[Items]]
- [[Stats]]
- [[Laws]]
- [[Secret Techniques]]
- [[Materials]]
- [[Realm Progression]]
- [[Reincarnation]]
- [[Worlds/World]]

---

## Claude Commands
