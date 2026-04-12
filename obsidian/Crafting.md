# Crafting

The system for refining, upgrading, and customising [[Artefacts]], [[Secret Techniques]], and [[Laws]] using [[Materials]]. Inspired by affix-manipulation crafting (Slormancer-style): you do not create items from scratch, you **transform items you already own**.

Crafting is unlocked at **Qi Transformation** realm and performed at the **Refining Furnace** screen.

---

## Core Concept

Every item has two layers:

| Layer | What it is | Can it change? |
|---|---|---|
| **Frame** | Slot / Rank / Type — the item's identity | Never |
| **Properties** | Affixes, passives, multipliers, element | Yes — via crafting |

Crafting operations act on one or both layers of properties. No operation ever changes the frame.

---

## Operations

Seven operations apply to all three item types. Each operation costs **Spirit Stones** plus one or more specific materials that scale with the item's current quality.

| Operation | What it does |
|---|---|
| **Refine** | Randomise *all* properties at once (like rerolling a drop from scratch). Element and rank are kept; everything else is rerolled. |
| **Extract** | Remove one chosen property. Frees its slot for Imbue. Does not affect other properties. |
| **Imbue** | Add one random property to one empty slot. The added property is drawn from the same pool used when the item drops. |
| **Hone** | Reroll the *value* of one chosen property within its quality-tier range, without changing the property type. |
| **Seal** | Lock one property so it cannot be touched by Refine, Hone, or Transmute. One Seal per item. Sealed property shows a lock icon. |
| **Upgrade** | Increase quality by one tier (Iron → Bronze → Silver → Gold → Transcendent). Adds one empty property slot. |
| **Transmute** | Swap one chosen property type for another drawn randomly from the same pool (same weight tier ±1). Does not change its value range. |

---

## Material Costs

Costs scale with the item's **current quality tier** (×1 at Iron, ×2 at Bronze, ×4 at Silver, ×8 at Gold, ×16 at Transcendent).

### Artefacts

| Operation | Materials | Scaling |
|---|---|---|
| Refine | Black Tortoise Iron × tier + Spirit Stone × (50 × tier) | ×quality |
| Extract | Spirit Stone × 20 | flat |
| Imbue | Mithril Essence × tier + Spirit Stone × (80 × tier) | ×quality |
| Hone | **Chaos Jade** × tier + Spirit Stone × (40 × tier) | ×quality |
| Seal | **Sealing Shard** × 1 | flat (rare material) |
| Upgrade | Quality-matching ore × 3 + Beast Core × (2 × tier) + Spirit Stone × (200 × tier) | ×quality |
| Transmute | Void Stone × tier + Elemental Essence Bead × tier | ×quality |

**Quality-matching ore** per upgrade target:

| Upgrading to | Required Ore |
|---|---|
| Bronze | Crimson Flame Crystal |
| Silver | Mithril Essence |
| Gold | Star Metal Ore |
| Transcendent | Heavenly Profound Metal |

---

### Secret Techniques

| Operation | Materials | Scaling |
|---|---|---|
| Refine | Soul Calming Grass × (2 × tier) + Spirit Stone × (60 × tier) | ×quality |
| Extract | Spirit Stone × 20 | flat |
| Imbue | Blood Lotus × tier + Spirit Stone × (80 × tier) | ×quality |
| Hone | Dragon Saliva Grass × tier + Spirit Stone × (40 × tier) | ×quality |
| Seal | **Sealing Shard** × 1 | flat |
| Upgrade | Quality-matching herb × 3 + Origin Crystal × tier + Spirit Stone × (200 × tier) | ×quality |
| Transmute | Jade Heart Flower × (2 × tier) + Beast Core × tier | ×quality |

**Quality-matching herb** per upgrade target:

| Upgrading to | Required Herb |
|---|---|
| Bronze | Jade Heart Flower |
| Silver | Thousand-Year Ginseng |
| Gold | Purple Cloud Vine |
| Transcendent | Immortal Revival Leaf |

---

### Laws

| Operation | Materials | Scaling |
|---|---|---|
| Refine | Thousand-Year Ginseng × (2 × tier) + Heaven Spirit Dew × tier + Spirit Stone × (100 × tier) | ×quality |
| Extract | Soul Calming Grass × tier + Spirit Stone × 20 | ×quality |
| Imbue | Immortal Revival Leaf × tier + Heaven Spirit Dew × (2 × tier) + Spirit Stone × (120 × tier) | ×quality |
| Hone | Heaven Spirit Dew × (2 × tier) + Spirit Stone × (50 × tier) | ×quality |
| Seal | **Sealing Shard** × 1 | flat |
| Upgrade | Quality-matching herb × 3 + Heaven Spirit Dew × (3 × tier) + Spirit Stone × (200 × tier) | ×quality |
| Transmute | Elemental Essence Bead × tier + Dragon Saliva Grass × (2 × tier) | ×quality |

---

## What Can Be Crafted

### Artefacts

| Property | Refine | Hone | Extract / Imbue | Transmute |
|---|---|---|---|---|
| Affixes (all) | ✓ | ✓ (one value) | ✓ | ✓ |
| Base stat | ✗ | ✗ | ✗ | ✗ |
| Slot | ✗ | ✗ | ✗ | ✗ |
| Quality | Upgrade only | — | — | — |

Upgrading adds one affix slot. The new slot starts empty and must be filled via **Imbue**.

---

### Secret Techniques

| Property | Refine | Hone | Extract / Imbue | Transmute |
|---|---|---|---|---|
| Passives | ✓ | ✓ (effect values) | ✓ | ✓ |
| Element | ✓ | ✗ | ✗ | ✓ |
| Type (Attack / Heal / Defend / Dodge) | ✗ | ✗ | ✗ | ✗ |
| Rank | ✗ | ✗ | ✗ | ✗ |
| Quality | Upgrade only | — | — | — |

Element is part of the property layer and can be rerolled via Refine or Transmuted. Type and Rank are part of the frame and are permanent.

---

### Laws

| Property | Refine | Hone | Extract / Imbue | Transmute |
|---|---|---|---|---|
| Passives | ✓ | ✓ (effect values) | ✓ | ✓ |
| Stat multipliers (Essence / Soul / Body / Cultivation Speed) | ✓ | ✓ (one multiplier) | ✗ | ✗ |
| Element | ✓ | ✗ | ✗ | ✓ |
| Realm requirement | ✗ | ✗ | ✗ | ✗ |
| Quality | Upgrade only | — | — | — |

---

## Seal Rules

- **One Seal per item** — only one property can be locked at a time.
- A Sealed property is immune to Refine, Hone, and Transmute.
- Seal can be manually removed (costs Spirit Stones × 50), freeing the slot to Seal a different property.
- Upgrading an item does not remove its Seal.

---

## Upgrade Notes

- Upgrading always increases quality by exactly one tier.
- The upgrade adds **one new empty property slot**, matching the quality's new count.
- The new slot must be filled manually with **Imbue** — it does not auto-fill.
- There is no downgrade operation.

---

## Crafting Limits

| Limit | Value |
|---|---|
| Operations per item (lifetime) | Unlimited |
| Active Seals per item | 1 |
| Property slots | Fixed by quality (1–5) |
| Simultaneous crafting jobs | 1 (queue planned) |

---

## Unlock Progression

| Operation | Unlocked At |
|---|---|
| Refine, Extract, Imbue | Qi Transformation |
| Hone, Upgrade | True Element |
| Seal | Immortal Ascension |
| Transmute | Saint |

---

## TODO

- [ ] Define exact Spirit Stone costs after economy calibration
- [ ] Design Refining Furnace UI (item picker + operation panel + cost display)
- [ ] Decide whether Transmute respects weight — should rare affixes be transmutable from/to common ones?
- [ ] Decide if Chaos Jade and Sealing Shard drop from specific enemy types or world nodes only
- [ ] Define operation animations / feedback (Slormancer-style flash effect)
- [ ] Add "preview" mode: show possible property ranges before confirming a Hone

---

## Related

- [[Artefacts]]
- [[Secret Techniques]]
- [[Laws]]
- [[Materials]]
- [[Realm Progression]]
- [[Items]]
