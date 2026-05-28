# Producer Access on Mobile — UX Evaluation

**Question:** Should producers stay on the Cultivation tab, or be reachable from home? If the latter, how, without clutter?

**Rule:** The home screen is the meditative anchor. Producer-access lives ON home only if it (a) costs zero taps in idle state, (b) costs ≤80px of vertical scene, and (c) collapses cleanly when irrelevant. Anything else belongs on the Cultivation tab.

---

## Options

| # | Pattern | Taps / buy | Home px cost | Strength | Weakness |
|---|---------|-----------:|-------------:|----------|----------|
| A | Status-quo Cultivation tab | 3 (nav + buy + nav) | 0 | Zen scene preserved; room to scale to 12+ producers; explainable | Compounds painfully across rapid-buy sessions (Cookie-Clicker pain) |
| B | Pull-up sheet with peek-handle | 1–2 | 60 (at rest) | Discoverable; gives "next producer" surfacing for free; full list one swipe away | Eats real scene real estate; drag gestures conflict with iOS swipe-back |
| C | Smart "buy next" pill + long-press list | 1 (idle hot loop) | 36 | Tiniest footprint; optimal for the dominant buy pattern (always cheapest); long-press for branching | Hides the strategic choice; teaches players to spam one button instead of plan |
| D | Compact horizontal producer rail | 1 | 78 | Maximum density, all costs visible at once | Most cluttered; loudest visual; risks pulling eye away from cultivator |

## Mobile precedents

| # | Real shipped game/app | Does it work there? |
|---|----------------------|---------------------|
| A | NGU Idle, Antimatter Dimensions, Tap Titans 2 (Skill/Hero screens) | Yes for deep games — players accept the tab as "the work room" |
| B | Spotify mini-player, Apple Maps card, Pokémon Sleep (research handle) | Yes when content is secondary action; players learn the affordance fast |
| C | Egg Inc. "Buy Vehicles" drawer button, Adventure Communist's max-buy chip | Partial — chip works but discoverability of long-press is fragile |
| D | AdVenture Capitalist mobile (early game), Idle Heroes loot bar | Yes early; gets crowded past 8 items, then folds to a tab anyway |

---

## Recommendation — **B (pull-up sheet) with the C peek-content**

Ship the pull-up sheet, but make its **resting peek** behave like option C: it always shows the single next-affordable producer with a one-tap +1 button. Drag up to see the full producer list when you want strategic control. The collapsed peek is 60px tall, sits flush above the bottom nav, and is dismissible (swipe down or tap outside) so the meditative scene reasserts whenever you stop buying.

Why this combination beats either pattern alone:
- **One tap covers 90% of buys.** During a refining loop the player wants exactly one thing: spend the qi I just earned on the cheapest producer. The peek does that without ever opening the sheet.
- **The sheet absorbs the long tail.** When you want a Spirit Beast Pact instead of the auto-pick, you drag up — the same gesture players already know from Spotify / Maps / iOS Control Center. No new mental model.
- **It respects "don't overfill the screen."** Only the peek (60px) is always-on; the petition tablet, crystal, cultivator, realm name, and tier bar are untouched. The sheet only intrudes while you're explicitly using it.
- **It scales to 12+ producers** without changing the affordance — same handle, just longer sheet content (the rail in D would have to become scrollable and grow horizontally, which fights the eye).

Implementation note: the peek-handle area must NOT capture vertical scroll on its own; only the grip and the chip-bar trigger the drag. The cultivator sprite and tier-bar should shift up ~32px when the peek is present to preserve breathing room.

---

## Rejected — **D, compact horizontal producer rail**

Considered and rejected. The rail looks like the right answer on paper (always-visible, one tap per buy) but in practice it loads the home scene with 6+ pieces of colored chrome that scroll horizontally. That's visually competing with the cultivator sprite, the qi crystal, the realm title, and the petition tablet — five demands for attention all the time. The meditative quality the user explicitly wants to protect dies first. It also peaks early: by the time you have 10 producer types unlocked, the rail becomes a permanent visual roadblock the eye learns to filter out, defeating its purpose.

D would be the right call if this were a tycoon game (AdCap) where the rail IS the gameplay. It's wrong for a cultivation idle game where the rail competes with the cultivation fantasy.
