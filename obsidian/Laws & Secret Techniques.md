# Laws & Secret Techniques

## Laws

Laws are elemental cultivation arts unlocked at [[Realm Progression#Chi Foundation|Chi Foundation]].

### Requirements

- **Major Realm** (upper and lower bounds apply)

### Attributes

**Element** (one of):
- Fire (fogo)
- Water (água)
- Stone (pedra)
- Air (ar)
- Metal
- Wood (madeira)
- Normal
- Ice (gelo)
- *(Combinations possible at advanced realms)*

### What Laws Do

| Property | Effect |
|---|---|
| **Cultivation speed** | Boosts CHI speed / Soul speed / Body speed |
| **Default attack** | Each Law grants a basic combat attack |
| **Passives** | Examples: bonus damage, bonus healing, bonus damage on artefact hit, increased defense |

---

## Secret Techniques

Unlocked at [[Realm Progression#Soul Nourishment|Soul Nourishment]].

### Requirements

- Artefact type (sword, polearm, etc.)
- Law (element, etc.)
- CHI, Soul, or Body level threshold

### Rank

- Determined by **major realm** (+ minor sub-rank)

### Quality Tiers

Iron → Bronze → Silver → Gold → **Transcendent**

### Types

| Type | Effect |
|---|---|
| **Attack** | Deal damage |
| **Heal** | Restore HP |
| **Defend** | Increase defense temporarily |
| **Dodge** | Increase dodge chance during fight |

### Attack Formula

```
Damage = K * (CHI + Soul + Body + artefact_damage_flat) * arte_mult * elem_bonus + bonus
```

- `K` = secret technique multiplier (scales with rank/quality)
- `arte_mult` = artefact-specific multiplier
- `elem_bonus` = elemental affinity bonus

---

## Related

- [[Primary Stats]]
- [[Realm Progression]]
- [[Items]]
- [[Combat]]
