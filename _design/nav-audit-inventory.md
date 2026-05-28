# Navigation Audit — Raw Inventory

Snapshot of every navigation surface present in `src/` as of this audit. Captured by reading `App.jsx`, `NavBar.jsx`, `TopBar.jsx`, every `*Modal.jsx` in `src/components/`, every `*Screen.jsx` in `src/screens/`, and the feature-flag config in `src/data/featureFlags.js`.

Legend for the verdict column in section 9:
- OK — already the right surface
- BORDERLINE — defensible but a better alternative exists
- WRONG — should be a different surface; specify what + why

---

## 1. Bottom Navigation (NavBar.jsx)

```js
SCREENS = [
  { id: 'home',         tKey: 'nav.home' },
  { id: 'cultivation',  tKey: 'nav.cultivation' },
  { id: 'worlds',       tKey: 'nav.worlds' },        // gated FEATURES.combat=false
  { id: 'character',    tKey: 'nav.character' },     // gated FEATURES.combat=false
  { id: 'collection',   tKey: 'nav.collection' },    // gated FEATURES.combat=false
  { id: 'production',   tKey: 'nav.craft' },         // gated FEATURES.combat=false
];
```

Visible TODAY (v1, combat=false): **Home, Cultivation, Collection** — wait, Collection is `combat`-gated too, so v1 actually shows only **Home + Cultivation**. The screenshot confirms this (Home / Cultivation / Collection labels visible, but Collection is the only one that survives because Collection isn't actually in SCREEN_FLAGS — re-checking: `collection` IS in SCREEN_FLAGS (line 78 of App.jsx). So the third bottom-nav slot today is actually a phantom — the screenshot shows "Collection" greyed/locked because `isUnlocked` returns false but `isHidden` returns false. Net visible: 2 unlocked tabs + 1 visibly-locked tab.

When combat ships, full set returns to 6 tabs which is past the 5-tab mobile ceiling — that breakage is already baked in.

---

## 2. TopBar (TopBar.jsx) — global actions row

Always visible chrome on every screen. From left to right:

| Element | Trigger | Opens |
|---|---|---|
| Blood Lotus balance pill | `onOpenShop` | `BloodLotusShopModal` (IAP top-up) |
| Shop button (next to balance) | `onOpenLotusShop` | `BloodLotusSpendShopModal` (4-category spend shop) |
| Qi readout | passive | (live counter — no action) |
| Karma readout | passive | (live counter — no action) |
| Reincarnation chip ☸ | `onOpenReincarnation` (when unlocked) | navigates to `reincarnation` SCREEN (`EternalTreeScreen`) |
| Crystal chip 🪨 | `onOpenCrystal` (when unlocked + combat flag) | navigates to home with `openCrystal` param — opens `CrystalDetailModal` |
| Progress hub 📊 | `onOpenProgress` | `ProgressHubModal` (3-tab) |
| Settings ⚙ | `onOpenSettings` | `SettingsScreen` rendered as modal |

Note: Reincarnation is a **screen** today (`navigate('reincarnation')`), but Settings is a **modal** even though its component is named `SettingsScreen`. This inconsistency is the root cause of the audit.

---

## 3. Modals routed at App.jsx level (`activeModal === ...`)

Mutually exclusive: opening one closes any other (App.jsx ~line 115). Tracked via `useBlockingPresence` so spontaneous queue events pause behind them.

| `activeModal` key | Component | Trigger | Surface |
|---|---|---|---|
| `'settings'` | `SettingsScreen` | TopBar ⚙ | modal-overlay shell wrapping a "settings-modal" container |
| `'shop'` | `BloodLotusShopModal` | TopBar Lotus balance pill | modal |
| `'lotus-shop'` | `BloodLotusSpendShopModal` | TopBar shop button | modal with internal 4-tab strip (Buffs/Consumables/QoL/Cosmetics) |
| `'progress'` | `ProgressHubModal` | TopBar 📊 | modal with internal 3-tab strip (Journey/Achievements/Stats) |
| `'pills'` | `PillDrawer` | HomeScreen pill chip | drawer (named correctly already) |
| `'daily'` | `DailyBonusModal` | event-queue (auto-enqueued on login) | modal |

---

## 4. Other modals (not in the App.jsx activeModal switch)

Triggered locally inside screens or by the event queue:

| Modal | Trigger | Lives where | Surface today |
|---|---|---|---|
| `SelectionModal` | new pending law offer (gated `FEATURES.laws=false`) | App.jsx | modal-overlay |
| `QiSparkChoiceModal` | every layer breakthrough | App.jsx | modal-overlay (forced — gameplay-blocking choice) |
| `TutorialModal` | one-shot tutorial cards via event queue | App.jsx | modal-overlay |
| `OfflineEarningsModal` | return after 5+ min away | HomeScreen | modal (captured in screenshot) |
| `CrystalDetailModal` | tap crystal level chip on Home | HomeScreen | modal |
| `CrystalFeedModal` | feed-crystal flow (v2 combat) | HomeScreen | modal |
| `ProducerDetailModal` | tap producer leader sprite | CultivationScreen | modal |
| `ReincarnationModal` | legacy — superseded by EternalTreeScreen | unused in v1 path | modal (likely dead code) |
| `TechniqueSlotModal` | combat-only (`FEATURES.combat=false`) | CharacterScreen / BuildTab | modal |
| `GearSlotModal` | combat-only | CharacterScreen / BuildTab | modal |
| `ArtefactUpgradeModal` | combat-only | CollectionScreen | modal |
| `ItemModal` | combat-only | CollectionScreen | modal |

---

## 5. Sub-tabs (chip rows inside screens or modals)

| Container | Tabs |
|---|---|
| CultivationScreen | Producers / Upgrades / Sparks |
| ProgressHubModal | Journey / Achievements / Stats |
| BloodLotusSpendShopModal | Buffs / Consumables / QoL / Cosmetics |
| WorldsScreen (combat) | (region tabs per world) |
| CollectionScreen (combat) | (item type tabs) |

---

## 6. Overlays (cinematic, not user-launched)

Triggered by the event queue (`useEventQueue`), serialised, gameplay-locking via `body.event-cinematic` CSS class.

| Overlay | Source | Blocks |
|---|---|---|
| BreakthroughBanner | major realm crossing | every other input |
| CharacterEvolutionOverlay | cultivator sprite tier change | every other input |
| Crystal evolution overlay | crystal tier crossing | every other input |
| Rotate-to-portrait overlay | landscape detected | every other input |

---

## 7. Tutorial cards (one-shots)

`TUTORIAL_IDS` constants. Fire once per device, idempotent. All render via `TutorialModal` through the event queue:

WELCOME, HOLD_TO_FOCUS, PRODUCERS_TAB, PRODUCERS_HINT, FIRST_PRODUCER, FIRST_LAYER_BT, FIRST_SPARK_OFFER, FIRST_SAINT, PROGRESS_HUB_MIGRATION, plus crystal-tier mechanic-unlock cards.

---

## 8. In-context popovers (technically modals but content-attached)

Already listed in section 4 — `CrystalDetailModal`, `ProducerDetailModal`, the slot modals. None use a true popover/tooltip pattern; all render as full modal-overlay sheets. Some of these would feel more native as inline expansions or bottom sheets (see classification).

---

## 9. CLASSIFICATION TABLE

Verdict references the rule in `nav-audit-recommendation.md`.

| Surface | Today | Verdict | Should be | Why |
|---|---|---|---|---|
| Home (bottom nav) | screen | OK | screen | place you live in |
| Cultivation (bottom nav) | screen | OK | screen | place you live in; about to become a destination map |
| Collection (bottom nav, visibly locked) | screen-placeholder | BORDERLINE | hide entirely until combat ships | a permanently-locked tab is dead UI; show it as a tab only when actually reachable |
| Worlds / Character / Production (combat flags) | screens | OK | screens (when combat unlocks) | each is its own destination |
| TopBar Top-Up button | opens IAP modal | OK | modal | discrete transaction, ends with a purchase confirmation |
| TopBar Spend Shop button | opens 4-tab modal | WRONG | screen | shopping with cosmetics/buffs/consumables/QoL is a place, not a transaction; browsing 4 categories on a 600px modal is cramped |
| TopBar Progress 📊 (3-tab modal) | modal | WRONG (mostly) | split: Journey screen, Achievements + Stats stay as modal tabs OR a single Codex screen with all three | Journey is the cultivation arc visualisation — players want to scroll, zoom, share; locking it inside a modal cripples it |
| TopBar Settings ⚙ | modal | WRONG | screen | every successful mobile app makes Settings a screen; nested confirms and import/export paste UX hate being inside a modal |
| TopBar Reincarnation ☸ → Eternal Tree | screen (correct) | OK | screen | already a screen; long-form skill-tree browsing |
| TopBar Crystal 🪨 (currently routes home + opens CrystalDetailModal) | modal-on-home | BORDERLINE | bottom sheet anchored to crystal | the modal pops over the whole world; a bottom sheet would let player keep tapping the cultivator while reading bonuses |
| Daily Bonus | modal | OK | modal | discrete transaction with start + end (collect) |
| Offline Earnings | modal | OK | modal | discrete transaction, queued by the event system |
| QiSparkChoice | modal | OK | modal | gameplay-blocking choice with timer |
| SelectionModal (law cards, combat-gated) | modal | OK | modal | gameplay-blocking choice |
| TutorialModal | modal | OK | modal | one-shot, must be dismissed |
| BreakthroughBanner / CharacterEvolution / Crystal evolution | overlay | OK | overlay | cinematic; cannot be dismissed via nav |
| Pill drawer | drawer | OK | bottom drawer | a true drawer already; correct pattern |
| Producer Detail | modal | BORDERLINE | bottom sheet | a Cookie-Clicker producer is read-AND-buy; a bottom sheet lets player swipe between producers without remounting |
| Crystal Detail | modal | BORDERLINE | bottom sheet (see above) | same reasoning |
| Technique slot / Gear slot / Item / Artefact upgrade (combat) | modals | BORDERLINE | unified Inventory SCREEN with sub-tabs | combat returns with 4 separate modals for what is functionally one inventory verb; consolidate now while it's still possible |
| Reincarnation legacy modal | dead | DELETE | n/a | dead code; ReincarnationScreen + EternalTreeScreen replaced it |
| Progress migration tutorial card | modal | OK | modal | one-shot |

---

## 10. Surface counts (today, with combat=false)

- Persistent destinations (bottom nav, visible+unlocked): **2** (Home, Cultivation)
- Persistent destinations (bottom nav, will return at combat unlock): **+4** (Worlds, Character, Collection, Production) = 6 total (over the 5-tab ceiling)
- TopBar entry points: **6** (Top-Up, Shop, Reincarnation, Crystal, Progress, Settings)
- App-level modals: **6** (settings, shop, lotus-shop, progress, pills, daily)
- Component-local modals: **~10** (mostly combat-gated)
- Tutorial cards: **9+** one-shots
- Overlays: **4** cinematic-class

Total live "things that take over the screen": ~26 surfaces. The classification rule + target architecture in `nav-audit-recommendation.md` cut this to ~18 by promoting Settings, Spend Shop, and Journey to screens (each removes one modal but they were already big modals — net pixel pressure goes down on mobile) and folding the four combat slot modals into one Inventory screen.
