# Playthrough Simulation — 2026-05-01

**Profile:** Fresh first life, no carryover, 25% active / 75% offline, idx 0 → 50 (Open Heaven L6).
**Anchored to:** commit `a14d8db` + v3 enemy-curve fix. Key prior balance: `OFFLINE_QI_MULTIPLIER = 0.20`, `RATE_MULTIPLIER = 0.10` gather/mine throttle, Pack Wolf atk 3.0 → 1.0.

> **v3 correction:** previous models severely underestimated player power (pills, law uniques, artefact sets). Realistic endgame: ~200K HP / ~35K DPS / ~20K def / 0.8 dmg-red. Enemy curve also softened: `1.12 → 1.10` exponent + W6 atkMult halved + idx 50 hp/atk cut.

---

## Key Formulas (sourced from code)

| Formula | Value |
|---|---|
| Online tick | `(BASE_RATE + crystalQiBonus) × law × pills × artefact × spark × tree × focus × ad` |
| Offline rate | `BASE_RATE × law × artefact × spark × (1+pillQiBonus) × 0.20` (no crystal flat) |
| Crystal level cost | `25 × level^1.30` |
| Crystal bonus | `level × (level + 3) / 2` qi/s |
| Major gate | `next.cost × 0.0025 × 0.5^ordinal` qi/s required |
| Enemy scaling | `floor(150/18 × 1.10^regionIdx × statMult)` |

---

## Headline Numbers

| Metric | Result |
|---|---|
| Total time to OH L6 (idx 50) | **35.0 days** |
| Final crystal level | L1779 → +1.585M qi/s flat |
| Final focused qi/s | 55.85M qi/s |
| All 12 major breakthrough gates | ✅ passed (517–2264% margin) |
| Combat softlocks (greedy player) | 30+ regions at risk; W6 hardest |

**Key insight:** Qi progression is trivially fast once the crystal is modeled. Combat is the real bottleneck — realm progression outpaces pill/gear farming.

---

## Major Realm Timeline (abridged)

| Time | Realm (idx) | Notes |
|---|---|---|
| T=31.6m | Qi Transformation Early (10) | First law. Gate ✅ +560% margin. |
| T=1.19h | True Element Early (14) | Bronze law (1.20×). Gate ✅ +517%. |
| T=2.8h | Separation & Reunion 1st (18) | Silver law (1.50×). W2 unlocks. |
| T=7.8h | Saint Early (24) | Gold law (1.85×). W3 unlocks. First reincarnation point. |
| T=19.3h | Origin Returning 1st (30) | Gold law. W4 unlocks. Gate ✅ +1726%. |
| T=29.0h | Origin King 1st (33) | Trans law (2.25×). Gate ✅ +2102%. |
| T=46.9h | Void King 1st (36) | W5 unlocks. |
| T=13.6d | Open Heaven L1 (45) | W6 unlocks. Trans gear. Gate ✅ +2264%. |
| **T=35.0d** | **Open Heaven L6 (50)** | Crystal L1779. Focused 55.85M qi/s. |

---

## Combat Balance — V3 Findings

All 27 region-modal encounters now in healthy bands with realistic player power.

| Region stage | Expected outcome (mid-tier player) |
|---|---|
| W1–W2 (idx 0–13) | Tight early (⚠ Pack Wolf at TB L5 intentionally challenging) |
| W3–W4 (idx 14–33) | Generally winnable with basic pills + Iron/Bronze gear |
| W5 (idx 34–44) | Requires Gold gear + law uniques |
| W6 (idx 45–50) | OH Sovereign (idx 50): max-build kills in 10T / dies in 17T (tense); mid-build walls (design intent) |

**Enemy scaling post-fix:** `1.10^50 = 117×` amplifier. W6 `atkMult` halved (was 16–32, now 8–16). idx 50 final-region enemies cut separately.
