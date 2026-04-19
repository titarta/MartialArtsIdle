# Primary Stats

Three primary stats drive all gameplay systems. Essence and Body start from a small non-zero baseline so the player is survivable from turn 0; Soul stays locked at 0 until the Saint realm. All further growth comes from modifier sources — pills, artefacts, [[Laws|Law]] passives, reincarnation bonuses, and so on. They are **not derived from Qi**; Qi is a separate resource used exclusively for realm breakthroughs.

```
Essence = 20 + modifiers
Soul    = 0  + modifiers   (locked to 0 until Saint)
Body    = 20 + modifiers
```

Starting-player combat baseline (no pills, no artefacts, no equipped law):
HP `(20+20)×12 + 0×4 = 480`, DEF 20, Elem Def 20, basic attack `(20+20)/2 = 20`.
With a starter law equipped the basic attack scales by the law's `typeMults`
instead — see [[Laws]].
Tune starting values at `BASE_ESSENCE` / `BASE_BODY` in `src/data/stats.js`.

See [[Stats]] for the full stacking formula and order of operations.

---

## Naming Note

**Qi** is the raw cultivation resource that accumulates over time and gates realm breakthroughs.
**Essence, Soul, Body** are the three combat/power stats. Keeping these names distinct avoids confusion between the resource and the stats.

---

## Essence (Elemental Power)

- Base value 20; built up via modifier sources.
- Drives **elemental** damage (fire/water/earth pool types) when the active
  law has Essence-anchored `types` — multiplied by `law.typeMults.essence`.
- Sole source of **Elemental Defense** (`elem_def = essence + modifiers`).

## Soul (Spiritual Power)

- Base value 0; built up via modifier sources.
- Unlocked at [[Realm Progression#Saint|Saint]] realm (locked to 0 before this).
- Drives **psychic** damage (spirit/void/dao pool types) when the active
  law has Soul-anchored `types` — multiplied by `law.typeMults.soul`.
- Sole source of **Soul Toughness** (`soul_toughness = soul + modifiers`).
- Gates **Harvest Speed** — zero while Soul is locked.

## Body (Physical Power)

- Base value 20; built up via modifier sources.
- Drives **physical** damage (physical/sword/fist pool types) when the
  active law has Body-anchored `types` — multiplied by `law.typeMults.body`.
- Sole source of **Defense** (`def = body + modifiers`).
- Drives **Mining Speed** (`mining_speed = floor(body × 0.1) + modifiers`).

---

## Secondary Stats (derived)

| Stat | Formula |
|---|---|
| Health | `(essence + body) × 12 + soul × 4`, min 100 |
| Defense | `body + modifiers` |
| Elemental Defense | `essence + modifiers` |
| Soul Toughness | `soul + modifiers` |
| Mining Speed | `floor(body × 0.1) + modifiers` (min 1) |
| Harvest Speed | `floor(soul × 0.1) + modifiers` (min 1, locked while Soul is 0) |

---

## UI Sketch

```
[Qi]              [Law]                      [Secret Technique]
 Accumulation      Element: Fire              Requirements:
 rate (spent on    Realm req: Saint             - Artefact type
  breakthroughs)                                - Law element
                   Passives (by rarity):        - Essence/Soul/Body lvl
[Essence]           - Iron: 1 passive         Rank: major realm
 0 + modifiers      - Bronze: 2               Quality: iron→transcendent
 → Elemental atk    - Silver: 3               Type: Attack/Heal/Defend/Dodge
                    - Gold: 4
[Soul]              - Transcendent: 5        Attack formula:
 0 + modifiers                                  K * (Essence + Soul + Body)
 → Mental atk                                   + artefact dmg (flat)
                                                * elem bonus
[Body]                                        K = secret technique mult
 0 + modifiers
 → Physical atk
```

---

## Related

- [[Cultivation System]]
- [[Realm Progression]]
- [[Laws]]
- [[Secret Techniques]]
- [[Implementation Notes]]

