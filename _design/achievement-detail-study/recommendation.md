# Achievement Detail . interaction redesign

**Date**: 2026-05-27
**Mockups**:
- `mockup.html` . v1 study (4 patterns side-by-side, picks Option A)
- `mockup-v2.html` . v2 study (two flavors of Option A . **stacked vs drill-down**, picks A2)

**Files to touch on implementation**:
- `src/components/AchievementsBody.jsx` (state + render swap)
- `src/components/AchievementPlaque.jsx` (new . the shared visual component)
- `src/App.css` (new `.ach-plaque-*` block, drop legacy `.ach-detail-*`)

---

## Update (2026-05-27) . A2 picked over A1

Original recommendation was A1 (a true second overlay over the Codex scrim). User flagged a fair concern about modal-on-modal. v2 study compared A1 vs A2 (drill-down inside the Codex body, single layer).

**Picked: A2 . Drill-down.** Same Trophy Plaque visual, but the Codex body fades from "grid" to "plaque" with a brass `← Back` chip. One overlay layer the whole time. Bigger canvas for the plaque (full Codex width), trophy moment lands harder. Codex X still closes everything; Back returns to the grid (scroll position preserved).

This stays consistent with the rest of the game: Crystal / Producer / Karmic Charm / Buffs all use a true overlay because they're rooted from a SCREEN (Home, Cultivation). The Codex is itself a modal, so an in-place drill-down is the more honest pattern.

Same component (`AchievementPlaque.jsx`) regardless of mount: A2 renders it inline in the Codex body, A1 would have rendered it in a portal. Switching between flavors later is a one-line change.

---

## What's wrong today

The grid of badges sits inside the Codex modal's scrolling body, and the detail panel is rendered as a **sibling that pins itself with `position: sticky; bottom: 0`**. Two concrete problems:

1. **Position bug** . tapping a badge near the bottom of the grid puts the drawer on top of its immediate neighbours, blocking the visual context of what you just looked at. You have to scroll the grid to see them again.
2. **Stale visual language** . the drawer is the older flat-purple-with-tiny-X style from before the Sanctum design pass. Everywhere else in the home / cultivation / breakthrough surfaces is now brass + dark lacquer + vermillion + Ma Shan Zheng. The achievement detail looks like a leftover.

---

## Pick . Trophy Plaque (Option A)

A small, centered, brass-framed plaque appears as **its own overlay** over the Codex modal scrim, dimming the grid behind it. Same vocabulary as the tutorial card (`.tutorial-*` family): vermillion ribbon along the top edge, large Ma Shan Zheng glyph watermark, brass-edged medallion holding the achievement icon, Cinzel display kicker + title, soft cream body.

```
   |  ▬▬▬ vermillion ribbon ▬▬▬
   |
   |         ┌──────────┐
   |         │  medallion (brass)
   |         │     ✦
   |         └──────────┘
   |       ACHIEVEMENT EARNED        ← Cinzel kicker, brass caps
   |          First Spark            ← Cinzel title, cream
   |             初符                 ← optional MSZ glyph
   |     ─────────────────
   |   Pick your first Qi Spark
   |   after breaking through
   |   a layer. The talisman
   |   writes itself.
   |
   |   Unlocked 12d ago . Tier 1     ← optional meta row
```

Background: dark lacquer gradient (`#2a1d10 → #150e07`), watermark glyph (鸿/符/突/etc., chosen by achievement category) at ~160px sitting at 10% opacity behind copy.

### Three states (single component, data-driven)

| State              | Medallion          | Kicker text          | Title       | Body                                  | Notes                          |
|--------------------|--------------------|----------------------|-------------|---------------------------------------|--------------------------------|
| Unlocked           | brass icon         | "Achievement Earned" | full title  | full description                      | optional "Unlocked Nd ago"     |
| Locked + hidden    | vermillion seal 封 | "Mystery Achievement"| "???"       | "Keep cultivating to reveal this."    | full obscure                   |
| Locked + secretDesc| vermillion seal 玄 | "Hidden Path"        | full title  | obscured hint (italic + lower opacity)| title is visible, body is not  |

### Why this wins

- **Solves the position bug completely** . it's a new layer, not part of the grid.
- **Reuses 90% of the CSS we already wrote** for the tutorial card . one source of truth for "ceremonial unlock pop-in" across the game.
- **Reads as a reward**, not a footnote. The pop-in animation (0.32s ease-back) celebrates the achievement.
- **Locked variants slot in** without a separate visual treatment: same shell, vermillion seal swap, italic body, single-line "Mystery / Hidden" kicker.
- **Tap scrim or X to dismiss** . consistent with every other modal in the game.

### What it costs

About 80 lines of new CSS (a thinned-down clone of the tutorial card block) and a tiny new `AchievementPlaqueModal.jsx` component. JSX wiring in `AchievementsBody.jsx` is a one-line swap: render `<AchievementPlaqueModal>` when `selectedId` is set, instead of the inline `.ach-detail` div. Legacy `.ach-detail-*` CSS gets deleted (~90 lines).

---

## Why not the others

**B . Inline cartouche** . the tapped badge expands inline into a row-spanning card. No overlay, no position bug. But it causes a layout reflow on every tap (badges below it jump down), and visually it reads as "I expanded a row in a list" rather than "I unlocked a thing". Fine for a settings list, wrong for a trophy case.

**C . Bottom sheet** . a sheet rises from the bottom edge with the detail. Stays at the edge so it doesn't cover specific badges. But the achievement loses its trophy feel . it's just informational. Also competes spatially with the BottomNav. Better fit for filters or transient actions than a celebratory unlock.

---

## Open notes for the implementer

- Glyph behind the watermark should be chosen per achievement category (e.g. 符 for spark-related, 突 for breakthroughs, 关 for gates, 圣 for ascension, 封 default-locked). Easy to extend by adding a `glyph` field to the achievement record or deriving from `category`.
- If we want a sparkle / particle burst on first-ever open per achievement (i.e., right after the toast that announces the unlock), it can ride on the same plaque . a quick `--particle-burst` CSS class with 6 brass motes.
- The "Unlocked Nd ago" meta row is optional . skip it for v1 if the data isn't already in the achievement record.
- Reduced motion: drop the pop-in to a 0.12s fade.
