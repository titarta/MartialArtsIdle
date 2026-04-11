# Primary Stats

Three primary stats drive all gameplay systems. They are **not accumulated directly** — they are derived from the cultivator's raw **Qi** through the multipliers defined by the active [[Laws|Law]].

```
Essence = Qi × essence_mult   (from Law)
Soul    = Qi × soul_mult      (from Law)
Body    = Qi × body_mult      (from Law)
```

Other sources (pills, artefacts, reincarnation bonuses) can modify these values further on top of the base.

---

## Naming Note

**Qi** is the raw cultivation resource that accumulates over time and gates realm breakthroughs.
**Essence, Soul, Body** are the three derived combat/power stats. Keeping these names distinct avoids confusion between the resource and the stats.

---

## Essence (Elemental Power)

- Derived from Qi via the Law's `essence_mult`
- Primary driver of **elemental attacks** (fire, water, ice, etc.)
- Scales with Laws that have an elemental affinity
- Contributes to **DEF** alongside Body

## Soul (Spiritual Power)

- Derived from Qi via the Law's `soul_mult`
- Unlocked at [[Realm Progression#Saint|Saint]] realm
- Primary driver of **mental / spiritual attacks** and [[Secret Techniques]]
- Contributes to **Intuition** (secondary stat)

## Body (Physical Power)

- Derived from Qi via the Law's `body_mult`
- Primary driver of **physical attacks**
- Contributes to **DEF = Essence + Body** (combo)

---

## Secondary Stats (derived)

| Stat | Formula |
|---|---|
| **Intuition** | From Soul |
| **DEF** | Essence + Body combined |

---

## UI Sketch

```
[Qi]              [Law]                      [Secret Technique]
 Accumulation      Element: Fire              Requirements:
 rate              Realm req: Saint             - Artefact type
                                                - Law element
[Essence]          Multipliers:                 - Essence/Soul/Body lvl
 Qi × esse_mult     - essence_mult            Rank: major realm
 → Elemental atk    - soul_mult              Quality: iron→transcendent
                    - body_mult              Type: Attack/Heal/Defend/Dodge
[Soul]              - cultivat. speed        Attack formula:
 Qi × soul_mult                                K * (Essence + Soul + Body)
 → Mental atk      Passives (by rarity):       + artefact dmg (flat)
                    - Iron: 1 passive           * elem bonus
[Body]              - Bronze: 2              K = secret technique mult
 Qi × body_mult     - Silver: 3
 → Physical atk     - Gold: 4
                    - Transcendent: 5
```

---

## Related

- [[Cultivation System]]
- [[Realm Progression]]
- [[Laws]]
- [[Secret Techniques]]
- [[Implementation Notes]]

