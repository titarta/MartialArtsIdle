# Combat Tuning — Pill DR Curve + Combat Simulator

**Status:** Proposal — ready to implement
**Date:** 2026-04-27
**Origin:** Design session — combat feedback + permanent-pill scaling concern
**Predecessor:** [[Early Game Hook — Engagement Pass]] (different pass; this targets fight-duration / mid-late game feel)

---

## Motivation

Two intertwined problems surfaced in design review:

**(1) Pills break permanent scaling.** Pills give flat permanent stats per consumption with no cap. Herbs auto-farm offline. Therefore: time + auto-farm = unbounded permanent stats. A weekend of AFK gathering can give +110,000 phys damage from Transcendent Fist Pills alone. This invalidates any enemy HP curve and makes "at-tier" tuning meaningless.

**(2) Fights feel 8/80.** Player intuition: combat resolves in 1–2 turn one-shot trades. Either you steamroll or you die. The 60 hand-authored techniques, law triggers, set bonuses, and exposeBuff machinery never get to play out because fights end before CDs cycle.

These are the same problem. Without a bounded player power curve, fight duration is unstable — so they must be solved together.

---

## Decision

- **Adopt Option 1 — Diminishing Returns curve on pill permanent stats.** Smallest change, no save migration, no UI rework. Other options (realm-gated caps, revert to consumables) are still viable but rejected for now in favour of shipping fast.
- **Build a combat simulator** to actually measure fight duration across regions, then tune enemy HP/ATK curves and DR `k` until at-tier fights land in the **6–10 player turn target**.

---

## Target Fight Profile

Designer-facing target. Tune toward this; verify by simulator.

| Player vs Region | Target outcome | Turns |
|---|---|---|
| At-tier (player realm == region.minRealmIndex) | Win, but with HP loss | **6–10 player turns** |
| Slightly over (+2 realms) | Win, comfortable | 3–5 turns |
| Heavily over (+5 realms) | Steamroll | 1–2 turns |
| Slightly under (−2 realms) | Loss, close fight | 6–10 turns then die |
| Heavily under (−5 realms) | Loss, fast | 2–3 turns |

The "at-tier 6–10 turn fight" is the load-bearing case — that's where build expression has room to surface (CDs cycle, buffs activate, heal triggers, exploit chains can fire).

---

## Implementation Plan

### Phase 1 — Pill DR curve (small change, ship first)

**File:** `src/hooks/usePills.js`
**Location:** `getStatModifiers` callback (lines 189–198)

**Current:**
```js
const getStatModifiers = useCallback(() => {
  const mods = {};
  for (const [stat, total] of Object.entries(permanentStats)) {
    if (stat === 'qi_speed') continue;
    if (!total) continue;
    const modType = INCREASED_STATS.has(stat) ? 'increased' : 'flat';
    mods[stat] = [{ type: modType, value: total }];
  }
  return mods;
}, [permanentStats]);
```

**Proposed:**
```js
// Diminishing-returns curve: effective = raw / (1 + raw × k)
// Asymptote = 1/k. With k = 0.0001, cap ≈ 10,000 per stat.
// Tunable per-stat via PILL_DR_K table.
const PILL_DR_K = {
  // Combat — bounded so pills stop dwarfing gear scaling.
  physical_damage:   0.0001,  // soft cap ~10,000
  elemental_damage:  0.0001,
  defense:           0.0002,  // soft cap ~5,000 (defense ramps faster on PoE armour curve)
  elemental_defense: 0.0002,
  health:            0.00001, // soft cap ~100,000 (HP needs more headroom)
  // exploit_chance bounded separately by stat system (max 100); leave linear
  // qi_speed handled by getQiMult — separate channel
};
const DEFAULT_K = 0.0001;

function applyDR(stat, raw) {
  const k = PILL_DR_K[stat] ?? DEFAULT_K;
  if (!k) return raw;
  return raw / (1 + raw * k);
}

const getStatModifiers = useCallback(() => {
  const mods = {};
  for (const [stat, total] of Object.entries(permanentStats)) {
    if (stat === 'qi_speed') continue;
    if (!total) continue;
    const effective = applyDR(stat, total);
    const modType = INCREASED_STATS.has(stat) ? 'increased' : 'flat';
    mods[stat] = [{ type: modType, value: effective }];
  }
  return mods;
}, [permanentStats]);
```

**Curve shape with `k = 0.0001`:**

| Raw pill stat | Effective |
|---|---|
| 100 | 99 |
| 500 | 476 |
| 1,000 | 909 |
| 2,500 | 2,000 |
| 5,000 | 3,333 |
| 10,000 | 5,000 |
| 50,000 | 8,333 |
| 100,000 | 9,091 |
| ∞ | 10,000 (asymptote) |

Pills always help (derivative > 0). Diminishing return is steep enough that grinders aren't grossly outperforming non-grinders.

**Tooltip change** (`src/screens/CharacterScreen.jsx` or wherever pills surface): show effective value alongside raw, e.g., `"Total: 12,400 → Effective: 5,565 (DR)"`.

**Save compatibility:** zero migration. `permanentStats` localStorage entries still hold raw sums; DR is applied at read time.

### Phase 2 — Combat simulator script

**Path:** `scripts/sim-combat.mjs` (new file)

**Approach:** mirror `useCombat.js` turn loop in pure Node. No React, no rAF — synchronous turn-by-turn resolution with the same damage formulas.

**Inputs (scenario config):**
```js
{
  realmIndex,           // player's current realm
  regionIndex,          // region.minRealmIndex
  pillBudget,           // sum of pill stats per type (post-DR)
  artefactPower,        // canonical at-tier gear stat sum
  lawId,                // active law (for damage mults / triggers)
  equippedTechs: [t1, t2, t3],  // by id
}
```

**Canonical at-tier player model** (the crucial assumption):
- HP base = 100 + DR-curved pill HP + artefact HP scaled by realmIndex
- Phys/Elem damage = 50 floor + DR-curved pill damage + artefact damage
- Defense = DR-curved pill def + artefact def
- Exploit chance = 5 base + law/artefact contribution
- Cooldowns from technique data, modified by lawCdTypeMults
- Use the actual `computeStat` stacking formula from `data/stats.js`

**Player power-curve assumption** (label as ASSUMPTION in script, validate against real saves later):
```
artefactStatAtRealm(r) = 50 + r × 30   // each realm tier adds ~30 stat from gear
playerHpAtRealm(r)     = 100 + r × 50  // ~50 HP per realm from gear
pillBudgetAtRealm(r)   = r × 100       // typical pill consumption per realm tier
```

**Simulator outputs (per region):**
```
region 0  (Outer Sect): at-tier WIN  — 4 turns,  damage taken 12%
region 4  (Borderland): at-tier WIN  — 6 turns,  damage taken 38%
region 10 (Qi-Vein):    at-tier LOSS — 3 turns,  player died turn 3
region 18 (Shattered):  at-tier WIN  — 11 turns, damage taken 71%
...
```

**Acceptance for Phase 2:** simulator runs without crashing across all 27 regions, produces a CSV/table of results.

### Phase 3 — Tune to target

Iterate on these knobs in the simulator until target fight profile is hit:

1. **Enemy HP base** (currently `150 × 1.12^region` in `useCombat.js:383`)
2. **Enemy ATK base** (currently `18 × 1.12^region` in `useCombat.js:385`)
3. **Enemy DEF base** (`ENEMY_DEF_PER_REGION = 5` in `useCombat.js:20`)
4. **DR `k` per stat** (Phase 1 default values)
5. **Basic-attack share of damage** — if too dominant, weight more damage into secret techs by reducing `physical_damage` floor or raising secret tech `bonus` values

**Tuning loop:**
1. Run sim → write results table.
2. Identify regions where fights ended in 1–2 turns or 15+ turns.
3. Adjust the ONE knob most likely responsible (usually enemy HP if too short, enemy ATK if too long).
4. Re-run.
5. Stop when 80%+ of regions hit the target band.

**Acceptance for Phase 3:** at-tier fights land in 6–10 turns for ≥80% of regions; over-leveled (+5 realms) clears in ≤3 turns; under-leveled (−5 realms) loses in ≤3 turns.

### Phase 4 — Apply tuned values

Edit `useCombat.js` constants and any pill DR `k` values to the simulator-derived numbers. Open the game, eyeball-test 3–4 fights at different tiers, verify simulator predictions hold.

---

## Risks & Open Questions

- **Canonical at-tier assumption.** The simulator's player model is one assumed build. A Wood/Dodge build plays totally differently from a Fire/Exploit build. Mitigation: run simulator with 3–4 archetype builds; tune to the *median* not the strongest.
- **Set bonuses + law triggers + artefact uniques are huge surface area.** First-pass simulator should ignore set 4-piece flags, law triggers, etc. Tune off the base case. Add complexity later.
- **DR `k` tooltip clarity.** Players seeing "raw 12,400 → effective 5,565" needs explaining. Pre-write a one-line tooltip: `"Pill stats hit diminishing returns past their cap to keep build power balanced."`
- **Existing saves with massive pill stockpiles.** Players who already over-pilled get *softer* nerfs than a hard cap. DR keeps their power roughly where they expect at low totals; only extreme stockpilers see meaningful reduction. No migration needed but warn in patch notes.
- **Realm-gated caps still on the table.** If DR curve feels arbitrary in playtest, fall back to Option 2 (per-realm soft caps). Re-evaluate after Phase 4.

---

## Resume Checklist (for tomorrow)

- [ ] Phase 1 — Edit `src/hooks/usePills.js` `getStatModifiers` to apply DR. ~15 lines.
- [ ] Phase 1 — Add effective-vs-raw display in pill UI tooltip.
- [ ] Phase 2 — Create `scripts/sim-combat.mjs`. Mirror `useCombat.js` turn loop. Pure Node, no React. ~300 lines.
- [ ] Phase 2 — Verify sim damage numbers match in-game numbers for a known scenario (sanity check before tuning).
- [ ] Phase 3 — Run baseline. Adjust enemy curve + DR `k` to hit 6–10 turn target at-tier.
- [ ] Phase 4 — Apply tuned values, eyeball-test in browser.
- [ ] Update `CLAUDE.md` / project memory with the chosen DR `k` values once locked.

## Out of Scope (deferred)

These were discussed in the same session but belong to follow-up proposals:

- **Manual technique cast** (active-idle hybrid input verb). Requires the tuning above to land first.
- **Tap-rhythm mini-game per technique** — bonus damage on perfect tap, technique-shaped patterns.
- **Crafted combat consumables** — pre-fight buff potions + in-combat panic potions on real-time CDs.
- **Damage breakdown tooltip** — surface the formula stack so EXPLOIT numbers are legible.
- **Audio cues for EXPLOIT / death / heal.**
- **Offline catch-up combat for cleared regions** — at 0.2× live, mirroring `OFFLINE_GAIN_MULT`.

These all become more meaningful AFTER fight duration and pill scaling are bounded.
