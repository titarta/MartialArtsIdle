# Qi Sparks — Implementation Status

**Status:** Phases 1–3 shipped (all mechanics done). Phase 4 polish pending.
**Last updated:** 2026-04-28

---

## Shipped

### Phase 1 — Common buffs (8 cards)
Pick-1-of-2 on every layer breakthrough. 30s auto-skip. Pity counter (10 offers → guaranteed rare). Free reroll + paid BL reroll (3→6→12 BL).

| Card | Effect |
|---|---|
| Quick Burst | Instant qi worth 30s of current qi/s |
| Surging Stream | +50% qi/s for 30s |
| Steady Stream | +20% qi/s for 60s |
| Inner Calm | +10% qi/s until next breakthrough |
| Focus Surge | +30% Focus multiplier for 60s |
| Painless Ascension | Next breakthrough costs no qi |
| Lingering Focus | qi/s continues at 50% for 5s after Focus release (60s window) |
| Echo of Insight | +5% qi/s for next 3 layer breakthroughs |

### Phase 2 — Uncommon permanents (6 cards)
Persist entire run, stack additively, reset on reincarnation.

| Card | Effect |
|---|---|
| Steady Cultivation | +1 base qi/s per stack |
| Sharper Focus | +5% Focus multiplier per stack |
| Enduring Stream | +2% qi/s per stack |
| Patience of Stone | Major-realm gate qi/s requirement −5% per stack (cap 90%) |
| Heaven's Bond | +10% offline qi per stack |
| Resonant Soul | +0.5% qi/s per stack per layer breakthrough since pick |

### Phase 3 — Mechanic cards (4 mechanics × 5 tiers = 20 rare cards)
All 4 mechanics fully shipped: **Consecutive Focus**, **Crystal Click**, **Divine Qi**, **Pattern Clicking**.

Pool weights: 65% common / 35% uncommon / 0% rare (rare draws enabled once eligible). T1 unlocks AND T2–T5 upgrades have the same rare draw rate.

---

## Phase 4 — Polish (pending)
- Visual rarity flourishes (particles/glow/chime per tier)
- Sound design per rarity
- Tutorial hint on first offer
- 30s auto-skip visible countdown ring
- Pity-timer indicator approaching guaranteed rare
- Lingering Focus chip pulse during 5s residual window
- Painless Ascension toast on consumption

---

## Architecture decisions

- Rare tier = mechanic unlock + upgrade (tier replaces tier, not stacked)
- Reroll: 1 free → 3/6/12 BL; cap 12
- All spark state is per-run; resets on reincarnation
- `data/qiSparks.js` — card pool; `hooks/useQiSparks.js` — state/effects

## Related

- [[Cultivation System]]
- [[Reincarnation]]
