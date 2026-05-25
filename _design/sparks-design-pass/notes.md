# Sparks — Karmic Charms (design notes)

## Metaphor

Sparks become **Karmic Charms** — small jewel-like talismans collected across reincarnations.
The player's Spirit Inventory is a display of mounted relics, each with a rarity-colored bezel,
a recessed dark mount holding the icon, and a calligraphy name in the rarity hue. The metaphor
extends the lacquer/jade family already established (Petition Tablet, Pavilion Plaques) but
plays one octave higher: smaller, denser, jewel-like rather than wood-like.

## The lift per surface

### Sparks tab — the inventory
The biggest visible change: **2-up grid of compact tokens** instead of 1-per-row tall cards.
Six charms now fit on one viewport instead of two. Each section uses a rarity-colored lantern
bar on the left + Cinzel + sub-label so the player scans by rarity at a glance. The
ribbon-on-corner becomes a small gem dot in the top-right; cleaner, less detached. Legendary
cards emit a slow ember mote that rises from the mount, marking them as the chase tier
without screaming it.

### Detail modal — inspect a relic
Becomes a hero-led inspection: a 92px mount with full rarity halo, faint calligraphy character
behind the icon (e.g. 鳳 for Phoenix Reborn), Cinzel name in the rarity color with horizontal
rule flanking the rarity word. Body sections (Effect / Currently / Example / Lore) each get
the same Cinzel uppercase eyebrow + gold under-rule. Lore gets a quoted italic treatment
with hairline rules above and below — it reads as a flavor passage from a tome. Bottom
breadcrumb uses the 印 stamp from the About page so acquisition feels chronicled.

### Choice reveal — the ceremonial pick
The most ceremonial surface: a fade-in radial backdrop, "A Spark Arrives" eyebrow,
"Choose your Path" Cinzel title with gold rule beneath, and two cards that rise into place
with a 150ms stagger. Each card is larger than the tab tokens (1:1.4 aspect, 80px mount, full
effect description). Hover lifts the card and intensifies the rarity halo. The Reroll chip
sits below as a jade pill so it reads as a secondary option, not the headline.

## How rarity reads at a glance

Five signals stack:
1. Card border color (1px outer line in rarity hue)
2. Card halo (box-shadow glow in rarity hue)
3. Mount inner glow (radial gradient in rarity hue under the icon)
4. Mount border color
5. Cinzel name color

Plus the top-right gem dot. The signals are intentionally layered so the rarity is unmistakable
even when the card is partially obscured by scroll or hover state on a neighbour.

## One thing I considered and rejected

**Hexagonal card shape** (think Hearthstone hex collection grid). Beautiful at 1080p+, but at
390×844 mobile with two cards per row the diagonals chew into the icon mount and the name
loses width. Stuck with rounded rectangles + colored bezels. The bezel/mount/halo combo
carries the "collected gem" feel without paying the readability tax of an irregular shape.

## One trade-off the user should know

**Density up, lore-on-tab down.** The 2-up grid removes the long one-liner that the current
single-row cards have room for ("0s held → +0% qi/s" descriptions). On the new tokens that
contribution string is compressed to ~30 chars; longer lines truncate. Justification: the
detail modal carries the full live contribution math, and tapping a card to inspect is the
natural reach. If a designer wants the long line back on the tab, the card would have to grow
~16px taller and the grid drops to ~5 cards per viewport instead of 6.

## Implementation gotchas (for the eventual engineer pass)

- `color-mix(in srgb, var(--r) N%, transparent)` is used throughout for the rarity-tinted
  borders/glows. Supported in evergreen browsers (Chrome 111+, Safari 16.2+, Firefox 113+).
  All targets covered, but the JSX port should keep the inline-style approach for the rarity
  variable rather than hand-rolling per-rarity classes (4 rarities × 3 modal states = 12
  classes you don't want).
- The hero modal's calligraphy character (鳳 for Phoenix, etc.) needs a `data-glyph` map keyed
  on spark id. For Trinity-piece legendaries (Phoenix / Dragon / Tortoise per their names) the
  glyph is the obvious choice. For non-Trinity legendaries default to a generic 神 (divine) or
  pull from `SPARK_COPY[id].heroGlyph` if added to the data.
- Choice reveal Reroll chip: jade gating logic (free vs cost N) reuses the existing
  `useQiSparks` reroll API. The chip should swap label between "Reroll — Free" and
  "Reroll · N qi" based on remaining free rerolls in the run.
- Active timed sparks live on the TopBar ActiveBuffsChip popover per the earlier session, NOT
  in this tab. SparksTab is permanent state only (per its comment at line 345-349). No change.
