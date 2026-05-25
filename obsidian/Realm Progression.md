# Realm Progression

Based on **Martial Peak** (武炼巅峰). 13 major realms, 46 total sub-stages.

---

## Realm Overview

| # | Major Realm | Sub-stages |
|---|---|---|
| 1 | Tempered Body | 10 Layers |
| 2 | Qi Transformation | Early / Middle / Late / Peak |
| 3 | True Element | Early / Middle / Late / Peak |
| 4 | Separation & Reunion | 1st / 2nd / 3rd |
| 5 | Immortal Ascension | 1st / 2nd / 3rd |
| 6 | Saint | Early / Middle / Late |
| 7 | Saint King | 1st / 2nd / 3rd |
| 8 | Origin Returning | 1st / 2nd / 3rd |
| 9 | Origin King | 1st / 2nd / 3rd |
| 10 | Void King | 1st / 2nd / 3rd |
| 11 | Dao Source | 1st / 2nd / 3rd |
| 12 | Emperor Realm | 1st / 2nd / 3rd |
| 13 | Open Heaven | Layer 1–6 (Low 1-3 / Mid 4-5 / High 6) |

---

## Qi Costs

### Tempered Body

| Stage | Cost | Stage | Cost |
|---|---|---|---|
| L1 | 50 | L6 | 850 |
| L2 | 100 | L7 | 1,400 |
| L3 | 175 | L8 | 2,400 |
| L4 | 300 | L9 | 4,000 |
| L5 | 500 | L10 | 6,500 |

### Qi Transformation

| Stage | Cost |
|---|---|
| Early | 10,000 |
| Middle | 17,500 |
| Late | 30,000 |
| Peak | 50,000 |

### True Element

| Stage | Cost |
|---|---|
| Early | 75,000 |
| Middle | 130,000 |
| Late | 225,000 |
| Peak | 380,000 |

### Separation & Reunion

| Stage | Cost |
|---|---|
| 1st | 625,000 |
| 2nd | 1,000,000 |
| 3rd | 1,700,000 |

### Immortal Ascension

| Stage | Cost |
|---|---|
| 1st | 2,800,000 |
| 2nd | 4,700,000 |
| 3rd | 8,000,000 |

### Saint

| Stage | Cost |
|---|---|
| Early | 13,000,000 |
| Middle | 22,000,000 |
| Late | 35,000,000 |

### Saint King

| Stage | Cost |
|---|---|
| 1st | 58,000,000 |
| 2nd | 95,000,000 |
| 3rd | 160,000,000 |

### Origin Returning

| Stage | Cost |
|---|---|
| 1st | 260,000,000 |
| 2nd | 430,000,000 |
| 3rd | 700,000,000 |

### Origin King

| Stage | Cost |
|---|---|
| 1st | 1,150,000,000 |
| 2nd | 1,900,000,000 |
| 3rd | 3,200,000,000 |

### Void King

| Stage | Cost |
|---|---|
| 1st | 5,200,000,000 |
| 2nd | 8,500,000,000 |
| 3rd | 14,000,000,000 |

### Dao Source

| Stage | Cost |
|---|---|
| 1st | 23,000,000,000 |
| 2nd | 38,000,000,000 |
| 3rd | 62,000,000,000 |

### Emperor Realm

| Stage | Cost |
|---|---|
| 1st | 100,000,000,000 |
| 2nd | 170,000,000,000 |
| 3rd | 280,000,000,000 |

### Open Heaven

| Layer | Cost | Tier |
|---|---|---|
| 1 | 460,000,000,000 | Low |
| 2 | 750,000,000,000 | Low |
| 3 | 1,200,000,000,000 | Low |
| 4 | 2,000,000,000,000 | Mid |
| 5 | 3,300,000,000,000 | Mid |
| 6 | 5,500,000,000,000 | High |

---

## Major-Realm Breakthrough Gate (Qi/s Requirement)

Ascending between major realms requires a minimum **qi/s** rate. Sub-stage transitions within the same major realm have no gate.

**Formula:** `required qi/s = nextRealm.cost × 0.0025 × 0.5^ord`
- `ord` = 0-based ordinal of the major transition
- Early gates are strictest; later gates soften automatically as costs grow

**Behaviour when gated:**
- Qi accumulation clamped at 100% of current realm cost
- Progress bar sits full, pulses red, shows inline `⛔ Qi/s <current> / <required>` chip
- Gate clears on next tick once live qi/s meets requirement

**Implementation:** `getMajorBreakthroughRate(fromIndex)` in `src/data/realms.js`; gate check in `useCultivation.js` tick; `gateRef` to `RealmProgressBar.jsx`.

---

## Related

- [[Cultivation System]] · [[Laws]] · [[Secret Techniques]]
