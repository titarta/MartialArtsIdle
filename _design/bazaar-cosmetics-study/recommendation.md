# Spirit Bazaar . cosmetic card redesign

**Date**: 2026-05-27
**Mockup**: `mockup.html` (3-phone comparison at ~1300px viewport)
**Status**: study, awaiting approval to implement

---

## What's wrong today

Three concrete problems in `src/screens/SpiritBazaarScreen.jsx` cosmetics aisle:

1. **Inaccurate preview.** The cosmetic preview is a single t1 cultivator sprite with a CSS `hue-rotate` filter applied (`TINT_PREVIEW_FILTERS` in the screen file, lines 34-42). But the live render applies the same body class (`cosmetic-char-crimson` etc.) to whatever sprite is on screen at the time, which evolves across **13 cultivator forms**. So the card sells "this one form, recolored" when the actual purchase is "this color, painted across every form you'll ever be."

2. **Price-as-button.** The `CosmeticCard.bls-card-cta` button's label is `"300 BL"` when not owned, then becomes `"Equip"` / `"Equipped"` after purchase (JSX lines 194-210). The price disappears the moment you own it, making it hard to compare prices in a grid and to remember what a skin cost.

3. **Coming-Soon clutter.** Each cosmetic group has a `group.premium` subsection that renders `CosmeticCardProcession` cards with `comingSoon: true` (data file `shopItems.js` lines 274+ and screen file lines 874-911). The cards have silhouetted previews and no action. Dead space.

---

## Pick . Evolution-Procession card with explicit price chip

One card shape for every cosmetic. Three components inside:

```
┌─────────────────────────────────────────┐
│  Crimson Path                  [● 300]  │  ← price chip top-right
│  Tints all 13 forms                     │     (vermillion-bordered, lotus dot)
│ ┌─────────────────────────────────────┐ │
│ │ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓           │ │  ← 13 silhouettes, all tinted
│ └─────────────────────────────────────┘ │     (l/r fade to convey scroll)
│  13 stages · evolves with you   [ BUY ] │  ← single CTA, just a verb
└─────────────────────────────────────────┘
```

### Three states from one shell

| State              | Price chip                | CTA          | Border accent |
|--------------------|--------------------------|--------------|---------------|
| Buyable            | bright (vermillion)      | `Buy`        | brass         |
| Owned + equipped   | replaced by jade ribbon  | `Unequip`    | jade          |
| Owned + not worn   | muted (lower opacity)    | `Equip`      | brass         |
| Insufficient BL    | bright (still informative)| `Buy` (disabled, 0.42 opacity) | brass |

### Per-slot procession

| Cosmetic slot | Silhouettes shown                            |
|---------------|----------------------------------------------|
| Character     | 13 cultivator forms (t0 . t12)               |
| Crystal       | 10 crystal tiers (crystal_1 . crystal_10)    |
| Particles     | 3 tinted orb dots (small / mid / large)      |
| Backdrop      | 3 tinted swatches at different luminances    |

For character + crystal we already have the assets (the silhouettes can reuse `getEvolutionSprites()`). For particles + backdrop we'd render a small abstract preview row (orbs / gradient swatches).

---

## Why this wins

- **Truth in marketing.** The procession shows what the player actually receives: a color treatment that paints every future evolution. The single-sprite hue-rotate undersells.
- **Price is always scannable.** A vermillion lotus chip in the header behaves like the Bazaar's TopBar balance pill - same vocabulary - and stays visible regardless of ownership state.
- **One CTA verb.** Removing "300 BL" from the button label makes the action self-evident (Buy / Equip / Unequip). Less reading per card.
- **No dead space.** Dropping "Coming Soon" reclaims a screenful per cosmetic group. When real Tier-2 skins ship they slot into the same card with their actual silhouettes.

---

## What to change in code

| File | Change |
|---|---|
| `src/screens/SpiritBazaarScreen.jsx` | Replace `CosmeticCard` with a unified `CosmeticCardProcession` for tier-1 too. Drop the `comingSoon`/`premium` group rendering blocks entirely (lines 874-911). |
| `src/screens/SpiritBazaarScreen.jsx` | Move the price out of the CTA label; add a `.skin-card-price` chip in the card header. CTA label becomes a verb only. |
| `src/screens/SpiritBazaarScreen.jsx` | `CosmeticCardProcession` already exists - lift it from the silhouette-only "tease" treatment to the all-tints-all-tiers default. Show colored silhouettes (tint applied), not pure black silhouettes. |
| `src/data/shopItems.js` | Drop the `comingSoon: true` entries from the cosmetics list (or keep them with `comingSoon:true` and just stop rendering them in the screen until the real assets land - your choice). |
| `src/App.css` | New `.skin-card-*` block for the unified card. Drop the legacy `.bls-card`, `.bls-card-preview`, `.bls-card-cta` cosmetic-only rules (the buff and QoL paths use different classes already). |

---

## Deferred (intentional)

- **Animation on the procession.** Could shimmer left-to-right across the silhouettes once on card mount as a "fan-out" - skip for v1, add later if it feels static.
- **Particles + Backdrop card variants.** Build them with placeholder rows (3 dots, 3 swatches) for v1; revisit if they don't read clearly.
- **Hero / featured cosmetic.** The "Today's Pick" hero is its own component (`FeaturedHero`), unchanged by this study. If we want it to use the procession too, that's a second pass.
