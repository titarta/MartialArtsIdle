# Laws

Elemental cultivation arts unlocked at [[Realm Progression#Qi Transformation|Qi Transformation]].

Laws define the cultivator's elemental specialisation and provide a package of passives and cultivation-speed bonuses. Primary stats (Essence, Soul, Body) are no longer derived from Qi through a Law — see [[Primary Stats]].

---

## Requirements

- **Minimum Major Realm** — the higher the realm requirement, the better the multipliers and passives the law can roll.

---

## Element

Laws are tied to one element. Each element flavours the default attack and passive pool available to that law.

| Element | Notes |
|---|---|
| Fire | — |
| Water | — |
| Stone | — |
| Air | — |
| Metal | — |
| Wood | — |
| Normal | No elemental bonus, but broader passive pool |
| Ice | — |

> Elemental combinations possible at advanced realms (TBD).

---

## Types & Unique Pools

Each law also has a `types: [...]` array which controls **which unique-modifier pools** the law can roll from. Unique pools are balanced 3/3/3 around the three primary stats:

| Anchor stat | Pools |
|---|---|
| Body (martial) | physical, sword, fist |
| Essence (elemental) | fire, water, earth |
| Soul (mystical) | spirit, void, dao |

Every law additionally draws from the implicit **`general`** pool regardless of its types. Uniques with no strong thematic fit live in `general`.

- Authoritative pool list: `LAW_UNIQUE_POOLS` in `src/data/lawUniques.js`.
- Pool assignments per unique: `POOL_ASSIGNMENTS` map in the same file (~40 uniques are typed today; the other ~90 default to `general` — edit the map to curate further).
- Generated-law element-to-types mapping: `ELEMENT_TO_TYPES` in `src/data/affixPools.js` (Fire → fire, Water/Frost/Ice → water, Earth/Stone → earth, Void → void; others → `['general']`).
- The starter law **Three Harmony Manual** has `types: ['physical']` — thematic neutrality plus the martial pool.

The designer panel now exposes a read-only **Law Uniques** viewer (Progression section) that lists every unique grouped by its pool so designers can audit coverage.

### Types Are Damage Types

The same 9 types also classify **damage**: each type folds into exactly one of the three base damage buckets, mirroring its primary-stat anchor.

| Anchor | Types | Damage bucket |
|---|---|---|
| Body | physical, sword, fist | `physical_damage` |
| Essence | fire, water, earth | `elemental_damage` |
| Soul | spirit, void, dao | `psychic_damage` |

When an attack resolves, its damage category is derived from the active law's `types` array via `TYPE_TO_DAMAGE_CATEGORY` (in `src/data/lawUniques.js`):

- **Single category law** (e.g. `['fire']` or `['fire', 'water', 'earth']`) — the full flat bonus from the bucket's `*_damage` stat is applied.
- **Multi-category law** (e.g. `['fire', 'sword']`) — the attack is considered to be split evenly across the UNIQUE categories, and each category contributes its flat bonus proportionally. A `[fire, sword]` attack adds `0.5 × elemental_damage + 0.5 × physical_damage`.

This is applied inside `calcDamage()` in `src/data/techniques.js`. Previously the three `*_damage` stats were only displayed; they now actually modify attack output.

---

## Default Attack Multipliers (`typeMults`)

The **basic attack** (fires when no secret technique is ready) is scaled by a new `typeMults: { essence, body, soul }` field on every law. Each slot is **0 by default** — only categories the law actually covers via its `types` get a non-zero value.

Mapping (same as damage categories, just expressed as primary stats):

| Anchor | Types | Primary stat slot |
|---|---|---|
| Body | physical, sword, fist | `typeMults.body` |
| Essence | fire, water, earth | `typeMults.essence` |
| Soul | spirit, void, dao | `typeMults.soul` |

Formula (in `src/hooks/useCombat.js` and `src/systems/autoFarm.js`):
```
basicDmg = max(5, floor(E * typeMults.essence + B * typeMults.body + S * typeMults.soul))
```

### Roll ranges per rarity

The total multiplier rolls **once per covered category**. Adding a second type in the same category (e.g. `['fire', 'water']` → both Essence) does NOT stack — it just means more pool options for the shared slot.

| Rarity | Roll range (per covered category) |
|---|---|
| Iron | 1.10 … 1.30 |
| Bronze | 1.20 … 1.60 |
| Silver | 1.40 … 2.00 |
| Gold | 1.70 … 2.60 |
| Transcendent | 2.20 … 3.50 |

Authoritative: `LAW_TYPE_MULT_RANGES` + `rollLawTypeMults()` in `src/data/affixPools.js`.

### Soul-type generation gate

Soul-anchored types (`spirit`, `void`, `dao`) cannot appear on a law generated before the player has reached Saint realm (`realmIndex >= SAINT_INDEX = 24`). `generateLaw` strips them from the rolled `types` array and falls back to `['general']` if nothing remains. Secret techniques and the starter law are unaffected.

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

### Three Harmony Manual *(Normal · Iron · Qi Transformation)*

> *"The ancient text speaks of no fire, no storm, no mountain — only the even breath between all things."*

A beginner's law found early in the world. Makes no elemental specialisation. Ideal for new cultivators who haven't yet committed to a combat style.

| Property | Value |
|---|---|
| **Element** | Normal |
| **Rarity** | Iron |
| **Realm Requirement** | Qi Transformation (Early Stage) |
| **Cultivation Speed** | ×1.0 (baseline) |

**Passive (1 slot — Iron):**
- *Steady Breath:* Cultivation is not interrupted when taking damage below 10% of max DEF.

**Character:** No elemental attack bonus and only a single passive, but a broadly useful passive and zero realm gating beyond the unlock threshold. A solid starting law that becomes obsolete once elemental or specialised laws are discovered.

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
