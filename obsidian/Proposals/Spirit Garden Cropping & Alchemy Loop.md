# Spirit Garden — Cropping & Alchemy Loop

**Status:** Proposal, NOT implemented
**Date:** 2026-05-29
**Surface:** Producer minigame on `p_herb_garden` (Herb Garden), unlocks at Mythic tier (100+ owned)
**Existing code:** `src/components/minigames/SpiritGarden.jsx` (placeholder mockup), `src/data/minigames.js` (registry entry `garden`, already `ready: true`)

---

## 1. Player Goal & Context

A cozy, self-contained farming loop in the spirit of Stardew / FarmVille at minor scale. The player sows spirit seeds, returns over real hours to a heavy harvest, then chooses to **sell** herbs for garden money or **brew** them into elixirs that buff their cultivation. New seeds and recipes unlock over time, giving long-horizon goals. Everything lives inside one screen and depends on nothing else in the game.

### Why this shape (the design constraints that forced it)

1. **Idle competition.** Producers already print qi passively while the player is away, and the shared minigame reward model caps every cash-out at 5 to 30 minutes of current production (`computeReward` in `src/data/minigames.js`). So qi can never be the reason to play. The reason must be something idling never gives: **buffs, collection, and a self-owned progression track.**
2. **v1 is combat-off.** `FEATURES.combat = false` and `FEATURES.inventory = false` (`src/data/featureFlags.js`) hide Worlds, Gathering, Mining, the alchemy furnace (`production` / `alchemy`), the pill drawer, and the materials inventory. Therefore the garden is the **first and only** herb + alchemy surface in v1, and it must render its own herbs / elixirs / currency UI (it cannot lean on the global inventory or pill drawer, which are hidden).
3. **Inert combat pills.** The shelved pill catalogue (`obsidian/backup/Alchemy.md`) grants combat stats (health / defense / damage), which do nothing with combat off. So the garden brews a **separate elixir line** of qi-economy buffs, not those pills.

---

## 2. Resource Taxonomy

| Resource | Type | Earned by | Spent on | Where it lives |
|---|---|---|---|---|
| **Seeds** | Consumable | Bought with Dew; tier-1 always free | Planting | Garden screen |
| **Herbs** | Material | Harvesting ripe plots | Selling or brewing | Garden screen |
| **Spirit Dew** (灵露) | Soft currency | Selling surplus herbs | Seeds, plots, recipes, upgrades | Garden screen only (NOT main HUD) |
| **Recipes** | Permanent unlock | Bought with Dew | One-time | Garden screen |
| **Elixirs** | Timed buff | Brewing herbs via a recipe | Consumed for a qi-economy buff | Garden screen + a small active-buff indicator |
| **QI** | Export only | (the rest of the game) | Optional convenience (restock / time-skip) | Main game; garden pays OUT in qi bursts |

**Currency decision (settled):** the internal loop uses **Spirit Dew**, a garden-local soft currency, not QI. Rationale:

- **Self-containment.** A closed currency is exactly the property that makes the loop never strand the player. QI-coupling would reintroduce stranding at the seed-buying end (a player who spent their qi on a producer could not garden).
- **Scaling.** Producers span 0.2 to 1.6M qi/s (seven orders of magnitude). A qi seed price meaningful at realm 5 is rounding error at realm 30. Dew has its own gentle curve and stays relevant forever.
- **It creates the core decision.** Dew is earned by *selling* herbs, so every harvest poses the farming-sim question: sell for money, or keep to brew? That sell-vs-brew tension is the heart of the loop.

QI keeps one job it is good at: the **export**. Surplus channels OUT as a capped qi burst (the existing 5 to 30 minute band), the one unit that scales correctly across realms. QI may optionally buy convenience (seed restock, grow time-skip) but is never required to play.

---

## 3. Core Loop

```
buy/own seed (Dew, or free tier-1)
  -> plant in a plot
    -> grow over real time (offline-safe, no spoilage)
      -> harvest herb(s)
        -> DECIDE: sell herbs (-> Dew)  OR  brew herbs (-> elixir buff)
          -> spend Dew: better seeds, more plots, new recipes, upgrades
          -> (optional) channel surplus -> QI burst (export)
            -> repeat, unlocking deeper seeds/recipes over time
```

Collection layer (the Almanac) sits across the loop: the first harvest of each herb type logs it and grants a small permanent garden bonus.

---

## 4. How the Loop Starts (the bootstrap)

A closed-currency loop has a chicken-and-egg problem: you need Dew to buy seeds, but Dew comes from selling herbs, which come from seeds. Solved with three layers, in priority order:

### 4.1 The free floor (permanent anti-stuck guarantee)
The **tier-1 seed (Spirit Grass) always costs 0 Dew** and is always available. The loop can therefore *always* turn, even at 0 Dew, forever. This is the single most important rule: a cozy idle game must never be able to dead-end.

### 4.2 The starter grant (first-session momentum)
On unlock, the player receives a small one-time grant so session 1 has immediate action and a teaching beat:
- A handful of free Spirit Grass seeds (already in hand).
- A small Dew stipend, enough to afford one tier-2 seed *after* the first harvest teaches the loop.

### 4.3 The fast first crop (legible teaching loop)
Tier-1 Spirit Grass grows in **minutes**, so the full sow -> grow -> harvest -> sell/brew loop completes inside the first sitting. Higher tiers grow over **hours** (honoring the original intent that crops take real hours), which also gives tier-1 a permanent role: the fast, cheap, low-yield crop for active sessions, versus slow high-yield crops for overnight.

### 4.4 First-session script
1. Unlock toast: "Your Herb Garden has reached Mythic. A Spirit Garden awaits." Grant seeds + Dew.
2. Player taps an empty plot, plants Spirit Grass (free). Telegraph: seed art appears.
3. A few minutes later (or after a short offline gap) the plot blooms. Ripe glow.
4. Player taps to harvest. +1 Spirit Grass herb.
5. The UI surfaces the **first decision**: a "Sell" button (turns the herb into Dew) and a "Brew" button (greyed until a recipe is known / enough herbs). This single moment teaches the core tension.
6. With the starter Dew, the player can buy a tier-2 seed and an upgrade, establishing the spend loop.

> ASSUMPTION: unlock at Mythic (100+ Herb Garden owned) is reachable comfortably within early-to-mid progression.
> IMPACT: if it unlocks too late, the cozy loop never gets seen by most players.
> IF WRONG: garden is dead content for the majority.
> VALIDATE: check Herb Garden cost curve in `src/data/producers.js` against the playthrough sim (`scripts/sim-cultivation.mjs`); confirm 100 owned lands in the intended window. Consider a lower unlock (e.g. Gold, 25+) if Mythic is too deep.

---

## 5. System Rules

### 5.1 Plots & planting
- Start with a small number of plots; expand via Dew upgrades. Tap empty plot + own seed -> plant (consumes 1 seed).
- Tapping a plot disambiguates by stage: empty -> plant; ripe -> harvest; growing -> no-op (show remaining time on a long-press / tooltip).

### 5.2 Growth & offline maturation (no spoilage)
- Each plot stores `{ seedId, plantedAt }`. Stage is derived from `now - plantedAt` against the seed's grow duration (seed -> sprout at 50%, -> bloom at 100%), mirroring the current mockup's `stageOf`.
- **Crops mature offline.** On app load, derive stage from wall-clock time, capped by the existing offline ceiling (`MAX_OFFLINE_HOURS` in `src/systems/autoFarm.js`).
- **No wilting, no spoilage.** Ripe crops wait indefinitely. FarmVille-style decay punishes the player for being away, which is toxic in a game whose entire premise is being away. Cozy = anticipation, never anxiety.

### 5.3 Harvest
- Tap a ripe plot -> plot empties, herb(s) added to the garden basket. Yield is 1 at tier-1, scaling with seed tier and yield upgrades.

### 5.4 Spirit Dew economy
- **Earn:** sell herbs from the basket. Sell value scales by herb rarity.
- **Spend:** seeds (tier-2+), plot expansion, recipe unlocks, grow-speed / yield upgrades.
- **Closed and bounded.** Dew cannot buy qi and qi cannot (by default) buy Dew, so it cannot leak into the main economy. Sinks are mostly finite (upgrades, recipes); steady-state Dew is just the seed-buy / herb-sell churn.

### 5.5 Alchemy (mixing) inside the garden
- **Reuse herb data.** Growable crops are the existing 10 herbs from `src/data/materials.js` (Sect Grounds Grass ... Open Heaven Vine, Iron through Transcendent). No new herb art or IDs. When combat ships, these unify with gathering rather than forking.
- **Garden brews ELIXIRS, a separate product line from the furnace's PILLS.** Same ingredients, different station, different output. Furnace pills = permanent combat stats (shelved with combat). Garden elixirs = timed qi-economy buffs (useful now).
- **Recipe model** mirrors the furnace pattern (`obsidian/backup/Alchemy.md`): a combination of herbs maps to exactly one elixir; recipes are discovered by brewing (or bought with Dew); the catalogue grows over time. Keep v1 simpler than the furnace's 3-herb / 92-combo system (e.g. 2-herb recipes, a handful of elixirs).
- **Elixir effects (v1, qi-economy only):** e.g. +% qi/s for a duration, +% cultivation speed, +% crystal feed yield, +% Dew from selling, faster grow. Magnitude scales with herb rarity used.

### 5.6 Buff uptime cap (THE key balance lever)
Elixir buffs must NOT reach permanent 100% uptime, or they become permanent multipliers and cause power creep. Because herbs are infinitely growable, **scarcity cannot be the limiter; uptime must be.** Recommended mechanism: a **single active elixir slot** with buff duration shorter than the practical re-brew time, targeting roughly 50% uptime. (Alternatives: explicit cooldown, or refresh diminishing returns. Pick one, see Open Decisions.)

### 5.7 Seed / herb tiers (better seeds over time)
- New seed tiers gate behind **garden level (Almanac progress)** and/or realm. Higher tiers: longer grow, higher yield, rarer herb, stronger elixirs, higher Dew cost.
- This is the "better seeds for better rewards" axis and the primary content-scalability lever (new herbs, new recipes shipped over time).

### 5.8 Almanac (collection + the only permanent progression)
- First harvest of each herb type logs an Almanac entry and grants a small **permanent** garden bonus (e.g. +1 plot at milestones, +% grow speed for that herb family, +% Dew). Per the progression rubric, these change state, not just a flat number, and they are deliberately garden-local (they do not inflate the main qi number).
- Drives completionist motivation ("grow them all") and gates higher seed tiers.

### 5.9 QI export
- A "Channel harvest -> Qi" action converts surplus into a qi burst via the existing `MiniGameResult` / `computeReward` path (5 to 30 minutes of current production). `performance01` = channeled herb value relative to a target basket.
- This is the only outward-facing reward and is hard-capped, so the garden stays a top-up, never the main qi engine.

---

## 6. State Machine

### Plot states
| State | Entry | Exit | Interruptible? | Resource |
|---|---|---|---|---|
| empty | initial / after harvest | tap + own seed -> seeded | n/a | none |
| seeded | plant | timer 50% -> sprout | no | consumes 1 seed |
| sprout | timer | timer 100% -> bloom | no | none |
| bloom (ripe) | timer | tap -> harvest -> empty | waits forever (no decay) | yields herb(s) |

**Edge cases:** app closed mid-grow -> resume via `plantedAt` timestamp, capped at `MAX_OFFLINE_HOURS`. Plant on full board -> no empty plots, planting disabled with hint. Harvest unripe -> no-op. Uproot a planted seed -> NOT allowed in v1 (no refund), flag for later.

### Session states
`tending` (the garden board) <-> `cashing` (the `MiniGameResult` qi-export modal). Brewing happens inline in `tending` (no separate mode in v1).

---

## 7. 5-Component Evaluation

| Component | Score | Notes |
|---|---|---|
| **Clarity** | OK -> needs polish | Plot stages telegraph via art + ripe glow; buff needs a visible active timer. Brew result needs a clear "you made X, lasts Ymin" readout. |
| **Motivation** | **STRONG** | Buffs you actually want (qi/s), a self-owned Dew progression, Almanac collection, new seeds/recipes over time. Voluntary engagement is built in. |
| **Response** | Low-stakes by design | A slow farm, not a twitch game. Agency lives in two real decisions: what to plant (time horizon) and sell-vs-brew. Correct for the genre. |
| **Satisfaction** | **WEAK (current)** | Mockup uses placeholder art and no juice. Needs: bloom pop, harvest sparkle, brew flash, active-buff aura. Minimum two feedback channels per action. |
| **Fit** | **STRONG** | Herbs / elixirs are on-theme; reuses existing materials; calm pace matches the cultivation genre. |

Per the conflict priority (Response > Clarity > Satisfaction > Fit > Motivation), nothing here trades against Response, so the work order is Satisfaction and Clarity first, Motivation tuning last.

---

## 8. Risks & Abuse Cases (with balance targets)

| Risk / abuse | Mitigation | Target |
|---|---|---|
| Buffs reach 100% uptime -> permanent multiplier / power creep | Single active elixir slot; duration < re-brew time | Uptime <= ~50% |
| Garden out-earns idling (defeats the cap philosophy) | `computeReward` 5 to 30 min band; channel gated (ready-state, not spammable) | Garden qi << a session's passive income |
| Device-clock manipulation to fast-grow | Cap maturation at `MAX_OFFLINE_HOURS`; mostly self-harm | Bounded, acceptable |
| Dew inflation from sell/rebuy farming | Closed currency; finite upgrade/recipe sinks; seed cost >= partial herb value | Steady-state Dew neutral |
| QI-flood via convenience restock -> herb flood -> buffs | Uptime cap (above) is the real limiter, not herb scarcity | Unaffected by herb supply |
| Player dead-ends at 0 Dew / 0 seeds | Free tier-1 seed floor | Impossible by construction |

> Red-flag check (economy/currency feature must have balance targets): addressed above. Validate against `scripts/sim-cultivation.mjs`.

---

## 9. Numbers (all STARTING VALUES, tune later)

| Knob | Starting value | Test / pass-fail | Adjust if |
|---|---|---|---|
| Plots at unlock | 4 | Does expanding plots feel like a meaningful early Dew reward across first 2 sessions? | Raise start if board feels empty; the mockup uses 6 |
| Grow time, tier-1 (Spirit Grass) | 5 min | First full loop completes in one active sitting | Lower toward 2 min if first session stalls |
| Grow time, tiers 2..5 | 30 min / 2 h / 8 h / 24 h | Players plant high tiers before logging off, low tiers when active | Compress curve if 24h feels punishing |
| Starter grant | 3 Spirit Grass seeds + ~20 Dew | Player reaches first Dew purchase within session 1 | Raise Dew if first purchase feels far |
| Tier-1 seed cost | 0 Dew (free, permanent) | Loop never dead-ends | Never change the free floor |
| Herb sell value | tier-1 = 2 Dew, geometric by rarity | First upgrade reachable in ~3 harvest cycles | Flatten if grind feels long |
| Elixir buff | +15% qi/s for 30 min, single slot | Buff feels worth a brew; uptime ~50% | Cut magnitude if it warps pacing |
| Almanac first-harvest bonus | +3% grow speed for that family; +1 plot at milestones | Collection feels rewarding, not mandatory | Tune per completion data |
| QI export band | 5 to 30 min (existing `REWARD_BAND`) | Export is a top-up, not the engine | Already shared; do not special-case |

No value here is claimed as a standard; each is a starting point with a test.

---

## 10. Playtest Scenarios

1. **New player:** unlock the garden with no instructions. Can they plant -> harvest -> understand sell-vs-brew within the first session? Pass: 8/10 infer the loop unaided.
2. **Stress:** spam-tap plots, plant/harvest rapidly, plant with 0 seeds, tap unripe plots, fill the board. No crashes; disabled states are obvious.
3. **Skill / optimization:** does choosing crops by time horizon and planning recipes meaningfully improve buff uptime / Dew rate versus random planting? If not, the decisions are fake.
4. **Abuse:** jump the device clock forward; attempt buff-stacking; run sell/rebuy Dew loops. Confirm the uptime cap, offline cap, and closed-currency sinks all hold.
5. **Readability:** an observer watches one harvest + brew. Can they tell what buff was gained and for how long, without reading code? If not, add feedback channels.

---

## 11. Scope Slices

**v1 (ship first, the complete minimal self-contained loop):**
plots + free tier-1 seed + Spirit Dew + sell-vs-brew + a small qi-elixir catalogue + offline growth + QI export + the bootstrap. Reuses existing herb data; renders its own UI (inventory/pill-drawer are hidden in v1).

**v2 (depth):**
Almanac + permanent bonuses, more seed tiers and recipes, a deeper upgrade tree, optional "refine -> stronger elixir" cross-step.

**When combat ships (reconciliation, not a v1 concern):**
Garden coexists with the unhidden systems. Garden = cozy grower (herbs + qi elixirs); Gathering = active worker dispatch (herbs); Furnace = permanent combat pills. Shared herb pool. Reposition or merge the separate Pill Refinement minigame (丹, on `p_meridian_furnace`) so two systems are not brewing the same thing.

---

## 12. Tuning Priority (if it does not feel right)

1. **Satisfaction first** (Clarity and Response are not the root cause here): add feedback on bloom / harvest / brew / buff-active.
2. **Buff magnitude + uptime** (Motivation + balance).
3. **Grow times + Dew curve** (pacing).
4. **Almanac bonuses** (long-horizon motivation).

Do not tune grow-time / cost numbers before the bloom and brew moments read clearly.

---

## 13. Open Decisions (need sign-off before building)

1. **Currency name:** "Spirit Dew" (灵露) is a placeholder. Confirm or rename.
2. **Buff uptime mechanism:** single active slot (recommended) vs explicit cooldown vs refresh DR.
3. **v1 elixir catalogue:** a new small qi-economy elixir set (recommended) vs reusing the shelved combat pills (inert until combat ships).
4. **Herb source art:** reuse the existing 10 herb sprites as crops (recommended, zero new art) vs a garden-native herb line (stronger cozy identity, more work).
5. **Recipe complexity:** simple 2-herb recipes for v1 (recommended) vs the furnace's 3-herb / 92-combo depth.
6. **Unlock tier:** Mythic (100+) as designed vs an earlier gate so more players see it (see Section 4 assumption).
7. **Uproot / refund** a planted seed: recommend NO in v1.

---

## Related
- [[Materials]] — the 10 herbs reused as crops
- [[Alchemy]] — shelved furnace pill system (combat stats); the garden's elixirs are a separate line
- [[Realm Progression]] · [[Cultivation System]] — what the qi buffs accelerate
- [[Monetisation]] — optional QI convenience sink, ad-boost adjacency
- [[Proposals/Early Game Hook — Engagement Pass]] — return-visit and engagement framing
- Code: `src/components/minigames/SpiritGarden.jsx`, `src/data/minigames.js`, `src/data/materials.js`, `src/data/featureFlags.js`, `src/systems/autoFarm.js`
