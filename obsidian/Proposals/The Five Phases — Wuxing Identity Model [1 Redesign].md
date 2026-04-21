# System Redesign — Wuxing Identity Model

**Status:** Proposal — ready to architect  
**Date:** 2026-04-21  
**Origin:** Design session (game-design-framework evaluation)

---

## Motivation

The current system has three separate vocabularies (10 elements, 3 core stats, 3 damage types) that all point at the same underlying question — "what kind of cultivator are you?" — without ever answering it clearly. The redesign collapses these into one coherent vertical.

---

## Core Pillars

### 1. 5 Wuxing Elements replace 10 elements

Each element is tied to one gameplay identity:

| Element | Identity | Set Bonus Direction |
|---|---|---|
| Fire 火 | Offensive | Physical dmg, exploit, attack power |
| Earth 土 | Defensive | HP, physical def, magical def |
| Metal 金 | Technique | Magical dmg, cooldown, technique power |
| Wood 木 | Cultivation | Cultivation speed, qi gain, realm bonuses |
| Water 水 | Utility | Harvest speed, mining speed, activity buffs |

Wuxing is thematically authentic to xianxia and mechanically simple. A player reads "Fire = Offensive" without documentation.

---

### 2. 2 Damage Types replace Body/Soul/Essence

- **Physical damage** — basic attacks
- **Magical damage** — techniques

Modeled after LoL/TFT. Enemies have physical and magical resistance values that differ per type (constructs: high physical resist; spirits: high magical resist). Without enemy differentiation, damage types are cosmetic — this is a required companion change.

A 3rd type ("Spirit damage") is not needed. Idle combat has no per-fight tactical decisions that would justify a 3rd type. Soul-type depth can be expressed as a late-game modifier on magical damage, not a new type.

---

### 3. Combat Acquisition

- **Artefacts** drop from combat, quality gated by world tier
- **Techniques** drop from combat at lower chance, quality gated by world tier
- **Materials** (from gathering/mining) are used exclusively for upgrading existing pieces
- **Crafting panel** = upgrade and modify only — no new artefact or technique generation

This closes the progression loop: fight harder enemies → better drops → more power → fight harder enemies.

Technique and artefact quality floor by world:
- World 1–2 → Iron/Bronze
- World 3–4 → Silver/Gold
- World 5–6 → Transcendent

---

### 4. 5 Artefact Slots with Genshin-style Set Synergies

- 5 slots, any artefact can go in any slot (no slot identity)
- Each artefact piece has a **Wuxing element tag**
- **2-piece bonus**: equipped 2 same-element pieces → minor set effect
- **4-piece bonus**: equipped 4 same-element pieces → major set effect

**Anti-duplication rule**: max 2 pieces of the same element count toward the 4-piece bonus. 4-piece requires at least 2 different element tags. This prevents stacking 5 copies of one piece.

Set bonuses align with element identity (Fire 2-piece = +physical dmg%, Fire 4-piece = +exploit chance, etc.).

---

### 5. Law = Wuxing Affinity + Scaling Passive

Law is the foundational identity choice. It does two things:

**A) Wuxing affinity**: your law's element synergizes with matching artefact sets. With a Fire law equipped, Fire artefact sets gain an additional bonus (e.g. 4-piece threshold reduced to 3, or stacking bonus on top of set effect).

**B) Unique scaling passive**: each law has one passive that defines how you grow, not just what numbers scale.

Example laws:
- *Crimson Destruction Manual* (Fire): "Every 3rd basic attack is a guaranteed exploit."
- *Stone Foundation Scripture* (Earth): "Defense reduces incoming magical damage by an additional 15%."
- *Blade Refinement Doctrine* (Metal): "Techniques deal +25% magical damage."
- *Eternal Growth Canon* (Wood): "Cultivation speed scales with number of cleared regions."
- *Flowing Void Manual* (Water): "Activity speeds increase 20% per active idle assignment."

Law selection = character identity. Artefact sets build on top of it. Techniques express it in combat.

---

### 6. Reduced Stat Vocabulary

Core combat stats only:

- Physical Damage
- Magical Damage
- Physical Defense
- Magical Defense
- Exploit Chance
- Exploit Multiplier
- HP

Activity stats (harvest speed, mining speed, cultivation speed) survive as:
- **Wood set bonuses** (cultivation speed)
- **Water set bonuses** (harvest/mining speed)
- Rare modifiers on artefact pieces outside the main stat set

This removes ~15 stats from the player-facing vocabulary without removing depth.

---

## What Does NOT Change

- **Technique types**: Attack / Heal / Defend / Dodge — unchanged
- **Technique quality**: Iron → Bronze → Silver → Gold → Transcendent — unchanged
- **Blood cores**: cultivation materials from combat, feeds realm progression — unchanged
- **Modifier system on artefacts**: the reroll/upgrade logic stays; just fewer stat types to roll
- **Dismantle economy**: dismantling artefacts produces upgrade materials, closing the loop

---

## Open Questions / Future Layers

- **Wuxing cycle bonuses** (generative pair: Wood+Fire, Fire+Earth, etc.): flag as post-MVP depth layer. Equipping the generative pair of your law element gives a stacking bonus on top of set synergies.
- **Technique element tags**: NOT recommended. Technique identity stays as type + quality. Elements live on laws and artefacts only.
- **Dismantle exchange rate**: define starting values with test plan before implementing.
- **Enemy resistance values**: one field per enemy (physicalResist, magicalResist). Low implementation cost, critical for damage type to be non-cosmetic.

---

## Comparison: Current vs. Proposed

| Dimension | Current | Proposed |
|---|---|---|
| Elements | 10, cosmetic | 5 Wuxing, functional |
| Core stats | Body/Soul/Essence + ~20 derived | Removed; ~7 core combat stats |
| Damage types | 3 (none affect enemies) | 2 (physical/magical, enemies respond) |
| Gear slots | 8, no identity | 5, set-driven identity |
| Acquisition | Crafting gambling | Combat drops + crafting upgrades |
| Set bonuses | None | 2-piece + 4-piece Wuxing |
| Law purpose | Hidden typeMults | Element affinity + unique passive |
| Stats to track | ~20+ | ~7 |
| Inventory noise | High | Low (quality gating + combat-source) |

---

## Implementation Readiness

**Ready to architect.** Two items must be resolved before coding begins:

1. Enemy resistance values per enemy — data change, not code
2. Set bonus values (2-piece and 4-piece per element) — needs starting values + test plan

Everything else is design-complete.
