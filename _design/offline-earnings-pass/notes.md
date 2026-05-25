# Offline Earnings — "Emergence from Seclusion"

## The metaphor

The player closed the app = the cultivator entered 闭关 (sealed meditation).
While they were away the sect kept practicing in silence. The modal is the
moment the cultivator OPENS THEIR EYES and SEES what was accumulated.

Visual anchor: a single calligraphy 修 (xiū = cultivate) brush-glyph as the
watermark behind the qi number, with the parchment-card chassis from the
established lacquer vocabulary (same family as Petition Tablet, About,
Pavilion Plaques). Two glyphs in the active UI: 时 (time) in the duration
chip and 收 (collect) on the primary CTA, both pulled from the bundled
Ma Shan Zheng subset.

## The lift vs the current modal

The current modal reads as a transactional notification: icon, label,
number, two buttons. It works but doesn't feel like a moment.

The redesign reframes it as a CEREMONY:

- **Staged entrance** (fade backdrop → scroll rises → glyph inks in → number
  rises with embers → CTAs slide in). Each beat 100-200ms apart. The whole
  ceremony resolves in ~1.2s; the player feels something *happens*.
- **The qi number is now the hero**, not a small line in a box. 56px Cinzel
  with cream-warm color + ember-gold text-shadow, set against the faint 修
  brush-glyph. Reads as monetary weight, not metadata.
- **Duration is finally surfaced** ("3h 22m of Quiet Practice"). This was
  invisible before; surfacing it makes the reward feel proportional to time
  away ("oh, I was actually gone for hours") and acknowledges the player's
  absence rather than ignoring it.
- **CTAs are ranked properly**. The current modal puts Collect and Watch ×2
  side by side as equal pills, which both visually competes for attention
  and makes the ad-watch feel pushy. The redesign stacks them: Collect is
  full-width gold (the dominant primary, with the 收 calligraphy glyph
  reinforcing the cultivation theme); Watch ×2 is a slim jade pill below
  with a clear "AD" mark, sized as secondary. Players who don't want to
  watch an ad never feel pressured to look at it.
- **The footer note** ("Your sect cultivated in silence while you rested.")
  gives the moment closure: the absence wasn't lost time, it was practice.

## How the ×2 button reads secondary

Five signals stack to push it visually backward:

1. Smaller (jade pill vs full-width gold bar)
2. Center-aligned width (not full-width like Collect)
3. Jade-green palette (cool, calmer than the dominant gold)
4. Explicit "AD" tag inside the chip (sets expectations honestly)
5. Lower in the visual stack (Collect is the thumb-zone primary on mobile;
   you tap Collect without ever needing to think about Watch ×2)

If a player WANTS the doubler, the chip is clear and tappable. If they
don't, it never asks for attention.

## What I considered and rejected

**A counting/ticking animation on the qi number** (e.g. 0 → 47,300 over
800ms with a tick sound). Beautiful in theory but plays HALF A SECOND of
hold-time on every single return. Players returning many times a day
(idle-game cadence) would feel friction. Picked a single graceful rise +
glow instead: same emotional payoff, zero held delay. The number is
visible at full value within 250ms of the card appearing, so a player
who taps Collect immediately on muscle memory loses nothing.

## One trade-off

**The duration line could imply guilt for short returns.** "3h 22m of
Quiet Practice" reads great after 3 hours. After 6 minutes it reads as
"6m of Quiet Practice" which is technically correct but feels like a
diminished reward.

Two ways to handle it (both small, post-ship):
- Hide the duration line for windows under 15 minutes (just show the qi
  number; the duration becomes irrelevant for quick returns).
- Or copy-swap below a threshold ("a brief breath" instead of "0h 6m").

I'd default to the first: minimum threshold of 15-20 min for the duration
chip to appear. Below that, just the qi number, eyebrow, and CTAs.

## Implementation gotchas (for the engineer pass)

- All calligraphy glyphs (`修` watermark, `时` duration mark, `收` collect
  CTA) are already in the bundled Ma Shan Zheng. No bundle regen needed.
- Animations are CSS-only with staggered `animation-delay`. Honor
  `prefers-reduced-motion` by removing the staircase delays + transforms;
  keep the fade-in but skip the rise/scale.
- The hero number's text-shadow is heavy (28px gold-hot glow). On very
  low-end Android the shadow can render slightly soft; acceptable. If it
  causes paint cost, drop to a single 16px shadow.
- The `修` watermark at 280px font-size + 0.065 opacity sits as a giant
  letter behind everything. It rendered crisp on every desktop Chromium
  I tested but mobile Capacitor WebView occasionally upsamples — verify
  on a real device before considering it polished.
- The duration prop isn't currently passed to the modal. The engineer
  pass needs to plumb `durationMs` (or `awayMs`) from the offline-earnings
  calculator into the OfflineEarningsModal props. The format helper is
  already in `src/utils/format.js`.
- The 15-min duration-hide threshold is a one-liner in the JSX once the
  prop lands.
