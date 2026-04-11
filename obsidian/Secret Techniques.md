# Secret Techniques

Advanced combat skills that fire automatically during fights. Unlocked at [[Realm Progression#Saint|Saint]] realm.

---

## Combat Loop

1. Mob spawns
2. Player's techniques fire automatically as their cooldowns expire
3. Mob dies → next mob spawns
4. If no technique is ready, the [[Laws|Law]]'s **default attack** fires instead

---

## Technique Slots

- Player starts with **3 slots**
- Additional slots are rare upgrades (realm milestones, special rewards)
- Each slot holds one equipped technique with its own independent cooldown
- Slots fire in order (1 → 2 → 3) when multiple are ready at the same tick

---

## Types & Trigger Conditions

| Type | Triggers | Effect |
|---|---|---|
| **Attack** | Cooldown expires | Deal damage using the attack formula |
| **Heal** | Cooldown expires **and** HP ≤ 50% | Restore a flat or % HP amount |
| **Defend** | Cooldown expires | Apply a DEF buff for a short duration |
| **Dodge** | Cooldown expires | Apply a dodge chance buff for a short duration |

Heal will **not** fire if HP is above the threshold even if the cooldown is ready — it waits until the condition is met.

---

## Cooldowns

Base cooldown by type, reduced by rank and quality:

| Type | Base Cooldown |
|---|---|
| Attack | 6s |
| Heal | 12s |
| Defend | 10s |
| Dodge | 10s |

**Quality modifier** (multiplied against base):

| Quality | Cooldown Multiplier |
|---|---|
| Iron | ×1.0 |
| Bronze | ×0.90 |
| Silver | ×0.80 |
| Gold | ×0.70 |
| Transcendent | ×0.55 |

---

## Attack Formula

```
Damage = K * (Essence + Soul + Body + artefact_dmg_flat) * arte_mult * elem_bonus + bonus
```

| Variable | Meaning |
|---|---|
| `K` | Technique multiplier — scales with rank and quality (see table below) |
| `arte_mult` | Artefact-specific multiplier |
| `elem_bonus` | Bonus when Law element matches technique element |
| `bonus` | Flat additive damage |

### K Scaling (Rank × Quality)

Major realm rows, quality columns:

| Rank | Iron | Bronze | Silver | Gold | Transcendent |
|---|---|---|---|---|---|
| Saint | 1.5 | 2.0 | 2.8 | 3.8 | 5.0 |
| Emperor | 2.5 | 3.5 | 4.8 | 6.5 | 8.5 |
| Immortal | 4.0 | 5.5 | 7.5 | 10.0 | 13.0 |
| *(higher)* | TBD | TBD | TBD | TBD | TBD |

---

## Requirements to Equip

- Minimum **major realm** matching the technique's rank
- Matching **artefact type** (sword, polearm, etc.)
- Matching **Law element** (optional for non-elemental techniques)
- Minimum **Essence / Soul / Body** threshold (varies per technique)

---

## Quality Tiers

Iron → Bronze → Silver → Gold → **Transcendent**

Quality affects cooldown speed, K multiplier, and number of passives on the technique.

| Quality | Passive Effects |
|---|---|
| Iron | 1 |
| Bronze | 2 |
| Silver | 3 |
| Gold | 4 |
| Transcendent | 5 |

---

## Discovery & Acquisition

- Dropped by mobs (rare, higher quality from stronger zones)
- Rewards from zone clears or boss fights
- Possibly crafted from [[Materials]] (TBD)

---

## Related

- [[Laws]]
- [[Primary Stats]]
- [[Realm Progression]]
- [[Items]]
- [[Combat]]
