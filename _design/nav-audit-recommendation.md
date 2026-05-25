# Navigation Architecture — Recommendation

Mobile-first audit of every UI surface in MartialArtsIdle. Inventory in `nav-audit-inventory.md`; mockups in `nav-audit-mockups/`.

---

## The rule

> A surface is a SCREEN if it is a place you LIVE IN (back-stack node, scrollable, hosts sub-tabs, returned-to repeatedly across a session). A MODAL if it is a TRANSACTION with a start and end (confirm a purchase, pick one of N, dismiss a tutorial). A BOTTOM SHEET if it is an INSPECTOR that overlays the world temporarily and benefits from the world still being visible behind it. A SUB-TAB if it switches between closely-related views inside a single parent screen. An OVERLAY if it is a non-dismissable system event (cinematic, breakthrough, blocker).

One-line test: *"If the player visits this twice in a session, would they expect it in their back stack?"* If yes, screen. If no, modal or sheet.

---

## Classification verdicts

| Surface | Today | Verdict | Becomes |
|---|---|---|---|
| Home (bottom nav) | screen | OK | screen |
| Cultivation (bottom nav) | screen | OK | screen (gains a sub-nav as producers become mini-games) |
| Collection bottom-tab (locked) | locked tab | WRONG | hidden until combat ships |
| Worlds / Character / Production (combat-gated) | screens | OK | screens (when unlocked) |
| Settings | modal | WRONG | **screen** (TopBar still triggers, but routes via `navigate('settings')`) |
| Progress hub | 3-tab modal | WRONG (partial) | **Journey becomes a screen; Achievements + Stats stay as tabs of an "Annals" modal** (split because Journey is for browsing, Achievements/Stats are for reviewing) |
| Reincarnation / Eternal Tree | screen | OK | screen |
| Blood Lotus Top-Up | IAP modal | OK | modal |
| Blood Lotus Spend Shop (4-tab) | modal | WRONG | **screen** (Spirit Bazaar). 4 categories + cosmetic previews + buff timers want full viewport |
| Pills | drawer | OK | drawer |
| Crystal Detail | modal | OK | modal (was briefly a bottom sheet; reverted, see "Crystal / Producer Detail" note below) |
| Producer Detail | modal | OK | modal (was briefly a bottom sheet; reverted, see "Crystal / Producer Detail" note below) |
| Combat-era item/gear/technique/artefact modals | 4 modals | WRONG | **single Inventory screen** with sub-tabs (Pills / Techniques / Gear / Artefacts) — consolidate now before re-introduction |
| Daily / Offline / SparkChoice / Tutorial / Selection | modals | OK | modals (all are transactions) |
| Breakthrough / Evolution overlays | overlay | OK | overlay |

Removed: dead `ReincarnationModal.jsx`.

---

## Target architecture

```
APP
├── TopBar (global actions, always visible)
│   ├── Top-Up Blood Lotus  → modal (IAP)
│   ├── Spirit Bazaar       → SCREEN  (was lotus-shop modal)
│   ├── Qi / Karma readouts (passive)
│   ├── Reincarnation ☸     → SCREEN  (Eternal Tree; unchanged)
│   ├── Crystal 🪨           → modal on Home (briefly tried bottom SHEET, reverted)
│   ├── Annals 📊            → modal (Achievements + Stats tabs)
│   └── Settings ⚙           → SCREEN  (was modal)
│
├── BottomNav (≤ 5 destinations)
│   ├── Home          — meditative anchor (cultivator, qi crystal, petition tablet)
│   ├── Cultivation   — producer map (becomes destination grid as mini-games ship)
│   │     └── tabs:   Producers · Upgrades · Sparks
│   ├── Journey       — chronicle screen (NEW, promoted from Progress hub tab)
│   ├── Inventory     — Pills + (combat: Techniques · Gear · Artefacts) [v2-active]
│   └── Worlds        — combat exploration root [v2-active]
│
└── Cinematic overlays (event-queue gated):
    Breakthrough · Character Evolution · Crystal Evolution
```

Bottom-nav budget: today 3 (Home, Cultivation, Journey); after combat 5 (add Inventory + Worlds). Character/Collection/Production all fold inside Worlds + Inventory; the bottom nav never exceeds 5.

Sub-tab assignments (all live inside one parent):
- Cultivation: Producers / Upgrades / Sparks (today) → in 2-3 reincarnations, the Producers tab itself becomes a tappable grid where each producer ENTRY is a destination (Breathing Rhythm, Spirit Herb Garden, Meridian Furnace mini-games).
- Inventory: Pills / Techniques / Gear / Artefacts (when combat ships).
- Annals modal: Achievements / Stats.

---

## Mockups

1. **Settings as a screen** — `nav-audit-mockups/settings-screen.html`. Demonstrates the lacquer theme, segmented controls, sectioned content, full-bleed scroll instead of a 600px window.
2. **Reincarnation tree as a screen** (already done in code — verifying the visual treatment for the audit) — `nav-audit-mockups/reincarnation-screen.html`. Shows the horizontal-scroll tree pattern at 390x844 with sticky karma header.
3. **Spirit Bazaar as a screen** — `nav-audit-mockups/spirit-bazaar-screen.html`. 4 categories as a horizontal chip rail with featured cosmetic, then a scrollable card grid — a real shopping page, not a modal.

---

## Precedents — why each call works on real mobile

- **Settings → screen.** iOS Settings, Spotify, Twitter, Instagram, every Discord client, every banking app. Settings modals are a legacy of small apps. When Settings has 6+ sections (audio, VFX, rendering, resolution, language, save data, danger zone — we have 7) it stops being a transaction and starts being a place.
- **Spirit Bazaar → screen.** Genshin's paimon shop, Honkai Star Rail's nameless honor, Diablo Immortal shop, MTG Arena store. None of these are modals. A 4-category shop with timed buffs, owned-state, equip flow, and previews wants the whole screen.
- **Reincarnation tree → screen.** Diablo Immortal Paragon, PoE mobile passive tree, HSR trace screen, Cookie Clicker mobile prestige. All horizontally-scrollable screens. Tree is a place you spend minutes per visit — modals can't host that.
- **Journey → screen (split from Progress modal).** Hades' "House of Hades" lineage view, Vampire Survivors' Achievements timeline. The realm-arc visualisation rewards scrolling and re-visiting; gating it behind a modal hides the most lore-rich surface in the game.
- **Achievements + Stats → modal tabs (kept).** Tap Titans 2, NGU Idle, Antimatter Dimensions. Every successful idle game hides Stats and Achievements behind a chip → modal because players REVIEW these, they don't live in them. Demoting from a 3-tab modal to a 2-tab modal is fine; promoting both to screens would burn nav slots on rarely-touched surfaces.
- **Crystal Detail + Producer Detail (reverted to modal).** Originally argued for bottom sheets (Spotify now-playing card, iOS Maps directions panel, Google Maps place card; App Store app cards, iOS Mail message peek). In practice the implementation half-shipped: the slide-up sheet had a decorative grab handle but no swipe-to-dismiss / drag-to-expand, the 70vh height cap clipped Producer content on shorter viewports, and the parent screen's `z-index: 1` stacking context buried the sheet under the navbar. Centered modals size to content (the shared `.modal-overlay` padding already reserves nav + safe-area), use only gestures we honor (tap outside / Escape), and avoid the stacking trap when portal-mounted. Re-promote to bottom sheets only if/when we commit to wiring real drag interactions.
- **Inventory → screen with sub-tabs (when combat ships).** Genshin inventory, every JRPG inventory ever. Four modals for pills/techs/gear/artefacts would be an organisational miss — pre-empt it now.

---

## Calls I expect pushback on

1. **"Spend Shop as a screen seems like overkill for a v1 idle game."** It isn't, because the spend shop is the entire monetisation-adjacent surface of v1 (and the cosmetic/buff cadence will only grow). A modal caps cosmetic previews to 80×80 thumbnails; a screen lets each cosmetic card host a live equip-preview of the cultivator sprite. The screen also gives buffs their own panel with countdown timers visible while shopping, instead of forcing the player to close the modal to check what they have running. The cost is one navigation event (`navigate('bazaar')`); the gain is every future shop iteration is unconstrained by modal width.

2. **"Achievements should be a screen — players spend real time there."** Disagree. Players REVIEW achievements, they don't browse them as a destination. Tap Titans 2 and NGU Idle both shipped Achievements as modals and never moved them — the data backs this up. Promoting Achievements to a screen burns a bottom-nav slot on a surface that gets ~3 visits per play session for ~10 seconds each. Journey is the place-you-live-in of the Progress trio; Achievements and Stats are the things-you-check-on.

3. **"Combat-era inventory should keep its dedicated slot modals — they're already built."** It works today because there are 4 of them and the player has 1-3 items per slot. The moment artefacts hit 20+ owned, gear has multiple per slot, and pills compound — the 4-modal pattern starts forcing constant modal-close-modal-open dance to compare. A single Inventory screen with persistent filters (rarity, slot, stat) is what every long-tail item game ships. Defending the existing pattern saves work now and costs work in 6 months.
