# Laws

Elemental cultivation arts unlocked at [[Realm Progression#Qi Transformation|Qi Transformation]].

Laws define the cultivator's elemental specialisation and provide a package of passives and cultivation-speed bonuses. **Primary stats are gone** — see [[Primary Stats]] for the deprecation note.

> **Overhaul note (2026-04-24):** the prior law catalogue and unique-modifier pools were wiped during the Damage & Element System Overhaul. Element list collapsed from 8 (Fire / Water / Stone / Air / Metal / Wood / Normal / Ice) to **5** (`fire / water / earth / wood / metal`). Type system collapsed from 9 pools to the same **5 + `general`**. `typeMults` removed entirely (no primary stats to multiply). All ~119 prior law uniques live in [[Deprecated_Unique_Modifiers]].

---

## Requirements

- **Minimum Major Realm** — the higher the realm requirement, the better the passives the law can roll.

---

## Element

Laws are tied to exactly one of the five elements. The element flavours the default attack and the passive pool the law draws from.

| Element |
|---|
| `fire` |
| `water` |
| `earth` |
| `wood` |
| `metal` |

Authoritative constant: `ELEMENTS` in `src/data/elements.js` (added in Stage 5 of the overhaul). See [[Elements]] for the global element model.

---

## Types & Unique Pools

Each law has a `types: [...]` array — one or more of the five elements plus optional `general`. The array selects which unique-modifier pools the law can roll from. Every law implicitly draws from `general` regardless of its `types`.

```
LAW_UNIQUE_POOLS = ['fire', 'water', 'earth', 'wood', 'metal', 'general']
```

**Repopulated 2026-04-27** with 50 element-themed entries (10 per element). The first 3 of each pool are "<Set N> counts as +1 artefact" — one per of that element's 3 sets (see [[Artefact Sets]]).

- Authoritative pool list: `LAW_UNIQUE_POOLS` in `src/data/lawUniques.js`.
- Generated-law element-to-types mapping: see `src/data/affixPools.js` (typically `<element> → [<element>]`).
- The `general` pool is currently empty; designer can populate later.

### Law Uniques Catalogue (50 entries)

#### Fire — damage / aggression

| ID | Effect |
|---|---|
| `l_fire_set1_extra` | Ember Legacy artefact count counts as having one more artefact |
| `l_fire_set2_extra` | Phoenix Coterie artefact count counts as having one more artefact |
| `l_fire_set3_extra` | Sunforge Compact artefact count counts as having one more artefact |
| `l_fire_aggressor` | 50% more damage with techniques. 20% less damage with default attack. 10% reduced technique cooldown |
| `l_fire_double_strike` | Default attacks double the damage of the next default attack. Using a technique removes this buff |
| `l_fire_burning_will` | Healing techniques have double the cooldown. 30% more damage |
| `l_fire_legion` | 6% more damage for each fire artefact equipped |
| `l_fire_desperate` | 1% more damage for each 1% of life missing |
| `l_fire_violent_dao` | Qi/s is increased by 10% of damage increase multiplier |
| `l_fire_overwhelming` | 200% increased damage. Cannot execute exploit attacks |

#### Water — healing / sustain

| ID | Effect |
|---|---|
| `l_water_set1_extra` | Tidebound Rite artefact count counts as having one more artefact |
| `l_water_set2_extra` | Frost Mirror artefact count counts as having one more artefact |
| `l_water_set3_extra` | Abyssal Pact artefact count counts as having one more artefact |
| `l_water_swift_mend` | Healing techniques have 40% reduced cooldown. 10% less damage |
| `l_water_purity` | Any source of healing is 30% more effective |
| `l_water_purifying_tide` | Damage enemies by 30% of healing received |
| `l_water_natural_flow` | 5% HP per second natural regeneration |
| `l_water_resonant_healing` | Triggering healing secret techniques reduce other secret techniques cooldown by 40% |
| `l_water_living_rivers` | Qi/s is increased by healing increase multiplier |
| `l_water_sanctuary` | Healing makes the next enemy hit deal no damage |

#### Earth — defence / mitigation

| ID | Effect |
|---|---|
| `l_earth_set1_extra` | Stoneblood Oath artefact count counts as having one more artefact |
| `l_earth_set2_extra` | Mountain Chapel artefact count counts as having one more artefact |
| `l_earth_set3_extra` | Dune Wanderers artefact count counts as having one more artefact |
| `l_earth_warrior_monk` | 80% increased defense and elemental defense. You cannot heal |
| `l_earth_iron_resolve` | 50% more defense and elemental defense if below 50% health |
| `l_earth_thornward` | 50% of mitigated damage is retaliated |
| `l_earth_steady_ward` | Defense techniques apply to 1 more hit |
| `l_earth_iron_fist` | Default attacks deal 5% of maximum health as physical damage |
| `l_earth_meditative` | 5% of out-of-combat defense is added to Qi/s |
| `l_earth_dual_aspect` | Elemental defense is equal to defense. 35% less defense |

#### Metal — exploit / debuff

| ID | Effect |
|---|---|
| `l_metal_set1_extra` | Iron Bastion artefact count counts as having one more artefact |
| `l_metal_set2_extra` | Razor Hierarchy artefact count counts as having one more artefact |
| `l_metal_set3_extra` | Sovereign Plate artefact count counts as having one more artefact |
| `l_metal_concentrated` | 50% reduced exploit chance. 100% increased exploit damage |
| `l_metal_piercing` | Exploit hits ignore 20% of enemy defenses |
| `l_metal_extended_pressure` | Expose secret techniques apply to 2 more hits |
| `l_metal_torment` | Any debuff on an enemy is 30% more effective |
| `l_metal_armoury` | 20% reduced secret technique cooldowns for each Expose technique equipped |
| `l_metal_predator` | Qi/s is increased by exploit chance |
| `l_metal_resonant` | 4% more secret technique effectiveness per metal artefact equipped |

#### Wood — dodge / evasion

| ID | Effect |
|---|---|
| `l_wood_set1_extra` | Verdant Accord artefact count counts as having one more artefact |
| `l_wood_set2_extra` | Root Conclave artefact count counts as having one more artefact |
| `l_wood_set3_extra` | Bloomward artefact count counts as having one more artefact |
| `l_wood_swift_step` | Dodge secret techniques have 20% reduced cooldown and last 1 more hit |
| `l_wood_anticipation` | Dodge chance is increased by 5% for each hit taken. Resets on successful dodge |
| `l_wood_renewing_breeze` | Heal 5% HP on successful dodge |
| `l_wood_lithe` | Damage is increased by current dodge chance |
| `l_wood_unbroken_dance` | Each successful dodge increases defenses by 30%. Decreases dodge chance by 5% for each successful dodge |
| `l_wood_living_dao` | 30% increased Qi/s |
| `l_wood_grove` | 3% dodge chance for each wood artefact equipped |

The designer panel **Law Uniques** viewer (Progression section) renders these grouped by pool.

### Types and Damage

`law.types` no longer maps to a damage bucket. **Damage routing is per-technique now** (see [[Damage Types]] and [[Secret Techniques]]). Basic attacks are always physical. Secret techniques carry their own `damageType`.

`law.types` controls only the unique-modifier pool draw — it does not split or scale damage.

---

## Default Attack

The previous `typeMults: { essence, body, soul }` field is **removed** along with the primary stats it multiplied. Basic-attack damage is now scaled by realm index alone (placeholder formula until a new stat axis is designed):

```
basicDmg = max(5, K_basic × realmIndex × arteMult)
```

See [[Primary Stats#Placeholder formulas]].

### Starter law

Players no longer start with an equipped law. A fresh save's library is empty; the first **major-realm breakthrough** fires a "First Law" selection that offers three Iron rolls (no skip). The picked law lands in the library — the player equips it manually from the Character tab.

### Starter law

Players no longer start with an equipped law. A fresh save's library is empty; the first **major-realm breakthrough** fires a "First Law" selection that offers three Iron rolls (no skip). The picked law lands in the library — the player equips it manually from the Character tab.

### How laws are acquired

- **No more refining.** The Production → Refining tab no longer offers a law card; `REFINE_COSTS.law` is gone.
- **Breakthrough selections.** Every major-realm transition queues a second pending selection alongside the normal augment reward: three law rolls sampled from the realm's rarity band.
- **Rarity band per major realm** (authoritative: `lawOfferRaritiesForRealm` in `src/data/realms.js`):

  | Major realm | Offer pool |
  |---|---|
  | Tempered Body | Iron |
  | Qi Transformation, True Element | Iron + Bronze |
  | Separation & Reunion, Immortal Ascension | Bronze + Silver |
  | Saint, Saint King, Origin Returning | Silver + Gold |
  | Origin King, Void King, Dao Source, Emperor Realm, Open Heaven | Gold + Transcendent |

- **Reroll cost.** First reroll per offer is free; subsequent rerolls cost `JADE_COSTS.reroll_law_extra = 30` (1.5× the augment `reroll_extra`).
- **Skip** is allowed on all non-first offers.

### Unequipped is a legal state

`activeLaw` can be `null`. The cultivation tick, offline earnings, basic-attack formula, and stat engine all handle nullity — unequipped cultivators accrue qi at base rate with no `typeMults` applied. The BuildTab law picker exposes an "Unequip current law" action.

### Reincarnation

Wipes everything **except** the entire owned-law library. `activeLawId` is cleared, forcing the reborn character to pick a new equipped law from their library — the identity reset is explicit. Karma, the Eternal Tree, and the library persist across every life.

### Upgrade costs (law-specific)

Laws now have their own `LAW_UPGRADE_COSTS` table (in `src/data/crafting.js`) — ~1.5× heavier than the shared artefact/technique table since laws enter for free (no refining cost) and the upgrade path is the only mineral sink for them.

| Current → Next | Cost |
|---|---|
| Iron → Bronze | 15 iron_mineral_1 + 4 bronze_mineral_1 |
| Bronze → Silver | 12 bronze_mineral_1 + 4 silver_mineral_1 |
| Silver → Gold | 8 silver_mineral_1 + 4 gold_mineral_1 |
| Gold → Transcendent | 12 gold_mineral_1 + 3 transcendent_mineral_1 |

---

## Cultivation Speed

Each law has a **base cultivation speed multiplier** applied on top of the global rate:

```
qi/sec = BASE_RATE × cultivation_speed_mult × other_bonuses
```

Higher-realm laws generally roll higher `cultivation_speed_mult` values.

---

## Passives

Laws roll a set of specific passive bonuses. The number of passives depends on the law's **rarity**:

| Rarity | Passive Slots |
|---|---|
| Iron | 1 |
| Bronze | 2 |
| Silver | 3 |
| Gold | 4 |
| Transcendent | 5 |

### Passive Pool (examples)

- Bonus elemental damage
- Bonus healing
- Bonus damage on artefact hit
- Increased defense
- *(more TBD)*

---

## Realm Requirement & Quality

The minimum major realm required to use a law gates its overall quality:

| Realm Requirement | Effect |
|---|---|
| Low (Tempered Body / Qi Transformation) | Low multipliers, few passives, low rarity cap |
| Mid (True Element → Immortal Ascension) | Moderate multipliers, medium rarity cap |
| High (Saint+) | High multipliers, full rarity range possible |

---

## Acquisition

Laws are **procedurally generated** and offered exclusively through the
**breakthrough-offered library** described in `How laws are acquired`
above. There is no world-drop, refining, or crafting path that creates
new laws — every law in the player's library originated from a major-realm
breakthrough offer (or the first-law selection on the very first major
breakthrough).

Unwanted laws can be **dismantled** back to a single mineral of matching
rarity (see [[Crafting#Operations]]).

---

## Example Law

### Unyielding Fist Manual *(metal · Iron · Qi Transformation)*

> *"A drill-book of Tempered Body strikes — the disciple's first hundred blows, repeated until the bones remember them."*

The starter law assigned to every fresh save. Single-element (metal), Iron rarity, one passive slot.

| Property | Value |
|---|---|
| **Element** | `metal` |
| **Types** | `['metal']` |
| **Rarity** | Iron |
| **Realm Requirement** | Qi Transformation (Early Stage) |
| **Cultivation Speed** | ×1.0 (baseline) |

**Passive (1 slot — Iron):** rolled from the `metal` and `general` pools. Both pools are empty until the designer refills them post-overhaul.

---

## Crafting Summary

Laws no longer participate in the seven-operation crafting flow. The
only operations available on a law are:

| Goal | Operation | Cost |
|---|---|---|
| Bump quality tier (Iron → Bronze → … → Transcendent) | **Upgrade** | `LAW_UPGRADE_COSTS` table above |
| Recover a mineral from an unwanted law | **Dismantle** | — (yields 1 mineral of the law's rarity) |

Element, passives, type multipliers, cultivation-speed multiplier, and
realm requirement are **all frozen at acquisition time** — there is no
way to reroll any of them. The library exists to give the player a
*choice* between distinct law identities, not a way to mutate one law
into another.

---

## TODO

- [ ] Define cultivation-speed multiplier ranges per realm tier and rarity
- [ ] Define full passive pool and weighting per element
- [ ] Define elemental combination unlock conditions
- [ ] Define law discovery rate / book drop sources
- [ ] Define whether multiple laws can be held (swap mechanic?)

---

## Related

- [[Crafting]]
- [[Secret Techniques]]
- [[Primary Stats]]
- [[Realm Progression]]
- [[Cultivation System]]
- [[Items]]
- [[Combat]]

---

## Claude Commands

> **[CONCLUDED]**
> *Original commands received and executed (2026-04-10):*
>
> - ~~Continue to have an element (create element tabs and add the existing ones, and nothing else)~~
> - ~~Laws now dictate how much of the three stats you get from your current cultivation~~
> - ~~The three main stats are Chi, soul and body. Feel free to suggest better names since having qi and chi is a bit confusing~~
> - ~~A law has a certain multiplier from qi to calculate the stat base value (which can then be modified by other sources eventually)~~
> - ~~Update primary stats tab for the three stats and explain that chi is mainly used for elemental attacks, body for physical ones and soul for mental ones~~
> - ~~Update primary stats tab UI sketch to have the multipliers instead of cultivation speed for main stats~~
> - ~~The law also has other specific passives which number depends on the rarity of the law~~
> - ~~The law has a base cultivation speed multiplier~~
> - ~~The law has a requirement for major realm level. the bigger the requirement, the better the passives and multipliers are~~
>
> *Changes made:* Laws redesigned with element tabs, stat conversion multipliers (Essence/Soul/Body from Qi), cultivation speed multiplier, rarity-gated passive slots, and realm-requirement quality scaling. "Chi" renamed to **Essence** to avoid confusion with "Qi" — see [[Primary Stats]] for rationale.
