# Primary Stats

Three primary stats drive all gameplay systems.

## CHI (Energy / Qi)

- Core cultivation resource
- Gated by **gathering speed**
- Used in combat via Laws and Secret Techniques

## Soul

- Unlocked at [[Realm Progression#Soul Nourishment|Soul Nourishment]] realm
- Gated by **speed**
- Powers more evolved laws and secret techniques
- Contributes to **Intuition** (secondary stat)

## Body

- Physical strength stat
- Gated by **speed**
- Contributes to **DEF = Chi + Body Strength** combo

## Secondary Stats (derived)

| Stat | Formula |
|---|---|
| **Intuition** | From CHI |
| **DEF** | CHI + Body Strength combined |

## UI Sketch (from doc)

```
[CHI]         [Law]                [Secret Technique]
 Gathering     Requirements:        Requirements:
 speed          - Major Realm         - Artefact type
               Attributes:           - Law element
[Soul]          - fogo               - CHI/Soul/Body lvl
 speed          - agua              Rank: major realm
               - pedra             Quality: iron→transcendent
[Body]          - ar               Type: Attack/Heal/Defend/Dodge
 speed          - metal            Attack formula:
                - madeira            K * (Chi, Soul, Body)
                - normal             + artefact dmg (flat)
                - gelo               * elem bonus
               Cultivation speed:   + bonus
                - CHI speed        K = secret technique mult
                - Soul speed
                - Body speed
               Passives:
                - bonus damage
                - bonus healing
                - bonus dmg on artefact
                - increase defense
               Default attack
```

## Current Implementation Status

Stats screen (`src/screens/StatsScreen.jsx`) is **partially implemented** — values are hardcoded placeholders not connected to any calculation:

| Stat | Current Value | Status |
|---|---|---|
| Rank | "Novice Disciple" | Hardcoded |
| Strength | 1 | Hardcoded |
| Agility | 1 | Hardcoded |
| Spirit | 1 | Hardcoded |
| Gold | 0 | Hardcoded |

The CHI/Soul/Body three-stat system from the design doc is **not yet implemented** in code. The cultivation hook only tracks `qi` (used to gate realm progression).

## Related

- [[Cultivation System]]
- [[Realm Progression]]
- [[Laws & Secret Techniques]]
- [[Implementation Notes]]
