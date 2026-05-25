# Secret Technique Catalogue

Content reference for the 60-entry secret-tech pool. Code: `src/data/techniques.js` — keep in parity.

Design DD: [[Secret Techniques]]. This file lists *what each entry does*.

Per-quality distribution: 4 Attack + 2 Heal + 2 Defend + 2 Dodge + 2 Expose = 12 per quality × 5 = **60 total**.

Cooldown bands:

| Type | Slots and CDs |
|---|---|
| Attack | `_1` 5.0s · `_2` 5.0s · `_3` 5.5s · `_4` 5.5s |
| Heal   | `_1` 6.0s · `_2` 6.5s |
| Expose | `_1` 6.0s · `_2` 6.5s |
| Defend | `_1` 6.5s · `_2` 7.0s |
| Dodge  | `_1` 6.5s · `_2` 7.0s |

---

## Iron

| Icon | Slot | Name | Stats | Special |
|---|---|---|---|---|
| 👊 | `iron_attack_1` | **Iron Fist** | bonus 100, physMult 1.0 | — |
| 🔥 | `iron_attack_2` | **Flame Palm** | bonus 100, elemMult 1.0 | — |
| 🌋 | `iron_attack_3` | **Flaming Slash** | physMult 0.6, elemMult 0.6 | — |
| 🦔 | `iron_attack_4` | **Spiked Shell** | — | Deal 20% defense as damage |
| 🩹 | `iron_heal_1` | **Apply Bandage** | healPercent 10% | — |
| ✋ | `iron_heal_2` | **Healing Hand** | elemMult 1.0 | pure elem-stat heal |
| 🪨 | `iron_defend_1` | **Stone Stance** | defMult ×1.4, 2 hits | — |
| 🌳 | `iron_defend_2` | **Iron Bark Form** | defMult ×1.2, 4 hits | — |
| 🍃 | `iron_dodge_1` | **Lithe Step** | 15% / 3 hits | — |
| 🐍 | `iron_dodge_2` | **Coiled Sway** | 20% / 2 hits | Multiplies defenses ×1.2 while active |
| 👁️ | `iron_expose_1` | **Read the Opening** | +15% exploit, 3 player hits | — |
| 🧘 | `iron_expose_2` | **Settle the Mind** | 20% dmg reduction, 3 enemy hits | — |

## Bronze

| Icon | Slot | Name | Stats | Special |
|---|---|---|---|---|
| ⚙️ | `bronze_attack_1` | **Steel Fist** | bonus 500, physMult 1.5 | — |
| 💧 | `bronze_attack_2` | **Water Jet** | bonus 500, elemMult 1.5 | — |
| 🫀 | `bronze_attack_3` | **Heart Furnace Strike** | physMult 0.2, elemMult 0.2 | Deal 20% max HP as damage |
| 🪞 | `bronze_attack_4` | **Mirror Lance** | — | Deal 30% elemental defense as damage |
| 🌬️ | `bronze_heal_1` | **Steady Breath** | healPercent 15% | — |
| 🌊 | `bronze_heal_2` | **Convergent Stream** | physMult 0.7, elemMult 0.7 | pure stat-scaled heal |
| 🛡️ | `bronze_defend_1` | **Tempered Aegis** | defMult ×1.6, 2 hits | Heal 5% HP on cast |
| 🧱 | `bronze_defend_2` | **Patient Wall** | defMult ×1.4, 4 hits | — |
| 🌙 | `bronze_dodge_1` | **Crescent Slide** | 25% / 3 hits | — |
| ↩️ | `bronze_dodge_2` | **Counter Step** | 30% / 2 hits | +30% damage on next attack after dodge |
| 📌 | `bronze_expose_1` | **Glaring Pin** | +20% exploit, 10% def pen, 2 player hits | — |
| 🌫️ | `bronze_expose_2` | **Veiled Stance** | 25% dmg reduction, 3 enemy hits | — |

## Silver

| Icon | Slot | Name | Stats | Special |
|---|---|---|---|---|
| 🗡️ | `silver_attack_1` | **Steel Slash** | bonus 2000, physMult 2.0 | — |
| 🪷 | `silver_attack_2` | **Blooming Lotus** | bonus 2000, elemMult 2.0 | — |
| ☯️ | `silver_attack_3` | **Twin Crescents** | physMult 1.5, elemMult 1.5 | — |
| ⚡ | `silver_attack_4` | **Quickening Strike** | physMult 1.0, elemMult 1.0 | Reduces other Attack CDs by 30% on cast |
| 💗 | `silver_heal_1` | **Restorative Pulse** | healPercent 20% | — |
| 🌹 | `silver_heal_2` | **Lifebloom Lash** | physMult 0.9, elemMult 0.9 | Deals 50% of healing as damage to enemy |
| ⛰️ | `silver_defend_1` | **Centred Mountain** | defMult ×1.6, 2 hits | Reduces ALL other CDs by 20% on cast |
| 🛡️ | `silver_defend_2` | **Layered Bulwark** | defMult ×1.5, 4 hits | +10% incoming dmg reduction while active |
| 🌸 | `silver_dodge_1` | **Drifting Petal** | 30% / 3 hits | — |
| 🦚 | `silver_dodge_2` | **Phoenix Feint** | 30% / 2 hits | Heal 5% max HP per successful dodge |
| 👁️‍🗨️ | `silver_expose_1` | **Soul-Marking Glare** | +20% exploit, 20% def pen, 3 player hits | **Applies to Attack secret techs** |
| 🌁 | `silver_expose_2` | **Misted Veil** | 30% dmg reduction, 3 enemy hits | — |

## Gold

| Icon | Slot | Name | Stats | Special |
|---|---|---|---|---|
| ☄️ | `gold_attack_1` | **Heaven-Cleaving Edge** | bonus 4000, physMult 3.0 | — |
| 🐦‍🔥 | `gold_attack_2` | **Phoenix Cry** | bonus 4000, elemMult 3.0 | — |
| 🩸 | `gold_attack_3` | **Bloodroot Lance** | physMult 2.0, elemMult 1.5 | Deal 5% max HP as damage |
| 🌊 | `gold_attack_4` | **Cascading Step** | physMult 1.0, elemMult 1.0 | Reduces other Attack CDs by 30% on cast |
| 🪬 | `gold_heal_1` | **Mending Ward** | healPercent 20% | Arms next dodge to heal 10% max HP |
| 🌺 | `gold_heal_2` | **Twin Bloom Strike** | physMult 1.0, elemMult 1.0 | Deals 60% of healing as damage to enemy |
| 🗿 | `gold_defend_1` | **Stoneblood Mantle** | defMult ×1.7, 2 hits | Heal 50% of mitigated damage while active |
| 💎 | `gold_defend_2` | **Adamant Wall** | defMult ×1.5, 4 hits | +20% incoming dmg reduction while active |
| 🪞 | `gold_dodge_1` | **Mirror Sway** | 40% / 2 hits | Reflects would-have-been damage on dodge |
| 💨 | `gold_dodge_2` | **Wind Step** | 30% / 4 hits | Reduces all CDs by 10% per successful dodge |
| ✴️ | `gold_expose_1` | **Sunder Sigil** | 40% def pen, 5 player hits | **Applies to Attack secret techs** |
| 🔄 | `gold_expose_2` | **Rebound Shroud** | 30% dmg reduction, 4 enemy hits | Reflects 50% of mitigated damage to enemy |

## Transcendent

| Icon | Slot | Name | Stats | Special |
|---|---|---|---|---|
| ⚔️ | `transcendent_attack_1` | **Severing Heaven** | bonus 10000, physMult 5.0 | — |
| 🌟 | `transcendent_attack_2` | **Calamity Star** | bonus 10000, elemMult 5.0 | — |
| ♾️ | `transcendent_attack_3` | **Eternal Cascade** | physMult 2.5, elemMult 2.5 | Reduces other Attack CDs by 40% on cast |
| 🦴 | `transcendent_attack_4` | **Iron-Bone Smite** | physMult 1.0, elemMult 1.0 | Deal 20% defense as damage |
| 🕉️ | `transcendent_heal_1` | **Prelude of Mending** | healPercent 25% | Next Heal cast is doubled |
| 🔁 | `transcendent_heal_2` | **Cycle of the Phoenix** | healPercent 10%, physMult 1.0, elemMult 1.0 | Deals 100% of healing as damage to enemy |
| 💠 | `transcendent_defend_1` | **Diamond Mantle** | defMult ×2.0, 3 hits | +25% incoming dmg reduction while active |
| ☁️ | `transcendent_defend_2` | **Sky-Veil Stance** | defMult ×2.5, 3 hits | +20% passive dodge while active |
| 🌑 | `transcendent_dodge_1` | **Shadow Reversal** | 60% / 2 hits | Reflects would-have-been damage on dodge |
| 🏞️ | `transcendent_dodge_2` | **Hundred-River Step** | 50% / 4 hits | Reduces all CDs by 20% per successful dodge |
| ⚫ | `transcendent_expose_1` | **Oblivion Mark** | +25% exploit, 60% def pen, 5 player hits | **Applies to Attack secret techs** |
| 🪐 | `transcendent_expose_2` | **Shroud of Inverted Heavens** | 40% dmg reduction, 2 enemy hits | Defenses use higher of phys/elem |

---

## Notes

- **Expose buff scope.** Default: applies to basic attacks only. Entries marked "Applies to Attack secret techs" (`silver/gold/transcendent _expose_1`) opt in via `exposeBuffApplyToAttack` flag. The wood-set bonus `exposeBuffsApplyToAttack` opts in globally.
- **Heal-to-damage** (`_heal_2` Silver+). Damage computed from *actual* heal amount (post-double from Prelude of Mending, post `healing_received` mult, pre HP cap).
- **Reflect on dodge** (`gold/transcendent _dodge_1`). Reflects post-incoming-dmg-reduction value, so `incomingDamageReduction` reduces both the hit and the reflect.
- **CD reduction on cast** applies to other slots only — never the casting slot itself.
