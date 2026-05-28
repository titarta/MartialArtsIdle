# Screens Design Pass — Notes

Mockups: `settings-mockup.html`, `journey-mockup.html`, `bazaar-mockup.html` (all 390x844, self-contained).

> Note on baselines: the dev server ran but `preview_screenshot` repeatedly timed out at 30s (likely the canvas-heavy home renderer or HMR pipeline blocking the page event loop). I built the mockups from a direct read of the JSX, the live CSS tokens in `src/index.css`, and the existing nav-audit mockups in `_design/nav-audit-mockups/` as the baseline reference. If the user wants real-PNG baselines, those can be captured manually by opening localhost:5173 and using browser devtools.

---

## Settings — Cultivator Tablet

**What changed.** The form became a tablet. A new IDENTITY PLAQUE pins the top — calligraphy "道" watermark, Cinzel "Settings" headline, the player's current realm (icon + Saint · Middle Stage), and three lifetime micro-stats (Lives, Realms Crossed, Cultivating duration). Below it, six grouped cards: Audio, Visual Effects, Rendering Mode, Language, Save Data, and a clearly quarantined **Danger Path** card with warm-red wash and a two-tap commit. Section labels gained Cinzel uppercase tracking + a gold filigree underline. Audio rows kept the slider but use Cinzel for "Master / Music / Effects" so the screen reads as crafted lacquer, not a settings.app.

**The lift.** "I'm a cultivator on the Saintly Path, and this is my tablet." Settings now feels personalized, not utilitarian. The Identity Plaque is reusable in achievements/stats screens later.

**Implementation gotcha.** The Identity Plaque needs three pieces of state the current `SettingsScreen` doesn't import yet: current realm name+stage (from `useGameState`), `lifeIndex+1` for "Lives", and run duration (already tracked in stats). Plumb them as props from `App.jsx` rather than reaching into the store inside the component. The "道" watermark uses Ma Shan Zheng (`var(--font-cn)`) which is already bundled.

---

## Journey — Chronicle of the Cultivator

**What changed.** The flat list became a chronicle. A locked HERO HEADER sits above the scroll, showing the current realm at scale: 64px realm icon in a pulsing gold frame, big calligraphy "圣" watermark, Cinzel realm name + stage, "Chapter VI of XIII · Stage 27 / 49" eyebrow, then a qi progress bar with both the cost-to-next AND the qi/s gate (the gate is currently buried in the breakthrough modal — surfacing it on Journey makes the wall visible). Below, the realm groups are clustered under seven Roman-numeral **chapter dividers** ("The Mortal Path", "Awakening Element", "The Saintly Path"…) with a vertical gold rail down the left side carrying milestone dots. Past groups dim to 65%, current pulses, future fades. Each group is a single-line collapsed card by default; only the current realm expands sub-stages.

**The lift.** This now reads as the lore screen of the game, not a progression list. The chapter framing turns 49 stages into a 7-act epic — past chapters feel like turned pages, future ones like beckoning destinations. The hero header gives players a place to "live" between sessions.

**Implementation gotcha.** The chapter grouping is hand-authored in the mockup. To do it for real, define a `CHAPTERS` array in `src/data/realms.js` (range of realm-name indices per chapter) so it stays a data concern, not a render concern. Also: the hero pulse animation has to gracefully respect the user's `vfxEnabled` setting (read from `loadGraphics()`) — disable the keyframes when off.

---

## Spirit Bazaar — Temple Storefront

**What changed.** The 4-category card grid became a real shop. Header collapsed to one row (back chip · "The Spirit Bazaar" with calligraphy "市" watermark · balance pill · Top Up). A new ACTIVE BUFFS RAIL sits inline in the header — players see "×2 Crimson Aura 42m left, ×1.5 Producer Surge 3h 14m" before deciding to spend. Below: a FEATURED HERO CARD (Today's Pick) with strike-through pricing, ribbon, glow halo, and a countdown — this is the daily/rotating slot the bazaar always lacked. Category chips become a sticky scrollable rail (will fit more than 4 once more categories land). Each aisle gets a vermillion lantern bar on the left + Cinzel title + uppercase tag + count badge, so sections feel like physical aisles in a temple bazaar. Buff cards condensed to 2-column grid; cosmetic cards larger with real preview swatches.

**The lift.** Players see what they own (active buffs), what's hot (featured), what's available (category rail) without scrolling. Vermillion lantern dividers make the screen feel like a place, not a list.

**Implementation gotcha.** The Featured Hero needs a real rotation system. Simplest path: hardcode a 7-day rotation map (`[itemId by weekday]`) in `shopItems.js` with optional `featuredDiscount` and `featuredEndsAt` fields. Skip server-side rotation for v1. Also: the buff rail should reuse `BuffCountdown` from `SpiritBazaarScreen.jsx` — don't reimplement the tick logic.
