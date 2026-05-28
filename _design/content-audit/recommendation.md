# Content Audit — Recommendation

Mobile-first audit of MartialArtsIdle's information architecture, prompted by three orphan surfaces (Wardrobe, Credits, QoL Perks). Inventory in `inventory.md`; mockups in `mockups/`.

---

## The rule (unchanged from the nav-audit)

A surface is a **SCREEN** if you live in it (back-stack, scrollable, re-visited). A **MODAL** if it's a transaction with start/end. A **BOTTOM SHEET** if it's an inspector overlaying the world. A **SUB-TAB** if it's closely-related views inside one parent. An **OVERLAY** if it's a non-dismissable system event.

Test: *if the player visits this twice in a session, would they expect it in their back stack?* Yes → screen. No → modal or sheet.

TopBar ≤ 4 action icons. Bottom nav ≤ 5 tabs. Modal exclusive (one at a time).

---

## The architectural choice

Three options were considered. I picked **Option Ω (Hybrid)**.

| | Settings becomes | New surface | Pros | Cons |
|---|---|---|---|---|
| **Φ Fold-all** | Settings + Wardrobe + Perks + Credits in one long screen | none | Simplest, no new nav | Settings becomes a 9-section kitchen-sink; Wardrobe wants visual real estate that fights config controls |
| **Ψ Split-pure** | Settings = pure config (Audio, Visual, Save, Danger, Credits) | "Cultivator's Codex" screen with Identity + Wardrobe + Achievements + Stats + Perks | Clean separation; identity gets first-class home | Burns a bottom-nav slot or a TopBar slot; promotes Achievements (rarely visited) above Wardrobe (frequently visited) in the same parent — wrong weight |
| **Ω Hybrid (chosen)** | Settings = config + Active Perks + About link | "Cultivator's Codex" replaces Annals modal with 3 tabs: Wardrobe / Achievements / Stats | Wardrobe gets the visual surface it needs; Settings stays config-ish but absorbs the lightweight "what perks am I running" answer; Credits gets a dedicated screen reached from Settings; no new TopBar or bottom-nav slot | Identity plaque now lives in TWO places (Settings header + Codex header) — we keep that intentionally; it's the lacquer aesthetic anchor on both |

### Why Ω over Ψ

**Active Perks are config-shaped, not catalog-shaped.** A list of "you have +6h offline cap, auto-buy enabled, auto-confirm BT enabled" is 3-5 lines of label-value text. It belongs next to Audio sliders and Language chips, not next to a visual cosmetic grid. Putting Perks in Settings keeps the visual register consistent (small label rows) and lets Wardrobe own the visual register on the other side.

**Wardrobe IS visual.** Owned cosmetics are sprite previews + equip toggles. They need card-grid real estate. Combining Wardrobe with Achievements (also visual) inside one modal-turning-screen is natural. The current Annals modal already lives inside the TopBar 📊 icon, so we get the new surface essentially for free by renaming and adding a tab.

**Credits are a destination, not a state.** A real Credits/About page deserves its own screen (team, fonts, licenses, version, links). A row inside Settings that pushes to it is the standard mobile pattern (every iOS app, Spotify, Discord).

### Why NOT Ψ

If Codex held Achievements + Stats + Perks + Wardrobe + Identity, it would be a 5-tab screen — over the sub-tab budget. And the natural tab weights are wrong: Wardrobe and Achievements would be heavy, Perks and Stats would be light, Identity wouldn't be a tab at all (it'd be a sticky hero). The "long screen with sticky header + 4 tabs" pattern is fragile on 390px.

---

## Per-surface verdicts

| Surface | Today | Verdict | Becomes |
|---|---|---|---|
| Home (bottom nav) | screen | OK | screen |
| Cultivation (bottom nav) | screen | OK | screen |
| Journey (bottom nav) | screen | OK | screen |
| TopBar Lotus pill → IAP modal | modal | OK | modal |
| TopBar Spirit Bazaar → screen | screen | OK | screen — but FILTER catalog (see §3) |
| TopBar 📊 → Annals modal | modal, 2 tabs | RENAME + EXPAND | **modal, 3 tabs — Wardrobe / Achievements / Stats** ("Codex" or keep "Annals"; see naming note) |
| TopBar ☸ → Reincarnation | screen | OK | screen |
| TopBar ⚙ → Settings | screen | EXPAND | screen + **Active Perks section** + **About row** at the bottom |
| **Wardrobe** | does not exist | NEW | **first tab of the Codex modal** (was Annals) |
| **Active Perks** | does not exist | NEW | **section inside Settings screen**, between "Save Data" and "Danger Path" |
| **Credits / About** | does not exist | NEW | **dedicated screen** reached via Settings → About row |
| Pills | drawer | OK | drawer |
| Crystal detail | modal | (older audit said bottom sheet — not in scope here) | n/a |
| Producer detail | modal | (same) | n/a |

### Naming note: keep "Annals" or rename to "Codex"?

The current modal is named Annals. Adding Wardrobe expands its meaning beyond "record/review" into "what I own + how I look." Two reasonable names:
- **Keep Annals** if you treat owned cosmetics as a record of accomplishment ("the robes you have earned"). Risk: feels academic for an equip flow.
- **Rename to Codex** if you treat it as a personal compendium (identity + closet + record). Cleaner conceptual fit; the cost is one tutorial card explaining the rename.

I recommend **Codex**. The mockup uses Codex. If you push back, swap the word — the architecture is identical.

---

## Spirit Bazaar filtering rule

The Bazaar catalog today shows EVERY item regardless of ownership state. After the reorg:

| Category | When to show | When to hide | Where else it lives |
|---|---|---|---|
| Buffs (timed) | always | never | TopBar ActiveBuffChip (strongest active) shows live countdown; Bazaar shows "ACTIVE" ribbon |
| Consumables (oneshot) | always | never | inventory count chips on Home (e.g., Heaven's Pardon near BT flow) |
| QoL — permanent | when not owned | once owned (hide the card entirely) | **Settings → Active Perks section** |
| QoL — stackable | when stack < maxStack | when stack == maxStack | **Settings → Active Perks section** (with `×N` count badge) |
| Cosmetics | when not owned | once owned (hide from main grid) | **Codex → Wardrobe tab** |

### Wiring details

The Bazaar's renderer reads from `useShopInventory.inv`:
- `inv.qol[itemId]` — boolean owned flag for permanent QoL. Hide card when `true`.
- `inv.stacks[itemId]` and `item.maxStack` — hide when `stacks[itemId] >= maxStack`.
- `inv.cosmetics[itemId]` — boolean owned flag for cosmetics. Hide card when `true`.
- `inv.equipped[slotType]` — already used to render the "Equipped" ribbon; moves to Wardrobe.

Owned cosmetics still need a small "see Codex" link at the bottom of each cosmetic section so the player who just bought one understands where it went. Recommend: a one-line callout below the section header — `Owned: 3 · view in Codex →`.

The `Coming Soon` cards stay in the Bazaar regardless of ownership; they don't have an owned state.

---

## Architectural decision diagram

```
APP
├── TopBar  (≤ 4 action icons)
│   ├── Top-Up Blood Lotus  → modal (IAP)
│   ├── Spirit Bazaar 🏮     → SCREEN  [catalog FILTERS owned QoL + cosmetics]
│   ├── (Active buff chip)   → routes to Bazaar
│   ├── Reincarnation ☸     → SCREEN  (Eternal Tree)
│   ├── Codex 📜             → modal (3 tabs: Wardrobe · Achievements · Stats)
│   └── Settings ⚙           → SCREEN  (config + Active Perks + About)
│
├── BottomNav (≤ 5 destinations)
│   ├── Home
│   ├── Cultivation   → tabs: Producers · Upgrades · Sparks
│   └── Journey
│   ── (combat-era: + Inventory + Worlds; Collection/Production fold in)
│
├── Settings (screen)
│   ├── Identity Plaque  (current realm, lives, time cultivating)
│   ├── Audio
│   ├── Visual Effects
│   ├── Rendering Mode
│   ├── Window Resolution  (desktop only)
│   ├── Language
│   ├── Active Perks       ← NEW (reads inv.qol + inv.stacks)
│   ├── Save Data          (export / import)
│   ├── Danger Path        (wipe)
│   └── About row          ← NEW → pushes to About SCREEN
│
├── Codex (modal, renamed from Annals)
│   ├── Wardrobe       ← NEW (owned cosmetics by slot, equip / unequip)
│   ├── Achievements
│   └── Stats
│
├── About (screen, reached from Settings)
│   ├── App version
│   ├── Team & credits
│   ├── Fonts & licenses
│   ├── Open-source acknowledgments
│   └── Links (support, privacy, terms)
│
└── Cinematic overlays (event-queue gated):
    Breakthrough · Character Evolution · Crystal Evolution · Rotate-to-portrait
```

---

## Calls I expect pushback on

1. **"Wardrobe in the Codex modal — shouldn't it be its own screen?"** Defensible, but you'd need a 6th TopBar slot or a 4th bottom-nav slot, both at budget. Modal-with-tabs is the right pattern: Wardrobe is a META surface (the player visits 1-3 times per session after a cosmetic purchase or for a fashion change). It doesn't need back-stack persistence; the modal close-and-resume is fine. If the cosmetic library swells past ~50 items per slot and equip becomes a real browse activity, promote then.

2. **"Active Perks inside Settings — that's hiding gameplay info under a config icon."** Disagree. Active Perks are not gameplay info, they're "what you previously paid for." Players who bought QoL items already know the EFFECTS (Decisive Heart auto-confirms; Patient Mind extends offline cap). They forget WHETHER they own them. A short label-value list in Settings is exactly where banks put "your subscriptions": tucked under a settings cog, never in the way, always findable. Putting it on Home or Cultivation would clutter the loop.

3. **"Just hide owned items inline — don't open a new surface."** This is the half-measure. Hiding without surfacing breaks player trust: "I bought Patient Mind +6h yesterday, where did it go?" The combination is hide-from-store + surface-in-perks. Both halves matter.

4. **"Two identity plaques (Settings + Codex) is redundant."** Intentional. Each plaque grounds its screen in the lacquer aesthetic and reminds the player whose journey they're configuring / reviewing. Removing one would leave the other screen visually unanchored. Cost: ~80 LoC duplicated; gain: aesthetic continuity.

5. **"Rename Annals → Codex is churn."** True — but it's a one-time cost, paid by a single tutorial card that already has a precedent (`PROGRESS_HUB_MIGRATION` did the same thing 2 weeks ago when Journey split out). The semantic fit is much better after Wardrobe joins.
