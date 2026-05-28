# Cultivation Screen — Design Pass Notes

Mockup: `cultivation-mockup.html` (self-contained, 390x844 phone shell, all three sub-tabs demoable via the top toggle row).

> Note on baselines: as last round, `preview_screenshot` timed out at 30s on the canvas-heavy home renderer. I built the mockup from a direct read of `src/screens/CultivationScreen.jsx`, `src/components/ProducerLane.jsx`, `src/components/UpgradeCard.jsx`, `src/components/SparksTab.jsx`, the data files for real names/costs/sprites, and the live CSS tokens in `src/index.css` as the baseline. If the user wants real-PNG baselines those can be captured manually from localhost:5173 once HMR is idle.

---

## The metaphor — The Estate Pavilions

**What changed.** Each producer is a *named place* on the player's cultivation grounds. The card stopped being a row and became a *tributary plaque hung at the pavilion gate*: a vermillion left-rail (qi flowing in from this place, matching the Spirit Bazaar's lantern bar), a framed inset for the pavilion's emblem (the producer sprite, finally framed instead of floating), a Cinzel "lintel" carrying the name like a temple placard, the tier badge + owned count in tabular nums under it, and a stamped vermillion cost cartouche on the right with "Tribute ×1" above the qi number. Locked producers stay visible as *sealed shrines*: the same plaque chassis, but the emblem is desaturated black, the frame has crossed bamboo lattice across it, a vermillion wax seal stamped over with "封" (seal) hangs off the bottom-right, and the buy cartouche is replaced by a dashed "Sealed · R15" badge so the unlock realm is the first thing the player reads.

Upgrades became *inscribed tablets* — vertical framed insets with the upgrade's Chinese glyph stamped in calligraphy at the top, Cinzel name + one-line effect below, vermillion cost cartouche at the bottom. Owned tablets get a "成" (achieved) seal in the top-right corner and a jade "owned" cost pill; the screen still uses the Cookie-Clicker pattern of piling owned upgrades into compact chips at the bottom of the tab so the buyable list stays scannable. The Sparks tab keeps its three-section structure (Legendary / Permanent / Mechanic) but reskins each block in the same framed-inset language so the whole screen reads as one estate, not three lists. Rarity reads via a corner ribbon (gold / violet / jade) rather than a border recolour, so the inset frame stays consistent across all three tabs.

Sub-tab nav reuses the Bazaar's text-tabs pattern verbatim — plain Cinzel uppercase labels, inline count, sliding gold underline that re-measures the active label's width on tap. One tab pattern across the game.

The top of the screen carries a slim Qi reservoir strip with a "炁" (qi) calligraphy watermark mirroring the Settings Identity Plaque, Cinzel Reservoir / Flowing eyebrows, and tabular numerals. Players recognise "this is a tablet of mine" the moment the screen opens.

**The lift.** Today the most-visited screen is the LEAST polished — three sub-tabs of generic dark cards. After: the Garden, the Furnace, the Pillar feel like *places the player owns*. The vermillion rail tells the eye where qi flows in. The framed emblem gives each producer a home (and gives the eye a consistent target across the list). The sealed-shrine treatment turns "??? Locked" from a placeholder into a *promise* — the wax seal is intentionally visible because it says "there is something behind this." Buy cartouches are vermillion stamps, the only place the screen uses vermillion fill, so the player's eye goes straight to the spend.

## How this accommodates the mini-game future

The plaque chassis is intentionally agnostic about what lives in the right slot. Today: a vermillion "Tribute ×N · cost" cartouche. When the Body Tempering Disciple's breathing rhythm game lands, the same right slot accepts a primary "Enter Pavilion →" CTA and the cost cartouche slides under it (or moves into the lintel row). The vermillion rail, the framed emblem, the Cinzel lintel — none of those change. The card already says "this is a place" so the "enter the place" affordance has somewhere to land without redesigning the chassis. The card-as-place metaphor is what unlocks this; a card-as-row metaphor would have to be torn up.

## One trade-off the user should know

**Vertical density goes down.** Today's `.pl-lane` row is ~70px tall and fits 5 producers on the first viewport without scrolling. The pavilion plaque is ~96px tall (12px gap + 84px content + padding) and fits 4 producers on the first viewport with a sliver of the fifth peeking. For a player at realm 21+ with 10 unlocked producers, the entire list now scrolls where it previously fit. I think this is the right call — the per-producer scan time drops (framed emblem + lintel name read faster than a tighter row), and the screen now feels like a *place* worth scrolling through rather than a list to plow through. But it is a measurable change in interaction shape and worth flagging.

## One thing I considered and rejected — Tribute Scrolls

I drafted a "wooden scroll plaque" variant: each producer is a horizontal scroll with carved-cord caps on both ends, names burned into the wood. It would have reused the Petition Tablet's exact wood-grain vocabulary verbatim. I rejected it because (a) it makes the producer list visually compete with the Petition Tablet for the player's "I should tap this" reflex — two screens of wood-plaque rows in the same game is one wood-plaque too many; (b) the horizontal scroll-caps eat ~20px of width on each side that the cost cartouche needs at 390px viewport; and (c) it doesn't accommodate the future-proof "Enter Pavilion →" slot as cleanly — the cap geometry forces the CTA into the lintel and that pulls the eye away from the name. The Estate Pavilion metaphor leaves the right-edge slot architecturally open in a way the scroll metaphor doesn't.

---

## Implementation gotchas (for when this lands in code)

1. **The qi strip's calligraphy watermark uses `position: absolute` + negative offsets** to bleed off the right edge. The current Cultivation screen has `overflow-y: auto` on a sub-element; the strip needs to stay outside that scroll so the watermark doesn't reflow as the producer list scrolls. Mockup uses `flex-shrink: 0` on the strip and the rail.

2. **The sliding indicator** needs to remeasure on font load (Cinzel webfont arrives async), on viewport orient change, AND on each tab tap. The Bazaar nav has working code for this — copy `moveIndicatorTo()` and the `requestAnimationFrame(() => requestAnimationFrame(...))` warmup verbatim. Do NOT reinvent it.

3. **Locked-producer sprite tinting** — `filter: brightness(0) saturate(0)` flattens the sprite to black. For PixelLab sprites with alpha edges this looks clean, but verify on the new pixel-art `p_disciple_bronze.png` style — if the alpha is patchy the silhouette will feel ratty. Backup plan: `mask-image` from the sprite with a solid fill underneath.

4. **The "Tribute ×N" label is a copy decision** — it leans into the named-place metaphor (you're paying tribute to the pavilion, not "buying"). If a future round wants to revert, the cartouche works fine with `×N` alone or `Buy ×N`. The CSS doesn't depend on it.

5. **The "Enter Pavilion" future slot** — when mini-games land, the cartouche shrinks to icon-only (`Tribute · 2.6K Qi`) and an `enter-cta` button stacks above it. Don't reflow the chassis; just stack inside the existing right column.

6. **Cookie-Clicker sort discipline preserved.** The mockup keeps the existing `cs-list` semantics — affordable producers sort cheapest-first, locked teasers sit at the bottom. The visual changes are purely decorative; the data flow is unchanged.
