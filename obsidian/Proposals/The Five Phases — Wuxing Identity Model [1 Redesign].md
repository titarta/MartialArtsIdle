# System Redesign — Wuxing Identity Model

**Status:** Core elements implemented; law-affinity/set-synergy mechanics pending.
**Date:** 2026-04-21

---

## Core Design (partially implemented)

Collapse the prior three overlapping vocabularies (10 elements, 3 core stats, 3 damage types) into one coherent vertical anchored on 5 Wuxing elements.

### 5 Elements → Identities

| Element | Identity | Set bonus direction |
|---|---|---|
| Fire 火 | Offensive | Physical dmg, exploit |
| Earth 土 | Defensive | HP, physical/magical def |
| Metal 金 | Technique | Magical dmg, cooldown |
| Wood 木 | Cultivation | Qi speed, realm bonuses |
| Water 水 | Utility | Harvest/mining speed |

### 2 Damage Types (implemented)
- **Physical** — basic attacks
- **Elemental** — techniques (renamed from "magical" in implementation)

### Law = Element affinity + scaling passive (implemented: element tag; affinity mechanics pending)

Law selection defines character identity. Artefact sets build on top. Techniques express it in combat.

### Artefact Set System (implemented)
7 slots. 2-piece / 4-piece bonuses aligned with element identity. Sets named per element.

---

## What's implemented vs pending

| Feature | Status |
|---|---|
| 5 elements in `src/data/elements.js` | ✅ |
| Law `element` field | ✅ |
| Artefact `element` + set bonuses | ✅ |
| Technique `element` + `damageType` | ✅ |
| Law-element affinity modifying set bonuses | ❌ Not implemented |
| Element-typed enemy resistances | ❌ Not implemented |

## Related

- [[Elements]]
- [[Stats]]
