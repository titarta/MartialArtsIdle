# Items

## Implemented Item System (`src/data/items.js`)

24 items across 3 categories with 5 rarity tiers. Shown in the Inventory screen.

### Rarity Tiers

| Tier | Color |
|---|---|
| Common | `#aaa` |
| Uncommon | `#4ade80` (green) |
| Rare | `#60a5fa` (blue) |
| Epic | `#c084fc` (purple) |
| Legendary | `#f59e0b` (gold) |

### Herbs (8 items)

| ID | Name | Rarity |
|---|---|---|
| soul_calming_grass | Soul Calming Grass | Common |
| jade_heart_flower | Jade Heart Flower | Uncommon |
| netherworld_flame_mushroom | Netherworld Flame Mushroom | Rare |
| thousand_year_ginseng | Thousand Year Ginseng | Rare |
| blood_lotus | Blood Lotus | Epic |
| dragon_saliva_grass | Dragon Saliva Grass | Epic |
| purple_cloud_vine | Purple Cloud Vine | Legendary |
| immortal_revival_leaf | Immortal Revival Leaf | Legendary |

### Minerals (8 items)

| ID | Name | Rarity |
|---|---|---|
| black_tortoise_iron | Black Tortoise Iron | Common |
| crimson_flame_crystal | Crimson Flame Crystal | Uncommon |
| void_stone | Void Stone | Rare |
| mithril_essence | Mithril Essence | Rare |
| deep_sea_cold_iron | Deep Sea Cold Iron | Epic |
| star_metal_ore | Star Metal Ore | Epic |
| skyfire_meteorite | Skyfire Meteorite | Legendary |
| heavenly_profound_metal | Heavenly Profound Metal | Legendary |

### Cultivation Items (8 items)

| ID | Name | Rarity |
|---|---|---|
| spirit_stone | Spirit Stone | Common |
| qi_condensation_pill | Qi Condensation Pill | Uncommon |
| beast_core | Beast Core | Rare |
| profound_accumulation_pill | Profound Accumulation Pill | Rare |
| origin_crystal | Origin Crystal | Epic |
| heaven_spirit_dew | Heaven Spirit Dew | Epic |
| elemental_essence_bead | Elemental Essence Bead | Legendary |
| breakthrough_golden_pill | Breakthrough Golden Pill | Legendary |

### Starter Inventory

Players begin with pre-populated quantities: more common items (10–50), fewer legendary items.

---

## Designed Item Categories (from PDF)

Two main item categories: **Pills** and **Artefacts**.

---

## Pills

Pills affect **cultivation** or **combat**.

### Properties
- Stored recipes — the player collects pill recipes over time
- Effects can be cultivation boosts, combat buffs, healing, etc.

### TODO
- [ ] Define pill tiers (align with [[Realm Progression]] quality tiers)
- [ ] Define recipe discovery mechanic
- [ ] Define pill effects catalogue
- [ ] Alchemy unlocked at [[Realm Progression#Soul Nourishment|Soul Nourishment]]

---

## Artefacts

Artefacts affect **combat**.

### Types (examples)
- Sword
- Polearm
- *(others TBD)*

### Artefact Role in Combat

Used in [[Laws & Secret Techniques#Secret Techniques|Secret Techniques]]:
- Provide a **flat damage bonus** to attack formula
- Have type requirements for specific secret techniques

### Artefact Bonuses (from Cultivation Type)
- Some cultivation types grant bonus for specific artefact types

### Soul Binding

At [[Reincarnation]]:
- Artefacts can be **bound to the soul** — persist across reincarnations
- **Lower bound limit** applies (artefacts below a quality threshold cannot be bound)

### Artifact Refining

Unlocked at [[Realm Progression#True Chi Foundation|True Chi Foundation]].

### TODO
- [ ] Define artefact quality tiers (iron, bronze, silver, gold, transcendent)
- [ ] Define artefact stats/bonuses
- [ ] Define refining mechanics
- [ ] Define soul-binding cost/rules

---

## Materials

Used in:
- Pill crafting (alchemy)
- Artefact refining
- Purchased/sold in the Shop (unlocked at [[Realm Progression#Body Preparation|Body Preparation]])

### TODO
- [ ] Define material categories and drop sources

---

## Related

- [[Combat]]
- [[Laws & Secret Techniques]]
- [[Realm Progression]]
- [[Reincarnation]]
