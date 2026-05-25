# Home: "The Sanctum" (final pass)

## The central design move

**Reframe the entire Home screen as a unified meditation space.** The
cultivator at the center isn't a sticker on a background; they're at
the focus of a sacred composition. Every other element is arranged
AROUND them as something that belongs in the sanctum:

- Petition Tablet (天) hangs from the right wall (already there).
- Qi Crystal hangs from the ceiling on a chain; paired with the
  Petition Tablet, two suspended temple ornaments.
- A meditation mandala sits under the cultivator's feet; anchors
  the sprite to the scene with subtle radial pulse.
- The qi/realm readout becomes their identity strip below.
- The tier progress is a scroll ribbon with calligraphy 道 caps.

Result: one coherent SCENE instead of disconnected UI modules
floating over a wallpaper.

## TopBar: "The Threshold"

What changed:
- **One unified ring treatment for ALL action icons.** Same circle,
  same warm-bronze gradient, same border. The glyph inside changes
  (☸ Reinc, 册 Codex Ma Shan Zheng, gear-icon Settings) but the
  container is identical. Before: a mix of PNG icons, emoji buttons,
  colored sprites, no visual rhythm. After: one rhythm, varied
  meaning.
- **Currency reads INSCRIBED on the bar, not as pills.** Qi and
  Karma counters lose their pill backgrounds and sit as Cinzel
  values with tiny color-coded dots beside them. The bar IS their
  container; nothing needs a second container around them.
- **Lotus balance keeps its red identity** because it's the IAP
  currency and that color signal carries weight. Compact pill
  treatment with a red glow.
- **Spirit Bazaar entry next to the lotus pill** (small red ring
  with calligraphy 市) keeps the IAP-economy grouping tight on the
  left side; the right side is for game systems (Reinc / Codex /
  Settings).
- **ActiveBuffsChip moves to a more prominent slot** between the
  currency strip and the right-side actions, with a pulsing jade
  dot. Auto-hides when no buff active.

## The Sanctum: Home scene

What changed:
- **Meditation mandala under the cultivator** is the central new
  element. Two soft radial rings + a glow halo, pulsing at ~3.6s
  cadence. Anchors the sprite to the scene so it doesn't read as
  a sticker pasted on the background. Subtle enough not to fight
  the background art.
- **Qi Crystal hangs from the ceiling** on a thin gold chain.
  Previously the crystal floated in the air with no spatial logic.
  Now it mirrors the Petition Tablet on the right (two ornaments
  suspended in a temple). The chain anchors to the top edge of the
  threshold, so the chrome IS the ceiling.
- **REFINE button gets a proper Cinzel + gold pill treatment** with
  triangle prefix and tabular qi cost. Matches the Pavilion Tribute
  cartouche vocabulary.
- **The identity strip below the cultivator** replaces the old
  realm-name + qi-rate floater pair with a unified block: realm
  name (Cinzel hero), stage (Cinzel small caps in gold), thin gold
  rule, qi numbers row (current/cap in Cinzel + rate in gold-hot).
  Same vocabulary as the Settings Identity Plaque so the player
  recognizes the pattern.
- **Tier progress scroll** replaces the flat bar. Calligraphy 道
  brass caps on each end (the dragon-cap previously used was
  generic; 道 ties it explicitly to the cultivation theme). The
  fill keeps a moving sheen for life-feel. The progress bar is
  always 12px tall regardless of fill level so the eye doesn't
  track it as "growing height," only "growing length."
- **Idle assignment chip** moves to top-left with calligraphy glyph
  (園 garden, 炉 furnace, etc per the producer). One chip vocabulary
  per top-corner.

## BottomNav: "The Gates"

What changed:
- **Each tab gets a calligraphy glyph** (家 home, 修 cultivation,
  道 journey, 册 codex/collection). Previously emoji icons that
  didn't match the Cinzel + lacquer family. Now they're brush-stroke
  brass characters that read as part of the visual vocabulary.
- **Cinzel label below each glyph** at 9px with .18em tracking. Same
  treatment everywhere.
- **Active state = brass-rail underline AT THE TOP of the tab** (the
  side closest to the scene above), matching the Bazaar/Cultivation
  sub-tab pattern. So the active gold underline is consistent across
  every nav surface in the game.
- **Locked Collection tab** uses the Sealed Pavilion vocabulary;
  desaturated glyph + tiny 封 wax seal stamp in the corner. So a
  player who can't yet open Collection sees the same lore-pattern
  they see on a Sealed Shrine producer.

## What I considered and rejected

1. **Making the cultivator sprite tappable to open a "meditation
   focus" overlay.** Pretty but adds a tap surface that competes
   with the Crystal Refine button (the existing focus-cultivation
   primary action). Risk of confusing tap targets in the center of
   the screen.

2. **Replacing the home.png background with a procedural lacquer
   gradient.** Would unify the palette and remove the busy temple
   art, but the temple background is COMMISSIONED game art with
   warmth and place-character. Replacing it would feel like stripping
   the game of its visual personality to make UI engineers happier.
   Kept the background; added a soft radial vignette overlay so it
   stops fighting the UI.

3. **Putting the qi rate on the TopBar** (so it's always visible
   regardless of which screen you're on). Tempting but creates two
   conflicting truths: the rate on TopBar is the BASE rate; the
   rate on Home identity strip is the CURRENT rate (with buffs,
   focus, etc applied). One number is more honest than two; kept
   it on Home only.

## One trade-off

**The mandala animation runs constantly** (3.6s sine-pulse on opacity
+ scale). On real low-end Android this is one more compositor layer
animating forever, which adds a few ms of paint per frame and battery
cost over long sessions. The visual impact is real but the engineer
pass should add `animation-play-state: paused` when the home is
backgrounded (existing `visibilitychange` listener pattern) AND honor
`prefers-reduced-motion` by switching to a static (non-pulsing)
mandala. With those guards the cost is negligible.

## Implementation gotchas

- All four BottomNav glyphs (家, 修, 道, 册) need to be in the bundled
  Ma Shan Zheng. **家** is not in the current 48-char subset; needs to
  be added via the rebundle script. Threshold-icon-codex (册) is in.
  Engineer pass should re-run `python scripts/bundle_msz.py "<chars>"`
  with the new char set after editing JSX. Total scan should also
  pick up the new glyphs added to the home: 家, 市 (Spirit Bazaar
  threshold icon if added; already in bundle).
- The mandala uses pure CSS gradients + no images. The radial
  ellipse box-shadow trick on `.mandala::before` may need
  `will-change: transform, opacity` for smooth 60fps animation on
  some Android WebViews.
- The Qi Crystal `crystal-svg` in the mockup is an inline SVG
  placeholder; the production version should swap to the real
  `<img src={crystal_${level}.png}>` tag positioned the same way.
- The identity strip positions absolutely at `bottom: 78px`. Above
  the progress scroll (bottom: 18px) with 60px clearance. If a future
  redesign makes the progress scroll taller, the identity strip
  needs to follow.
- Chain on the Qi Crystal goes from `top: 0` of the sanctum to ~36px.
  In production the `top: 0` is the bottom of the TopBar (Sanctum's
  top edge); no change needed.
- Threshold layout uses flex with `min-width: 0` on the currency
  strip so it can shrink if Qi gets very long (999.9M Qi etc).
  Already present in the mockup.
