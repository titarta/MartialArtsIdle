# Reincarnation

Reincarnation is the prestige system. After reaching the **Saint realm (index 24)**, the player can reincarnate: their cultivation, producers, and upgrades reset; karma and the Eternal Tree persist.

---

## Karma

Karma is earned **continuously** based on total Qi generated **this life** (not at realm milestones).

### Formula

The **k-th karma point** (0-indexed) costs:

```
cost(k) = 1,000,000 + k × 10,000  Qi earned this life
```

Total Qi required for **n karma points**:

```
Q(n) = Σ(k=0..n-1)(1,000,000 + k × 10,000)
     = 1,000,000·n + 10,000·n(n−1)/2
     = 5,000n² + 995,000n
```

**Inverse** (karma from total Qi earned this life):

```
n = floor(( −995,000 + √(990,025,000,000 + 20,000·Q) ) / 10,000)
```

### First few thresholds

| Karma earned | Qi needed (total this life) |
|:---:|:---|
| 1  | 1,000,000 |
| 2  | 2,010,000 |
| 3  | 3,030,000 |
| 5  | 5,100,000 |
| 10 | 10,450,000 |
| 20 | 21,900,000 |

---

## Eternal Tree

7 nodes in a 2-column grid. Each node costs **1 karma**.

### Layout

```
Col:  0                    1
Row0: [n_1 Devoted Path] → [n_2 Star Disciple]
       ↓
Row1: [n_3 Crystalline Focus] → [n_4 Discerning Eye]
       ↓
Row2: [n_5 Frugal Cultivation]
       ↓
Row3: [n_6 Sect Resonance]
       ↓
Row4: [n_7 Senior's Guidance]
```

Edges only go **right** or **down**. A node is purchasable when all its prereqs are owned.

### Node Table

| # | ID | Name | Effect | Prereq |
|---|---|---|---|---|
| 1 | `n_1` | Devoted Path | +0.1% Qi/s per karma spent on the tree | — |
| 2 | `n_2` | Star Disciple | Unlock Star Disciple Cultivation *(coming soon)* | n_1 |
| 3 | `n_3` | Crystalline Focus | +20% INCREASED Qi Crystal bonus multiplier | n_1 |
| 4 | `n_4` | Discerning Eye | Common Qi Sparks are 40% less likely (weight ×0.6) | n_3 |
| 5 | `n_5` | Frugal Cultivation | 10% reduced producer purchase cost | n_3 |
| 6 | `n_6` | Sect Resonance | Each producer: +1% INCREASED Qi/s per owned of that same type | n_5 |
| 7 | `n_7` | Senior's Guidance | Each producer: +0.5% INCREASED Qi/s per owned of the previous producer type | n_6 |

#### Node 1 — Devoted Path
The `treeQiMult` grows as the player buys more nodes: with all 7 purchased the tree Qi bonus is **+0.7%** (7 × 0.1%).

#### Node 2 — Star Disciple
Purchasable but has no functional effect until a future update.

#### Node 3 — Crystalline Focus
The standard crystal bonus (level × 1.5%) is multiplied by 1.20 → effective rate per level becomes **1.8%**.

#### Node 4 — Discerning Eye
The common-spark weight is reduced from 65 to 39 (×0.6). Combined with the fixed uncommon weight (35), common draws go from ~65% to ~53% of outcomes.

#### Node 6 — Sect Resonance (self-synergy)
With 50 units of one producer type: bonus = 1 + 50 × 0.01 = **×1.50** to that producer's Qi/s.

#### Node 7 — Senior's Guidance (cross-synergy)
With 100 units of PRODUCERS[i−1]: bonus = 1 + 100 × 0.005 = **×1.50** to producer[i]'s Qi/s.

---

## What Persists / Wipes on Reincarnation

### Persists
- **Karma** (unspent balance)
- **Tree purchases** (all purchased node IDs)
- **Karma earned this life counter** resets to 0 (fresh life)
- **Law library** (all owned laws; active selection resets)
- **Pinned alchemy recipes**
- **Lifetime stats**

### Wipes
- Cultivation progress (realm index, Qi)
- Producers and upgrades
- Qi Sparks active/pending
- Crystal reservoir
- Run stats

---

## Implementation Notes

- Karma hook: `src/hooks/useReincarnationKarma.js`
- Tree hook: `src/hooks/useReincarnationTree.js`
- Tree data: `src/data/reincarnationTree.js`
- Tree UI: `src/components/EternalTreeScreen.jsx`
- Save wipe: `src/systems/save.js → wipeReincarnation()`

---

## Future

- **Star Disciple Cultivation** (n_2) — new cultivation mode with a different Qi scaling curve, planned post-v1 launch.
