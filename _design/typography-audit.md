# Typography Audit — MartialArtsIdle

Single-file research note. The game is system-sans everywhere except for one already-bundled brush font on the Heavenly Qi tablet (Ma Shan Zheng, 68 KB). This audit asks: which other text surfaces actually earn a custom face, and where would a font do nothing but add weight?

---

## 1. Inventory

Categories I found grepping `App.css` + screens, ordered by visual prominence:

| # | Category | Sample CSS | Sample text | Prominence |
|---|---|---|---|---|
| A | Wordmark / app title | `.home-title-img` (it's an image, not text) | "MARTIAL ARTS IDLE" | High (home only) |
| B | Realm names (current HUD) | `.home-realm-name` | "Tempered Body — Layer 7" | Persistent, every screen |
| C | Journey list realm group | `.journey-group-name` | "Qi Transformation", "Open Heaven" | High (lore-text screen) |
| D | Journey stage rows | `.js-label` + `.js-cost` | "Peak Stage", "13 K Qi" | High, ~60 rows |
| E | Breakthrough celebration banner | `.home-breakthrough-name` (2.3 rem, 900) | "True Element", "Ascension" | Rare but the loudest text in the game |
| F | Modal titles | `.modal-title`, `.tech-modal-title` (15 px, 700) | "Heavenly Crane Step", "Equip Gear" | Every modal open |
| G | Section headers / kickers | `.home-breakthrough-kicker`, `.daily-modal-sub` | "BREAKTHROUGH", "ENERGIES IGNITED" | Medium |
| H | Body / paragraph copy | `.modal-desc`, tooltip body | "Restore 30% of qi. Stacks 3 times…" | Very high (read constantly) |
| I | Numeric counters | qi totals, costs, %/sec | "1.65 M Qi", "+428%" | Every second |
| J | Button CTAs | nav labels, action buttons | "BREAK THROUGH", "PETITION" | Every tap |
| K | Inscribed glyph (the plaque) | `.hq-glyph` — already Ma Shan Zheng | 天 | Solved |
| L | Tutorial / lore prose | tutorial cards, achievement names | "The First Breath", "Step Into the Lotus" | Medium, narrative-heavy |
| M | Micro-labels / chips | `.nav-label` (10 px), kickers (.18 em tracking) | "HOME", "READY" | Pervasive but small |

---

## 2. Recommendations

| Cat | Verdict | Note |
|---|---|---|
| A · Wordmark | **KEEP** (it's a PNG already) | No font needed — the title is already custom artwork. |
| B · Realm name HUD | **KEEP system sans** | Lives over the cultivator art at 0.78 rem with heavy shadow. Mobile legibility wins. |
| C · Journey group name | **UPGRADE → Cinzel 600** | Lore weight. Reads as carved temple plaques. Big tonal win. |
| D · Journey stage / cost | **TRY tabular-nums** + KEEP sans | Just add `font-variant-numeric: tabular-nums` to `.js-cost`; columns stop dancing. Zero KB. |
| E · Breakthrough banner | **UPGRADE → Cinzel 700** | This text is on-screen for 2.6 s once every 15 min. It SHOULD be the most premium type in the game. |
| F · Modal titles | **UPGRADE → Cinzel 600** | One-line nouns ("Heavenly Crane Step"). Already letterspaced — a serif here unifies with the tablet. |
| G · Kickers (`.18 em tracking`) | **KEEP system sans** | They already do the heavy lifting with tracking + uppercase. A second serif here would be visual noise. |
| H · Body copy | **KEEP system sans** | Hard rule — never re-render player-readable prose in a stylised face on mobile. |
| I · Numeric counters | **TRY tabular-nums** + KEEP sans | Same trick — global `font-variant-numeric: tabular-nums` on a `.num` utility class for the qi readout. Free. |
| J · Button CTAs | **KEEP system sans** | Buttons must read instantly. No serifs on tap targets. |
| K · 天 glyph | **DONE** (Ma Shan Zheng bundled) | — |
| L · Tutorial / achievement names | **UPGRADE → Cinzel 600** (re-use the same face) | Names are 2-5 words. Same font as C/E/F = one face does the work of three. |
| M · Micro-labels | **KEEP system sans** | At 10 px the system stack out-renders any serif. |

### Specific font picks

**1. Cinzel** — All-caps Roman serif, classical and ceremonial. Matches the temple-plaque world. Pairs naturally with Ma Shan Zheng (same demo file proves it). Latin-only subset, weights 500 + 600 + 700 = three woff2 files at ~14.5 KB each ≈ **44 KB total**. Drop the 500 weight (we only need body-display 600 + heavy 700) and we're at **~29 KB for two weights**. SIL OFL. This is the single biggest-impact addition.

**2. (Optional, skip recommended) Cormorant Garamond** — Lower-case display serif if the team ever wants real lore paragraphs (achievement descriptions, story scrolls). Beautiful but ~22 KB per weight and the game has no long-form lore yet. **Skip until there's a Lore screen.**

**3. Free win: tabular numerics.** Already supported by every system font (San Francisco, Segoe UI, Roboto). Add `font-variant-numeric: tabular-nums` to a `.tnum` utility and apply to qi totals, costs, %/s readouts. Zero KB. Numbers stop wobbling as they tick.

---

## 3. Demo

See `_design/typography-audit.html` — three side-by-side pairs (Journey row · Breakthrough banner · Modal title) showing current state vs the Cinzel upgrade. Open in a browser.

---

## 4. Bundle budget

| File | Purpose | Size |
|---|---|---|
| `cinzel-latin-600.woff2` | Display headings | ~14.5 KB |
| `cinzel-latin-700.woff2` | Breakthrough banner heavy | ~14.5 KB |
| **Total new** | | **~29 KB** |
| (already bundled) `ma-shan-zheng-common.woff2` | 天 + future hanzi | 68 KB |
| **Typography total after change** | | **~97 KB** |

Tradeoffs:
- Drop the 700 if you want to halve it to ~15 KB — the banner can use 600 with a `font-weight: 600` + `text-shadow` boost. Loses ~10% impact for 50% smaller.
- Adding Cormorant Garamond for body lore would be ~22 KB per weight and isn't justified yet.
- Skip Cinzel latin-ext (umlauts/Vietnamese diacritics) — the game ships English-first; the realm names and modal titles are all ASCII.

---

## 5. Verdict

Ship **Cinzel 600 + 700 latin only, ~29 KB total**, applied via a single `--font-display` CSS variable to four selectors: `.journey-group-name`, `.home-breakthrough-name`, `.home-breakthrough-kicker`, `.modal-title` (plus tutorial / achievement names that re-use those classes). Also add `font-variant-numeric: tabular-nums` globally to `.js-cost`, the home qi readout, and producer cost lines — this is free and instantly raises perceived polish. Do NOT chase a body-text serif, do NOT add an italic, do NOT touch nav / buttons / tooltips. The game is mostly system-sans for good reason; the upgrade earns its weight only on the lore-named surfaces that benefit from gravitas. One face, two weights, three high-impact zones, ~29 KB. That's the whole change.
