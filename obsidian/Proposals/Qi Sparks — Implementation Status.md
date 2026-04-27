# Qi Sparks — Implementation Status

**Status:** Phase 1 + 1B shipped — 8 common cards live in production
**Last commit:** 726d9ea (fix: Focus multiplier badge reflects Focus Surge bonus)
**Date:** 2026-04-27

---

## What's done (Phase 1 + 1B)

### System
- Pick-1-of-2 card flow fires on every layer breakthrough
- 2-card offer modal with rarity-coloured borders, free reroll + paid Blood Lotus reroll (3 → 6 → 12 BL escalating)
- 30s auto-skip-to-leftmost so cultivation never blocks
- Pity counter wired (10 offers without rare → guaranteed rare next) — inert until rare cards ship
- Persistence: active sparks + pending offer + pity counter survive page reload
- Reincarnation reset clears all spark state via `wipeSave()`

### Card pool (8 commons)
All functional with proper UI feedback through qi/s readout + focus badge.

| Card | Effect |
|---|---|
| Quick Burst | Instant qi worth 30s of current qi/s |
| Surging Stream | +50% qi/s for 30s |
| Steady Stream | +20% qi/s for 60s |
| Inner Calm | +10% qi/s until next breakthrough |
| Focus Surge | +30% Focus multiplier for 60s |
| Painless Ascension | Next breakthrough costs no qi |
| Lingering Focus | 60s window: qi/s continues at 50% for 5s after Focus release |
| Echo of Insight | +5% qi/s for the next 3 layer breakthroughs |

### UI / feedback
- Active-spark chips in top-left chip stack with countdown / breakthroughs-remaining / "next" suffix
- qi/s rate readout already includes spark multipliers (computed in `useCultivation` tick)
- Focus multiplier badge (×N next to qi/s) now reflects Focus Surge bonus when focusing

### Cleanup completed
- Deleted broad-buff `selections` system (30 cards across cultivation/combat/gathering/mining/economy/special)
- Renamed `useSelections` → `useLawOffers` for the law-only major-realm flow
- Removed `Perks` tab from CharacterScreen (depended on deleted pool)
- Stripped selection-derived stat plumbing from useCultivation, App.jsx, StatsTab.jsx

---

## What's left to attack tomorrow

### Phase 2 — Permanent buffs (Uncommon tier)
6 cards that persist for the entire run, stack additively, reset on reincarnation.

| Card | Effect |
|---|---|
| Steady Cultivation | +1 to base qi/s, permanent (run) |
| Sharper Focus | +5% Focus multiplier, permanent (run) |
| Enduring Stream | +2% qi/s, permanent (run) |
| Patience of Stone | Major-realm gate qi/s requirement reduced 5%, permanent |
| Heaven's Bond | +10% offline qi accrual, permanent |
| Resonant Soul | +0.5% qi/s per layer breakthrough this run (stacks) |

**Implementation notes:**
- Add `kind: 'permanent'` to qiSparks data
- New ref `sparkPermanentQiMultRef` etc. — needs separate stacking math from temp buffs
- Each permanent draw stacks additively — track stacks per card id in active sparks state
- Active-sparks chips show stack count for permanents (e.g. "Sharper Focus ×3")

### Phase 3 — Mechanic cards (Rare tier)
4 mechanics × 5 tiers each = 20 cards. T1 unlocks AND T2-T5 upgrades have **same rare draw rate** (per design call).

**Gating rules:**
- T2-T5 of a mechanic only enter offer pool after T1 is drawn for that mechanic
- Crystal Click T1 requires `featureFlags.isUnlocked('qi_crystal')` — gated by realm progression
- T5-capped mechanics stop generating upgrade offers
- Already-unlocked T1s drop from the offer pool

#### Mechanic 1: Crystal Click — accumulation reservoir
- Crystal stockpiles qi at a fraction of qi/s rate, capped at N minutes
- Tap crystal → collect entire reservoir, reservoir resets to 0
- Runs **online + offline** (key offline-return hook)
- Tier curve: T1 (30% rate, 5min cap) → T5 (100% rate, 60min cap)
- Visual: crystal glow tracks fullness; urgent pulse + chime when capped

#### Mechanic 2: Consecutive Focus
- Hold duration thresholds give escalating bonus while held
- T1 ≥1s = +5% qi/s → T5 ≥10s = +60% qi/s with screen color shift ("deep meditation")
- Pure passive — wires into existing focus boost logic

#### Mechanic 3: Pattern Clicking (osu-style)
- Periodic dot pattern appears, player taps in order/rhythm for burst reward
- T1 = 3-dot pattern, +30s qi/s burst → T5 = 7-dot mixed-timing, full clear = double + ×2 qi/s 15s
- Most complex of the four — full minigame component

#### Mechanic 4: Divine Qi (golden cookie)
- Random orb spawns at intervals, tap before it disappears
- T1 = every ~3min, +30s qi/s → T5 = double-orb spawns, +60s qi/s + ×1.5 qi/s 30s buff

### Phase 4 — Polish
- Visual rarity flourishes (uncommon = green particles, rare = purple glow + chime, future epic = gold particles + screen shake)
- Sound design per rarity tier
- Tutorial/hint on first-ever Qi Spark offer
- 30s auto-skip timer should have a visible countdown ring on the modal
- Pity-timer indicator when getting close to guaranteed rare

### Quality items
- Lingering Focus visual: chip should pulse / brighten during the 5s residual window
- Painless Ascension feedback: "✦ Painless Ascension!" toast when consumed at breakthrough
- Active-spark chip on hover could show full description + remaining duration in mm:ss for long buffs
- Consider achievement badges for "First Pick of [Card]" for each card

### Pre-existing concern (not blocking)
- `src/screens/WorldsScreen.jsx` has uncommitted changes in working tree from outside this session — refactors row-click handling for idle activities. Not mine, not pushed. Worth checking with cousin / committing separately when convenient.

---

## Architecture decisions locked in

- **Cards as mechanic unlocks/upgrades** (not just buffs) for the rare tier
- **Tier system: 5 tiers per mechanic**, same rare draw chance for unlocks and upgrades
- **Pool weights:** 55% common / 30% uncommon / 15% rare (Phase 1: effectively 65/35/0)
- **Reroll cost:** 1 free, then 3 / 6 / 12 BL escalating; cap at 12
- **Persistence:** all spark state per-run; reset on reincarnation
- **Trigger:** every layer breakthrough, 1 offer at a time

---

## Files touched

### New
- `src/data/qiSparks.js`
- `src/hooks/useQiSparks.js`
- `src/components/QiSparkChoiceModal.jsx`
- `src/components/ActiveSparksBar.jsx`
- `src/hooks/useLawOffers.js` (was `useSelections.js`)

### Modified
- `src/hooks/useCultivation.js` — sparkQiMultRef, sparkFocusMultBonusRef, sparkPainlessRef, sparkLingeringActiveRef + residual refs; tick logic for painless drain skip + lingering boost residual
- `src/App.jsx` — mounts useQiSparks, mirrors refs, renders modal app-wide
- `src/screens/HomeScreen.jsx` — renders ActiveSparksBar; Focus mult badge includes spark bonus; crystal is purely decorative
- `src/screens/CharacterScreen.jsx` — Perks tab removed
- `src/screens/StatsTab.jsx` — selection mod bundle removed
- `src/components/SelectionModal.jsx` — stripped to law-only
- `src/components/TopBar.jsx` — crystal feed shortcut button
- `src/systems/save.js` — qi-sparks keys added to wipe
- `src/App.css` — Qi Spark modal + active spark chip styles

### Deleted
- `src/data/selections.js`
- `src/hooks/useSelections.js`

---

## See also
- [[Early Game Hook — Engagement Pass]] (parent proposal that scoped this)
- [[Cultivation System]]
- [[Realm Progression]]
