# Items

> ⚠️ **Partially stale.** The pill stat section below references Essence/Soul/Body and Psychic Damage — these primary stats were removed in the 2026-04-24 overhaul. Pill effects that previously granted primary-stat bonuses now grant `+1 max health`. Artefact lore names are placeholder content (stat values not yet defined per slot/rarity).

Two main item categories: **Pills** and **Artefacts**.

---

## Pills

Permanent, irreversible base stat improvements consumed at the Production screen.

- Crafted from 3 herbs (recipe system)
- Rarity tiers: Iron / Bronze / Silver / Gold / Transcendent
- Hook: `src/hooks/usePills.js` — persistence `mai_pills` + `mai_permanent_pill_stats`

### Pill Categories

| Category | Notes |
|---|---|
| Combat | HP, defense, damage |
| Harvest | Harvest speed/luck |
| Mining | Mining speed/luck |
| Qi (Transcendent) | qi_speed bonuses |

---

## Artefacts

Equipped items that affect combat. 7 armour slots + 1 weapon slot.

**Quality tiers:** Iron → Bronze → Silver → Gold → Transcendent

**Armour slots:** Head, Body, Hands, Waist, Feet, Neck, Finger (ring)

- Rings are pure utility: qi/s, focus mult, harvest/mining speed/luck, `heavenly_qi_mult`
- Each artefact has an element (one of the 5) and can roll an artefact set bonus
- Hook: `src/hooks/useArtefacts.js`

### TODO (undesigned)
- [ ] Stat values per slot and rarity tier (currently uses realm-index placeholder formulas)
- [ ] Artefact refining mechanics (ore → artefact material)
- [ ] Soul binding (persist across reincarnations)
- [ ] Weapon type list

---

## Related

- [[Materials]]
- [[Stats]]
- [[Elements]]
- [[Reincarnation]]
