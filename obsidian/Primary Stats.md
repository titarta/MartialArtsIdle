# Primary Stats

Three primary stats drive all gameplay systems. They start at **0** and are built up entirely through modifier sources — pills, artefacts, [[Laws|Law]] passives, reincarnation bonuses, and so on. They are **not derived from Qi**; Qi is a separate resource used exclusively for realm breakthroughs.

```
Essence = 0 + modifiers
Soul    = 0 + modifiers
Body    = 0 + modifiers
```

See [[Stats]] for the full stacking formula and order of operations.

---

## Naming Note

**Qi** is the raw cultivation resource that accumulates over time and gates realm breakthroughs.
**Essence, Soul, Body** are the three combat/power stats. Keeping these names distinct avoids confusion between the resource and the stats.

---

## Essence (Elemental Power)

- Base value 0; built up via modifier sources
- Primary driver of **elemental attacks** (fire, water, ice, etc.)
- Scales with Laws that have an elemental affinity

## Soul (Spiritual Power)

- Base value 0; built up via modifier sources
- Unlocked at [[Realm Progression#Saint|Saint]] realm (locked to 0 before this)
- Primary driver of **mental / spiritual attacks** and [[Secret Techniques]]
- Contributes to **Intuition** (secondary stat)

## Body (Physical Power)

- Base value 0; built up via modifier sources
- Primary driver of **physical attacks**
- Sole source of **DEF**

---

## Secondary Stats (derived)

| Stat | Formula |
|---|---|
| **Intuition** | From Soul |
| **DEF** | From Body |

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

