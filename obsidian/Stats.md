# Stats

Full stat reference post **Damage & Element Overhaul** (2026-04-24). Primary stats (Essence/Soul/Body) removed — see [[Primary Stats]].

## Stacking Types

| Type | How It Applies |
|---|---|
| **Increased** `#% increased` | Additive %; all sources sum then apply once |
| **More** `#% more` | Multiplicative; each source multiplies independently |
| **Flat** `+#` | Flat add after all base calculations |

```
Final = base × (1 + Σ increased%) × Π more_mult + Σ flat
```

## Qi Generation Speed

`qi/s = BASE_RATE × lawCultMult × (1 + Σ qi_speed_increased) × Π qi_speed_more × focusMult (when focusing)`

- `BASE_RATE = 1` qi/s
- `focusMult` = `qi_focus_mult` stat (base 300%)

## Combat Stats

| Stat | Notes |
|---|---|
| `health` | `max(100, realmIndex × 200)` — placeholder |
| `physical_damage` | Flat bonus to physical-bucket attacks |
| `elemental_damage` | Flat bonus to elemental-bucket attacks |
| `damage_all` | Flat bonus to all attacks |
| `default_attack_damage` | Multiplier on basic attacks only |
| `secret_technique_damage` | Multiplier on technique damage only |
| `defense` | Armour curve: `mitigation = armour / (armour + 10 × damage)`, cap 0.9 |
| `elemental_defense` | Same armour curve for elemental hits |
| `exploit_chance` | Per-attack roll %; base 0 |
| `exploit_attack_mult` | Exploit hit multiplier; base 150% |
| `defense_penetration` | Fraction of enemy DEF ignored before armour curve; 0–1 |
| `incoming_damage_reduction` | Fraction subtracted from incoming dmg before armour curve; cap 0.9 |

## Activity Stats

| Stat | Notes |
|---|---|
| `qi_focus_mult` | Focus mode multiplier; base 300% |
| `harvest_speed` | Flat additive on BASE_GATHER_SPEED |
| `harvest_luck` | Per-cycle % chance for +1 quantity |
| `mining_speed` / `mining_luck` | Mirror of harvest stats |
| `heavenly_qi_mult` | Applies only during ad boost |
| `buff_effect` | Scales Defend/Dodge buff magnitude |
| `buff_duration` | Scales buff charge count |

## Removed Stats

`essence`, `soul`, `body`, `psychic_damage`, `soul_toughness` — all removed in 2026-04-24 overhaul.

## Related

- [[Primary Stats]]
- [[Elements]]
- [[Laws]]
