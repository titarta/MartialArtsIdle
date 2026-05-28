# Content Inventory — Full Audit (2026-05-24)

Snapshot of every player-facing surface in `src/` as of today. Builds on the older `_design/nav-audit-inventory.md` and updates it for the Annals rename, the TopBar ActiveBuffChip, the Spirit Bazaar promotion, and what's MISSING (Wardrobe, Active Perks, Credits).

Legend:
- LOOP = visited many times per session (cultivation core)
- META = visited a few times per session (planning, identity, review)
- TX = transaction (start + end, modal-natural)
- INSPECT = inspector overlay
- CINEMATIC = system event, non-dismissable
- MISSING = the data exists in code but no surface displays it

---

## 1. Bottom navigation (NavBar.jsx)

Today (v1, combat=false): **Home, Cultivation, Journey** are visible. `worlds, character, collection, production` are flag-gated and hidden until combat ships.

| Surface | Category | Frequency | Shows |
|---|---|---|---|
| Home | LOOP | per session: dozens | cultivator sprite, qi crystal, qi rate, focus boost, idle ribbon, ActiveSparksBar, Petition Tablet, optional crystal-feed icon, optional bypass-token chip |
| Cultivation | LOOP | per session: many | sub-tabs Producers / Upgrades / Sparks |
| Journey | META | per session: 2-5 | Cinzel hero (current realm + qi-gate), Chronicle body (chapters I-VII with realm groups) |
| Worlds (combat) | LOOP | future | region tabs, gather/mine/combat slots |
| Character (combat) | META | future | gear + technique build |
| Collection (combat) | META | future | artefacts, materials |
| Production (combat) | META | future | crafting + alchemy |

Today: **3 visible tabs**. Combat unlock: **7 tabs** total before consolidation — already over the 5-tab ceiling. The previous audit identified the fix (fold Collection + Production into Worlds + Inventory). Still pending.

---

## 2. TopBar (TopBar.jsx) — global chrome

Left to right, today:

| Element | Type | Action |
|---|---|---|
| Blood Lotus pill (icon + balance) | balance + button | opens `BloodLotusShopModal` (IAP top-up) |
| Spirit Bazaar icon | button | navigates to `spirit-bazaar` SCREEN |
| Qi readout | live counter | passive (rAF-bound) |
| Karma readout | live counter | passive |
| ActiveBuffChip (NEW since last audit) | conditional button | tap routes to Bazaar; shows strongest active buff × multiplier + countdown |
| Reincarnation chip ☸ | conditional button | navigates to `reincarnation` SCREEN; only shown when unlocked |
| Annals 📊 | button + badge dot | opens `AnnalsModal` (Achievements + Stats tabs) |
| Settings ⚙ | button | navigates to `settings` SCREEN |

Note: the Crystal chip listed in the older inventory is GONE from the live TopBar. Crystal is interacted with directly on the Home scene (tap the sprite) — confirmed by reading the live `TopBar.jsx`. TopBar action icons today: **4 distinct** (Bazaar, Reincarnation, Annals, Settings) plus the conditional ActiveBuffChip. At budget.

---

## 3. App-level modals (`activeModal === ...` in App.jsx)

Mutually exclusive; broadcast-closes any other modal on open.

| Key | Component | Trigger | Surface |
|---|---|---|---|
| `'shop'` | `BloodLotusShopModal` | TopBar Lotus balance pill | modal (IAP) |
| `'annals'` | `AnnalsModal` (renamed from ProgressHubModal) | TopBar 📊 | modal with 2-tab strip (Achievements / Stats) |
| `'pills'` | `PillDrawer` | HomeScreen pill chip | drawer |
| `'daily'` | `DailyBonusModal` | event queue (auto on login when uncollected) | modal |

Removed since the older inventory: `'settings'` (now a screen), `'lotus-shop'` (now `spirit-bazaar` screen), `'progress'` (renamed to `'annals'`, Journey split out to screen).

---

## 4. Event-queue / locally-triggered modals

| Modal | Trigger | Lives in |
|---|---|---|
| `SelectionModal` | new law offer (laws flag off in v1) | App.jsx |
| `QiSparkChoiceModal` | every layer breakthrough | App.jsx |
| `TutorialModal` | one-shot cards via event queue | App.jsx |
| `OfflineEarningsModal` | return after 5+ min away | HomeScreen |
| `CrystalDetailModal` | tap crystal level chip | HomeScreen |
| `CrystalFeedModal` | feed-crystal flow (combat-only path) | HomeScreen |
| `ProducerDetailModal` | tap producer leader sprite | CultivationScreen |
| `TechniqueSlotModal` | combat | CharacterScreen / BuildTab |
| `GearSlotModal` | combat | CharacterScreen / BuildTab |
| `ArtefactUpgradeModal` | combat | CollectionScreen |
| `ItemModal` | combat | CollectionScreen |

Dead code that previous audit identified for deletion: `ReincarnationModal` (superseded by `EternalTreeScreen`). Cannot verify it's actually deleted without grepping; recommend the cleanup task stay open.

---

## 5. Sub-tabs

| Container | Tabs |
|---|---|
| Cultivation (screen) | Producers / Upgrades / Sparks |
| Annals (modal) | Achievements / Stats (Journey split out into bottom nav) |
| Spirit Bazaar (screen) | jump rail to Buffs / Consumables / QoL / Cosmetics (single scroll, anchor-jump) |
| Worlds (combat screen) | region tabs |
| Collection (combat screen) | item-type tabs |
| Cosmetics-within-Bazaar | sub-section per slot (Cultivator, Crystal, Particles, Backdrops) with `Tier 1` / `Coming Soon` splits |

---

## 6. Overlays (cinematic, system-driven)

| Overlay | Source | Locks input |
|---|---|---|
| BreakthroughBanner | major realm crossing | yes |
| CharacterEvolutionOverlay | cultivator sprite tier change | yes |
| Crystal evolution overlay | crystal tier crossing | yes |
| Rotate-to-portrait overlay | landscape detected | yes |

---

## 7. Tutorial cards (one-shots)

`TUTORIAL_IDS`: WELCOME, HOLD_TO_FOCUS, PRODUCERS_TAB, PRODUCERS_HINT, FIRST_PRODUCER, FIRST_LAYER_BT, FIRST_SPARK_OFFER, FIRST_SAINT, PROGRESS_HUB_MIGRATION, plus crystal-tier mechanic-unlock cards.

---

## 8. MISSING surfaces (the catalyst for this audit)

These bits of state ARE in code but have no display, or display in the wrong place.

### 8a. Wardrobe (owned cosmetics + equip flow)

State exists: `useShopInventory.inv.cosmetics` (owned), `useShopInventory.inv.equipped` (per-slot). API exposes `equip`, `unequip`, `isCosmeticOwned`, `isCosmeticEquipped`, `getEquippedInSlot`.

Today's surfacing: only inside the Spirit Bazaar catalog. The shop renders each card with a state-machine that includes `'owned'` (shows "Equip") and `'equipped'` (shows "Equipped"). This conflates two screens:
- the **store** (rotating catalog, "what can I buy")
- the **closet** (owned set, "what am I wearing")

Today ~5 owned cosmetics; in 2 reincarnations 12-15+. Spec says owned items should disappear from the catalog (or move to a small "owned" tail) AND appear in a dedicated equip surface.

### 8b. QoL perks (purchased, permanent)

State exists: `useShopInventory.inv.qol[itemId]: true` for permanent unlocks; `useShopInventory.inv.stacks[itemId]: int` for stackables; `useShopInventory.hasQol()`, `getStack()` queries.

Today's surfacing: the Bazaar's QoL aisle keeps showing purchased items with a disabled "Owned" CTA. The Cultivation screen surfaces ONLY the auto-buy toggle (because that's the consumable face of `qol_autobuy_cheapest`). The OTHER QoL items (Decisive Heart auto-confirm, Patient Mind +2h offline cap stacks) have NO inspector — the player who bought "+4h offline cap" can't see anywhere "you have +4h offline cap".

Required surfaces:
1. HIDE owned permanent QoL from the Bazaar catalog (with a small "Owned perks → see Codex" link).
2. SHOW owned QoL as "Active Perks" somewhere readable.

Stackables (Patient Mind +2h) are a partial case: the Bazaar should keep showing them until `maxStack` is reached, but they ALSO need to surface their current stack count in the Perks display.

### 8c. Consumable inventory (one-shots)

State exists: `useShopInventory.inv.consumables[itemId]: int`. Currently only one item: `consumable_major_bt_bypass` (Heaven's Pardon, the gate bypass token).

Today's surfacing: a chip on HomeScreen surfaces the bypass token count near the breakthrough flow (when held), then is consumed in `onUseBypassToken`. There's no general "my consumables" tab. Acceptable for v1 (one consumable), but: when v2 ships more (e.g., karma-grant pills, instant-spark scrolls), they need a unified inventory.

### 8d. Credits / About

State exists: `package.json` version, font/license metadata (Cinzel, Ma Shan Zheng). Today's surfacing: **nothing**. There is no Credits or About surface anywhere in the app. The Settings footer in the OLDER mockup hinted at `Martial Arts Idle v1.4.2` but the live Settings screen doesn't even render a version string.

### 8e. Lifetime / run stats

State exists: `useStats` exposes the full stat dictionary (run + lifetime bucket). `StatsBody` (inside Annals) shows them well already. Not actually missing — included here as a check.

### 8f. Identity plaque (current realm + lives + cultivating time)

Currently lives in: Settings screen header AND Journey screen hero (different framings). Two homes for one piece of identity data is duplication that the reorg can clean up.

---

## 9. Surface counts today

- Persistent destinations (bottom nav visible): **3** today (Home, Cultivation, Journey). After combat: 5 max under the rule.
- TopBar entry points: **4 action icons + 1 conditional buff chip + Lotus balance + currencies**. At budget.
- App-level modals: **4** (shop, annals, pills, daily). Down from 6 since the older audit.
- Component-local modals (active in v1): **~3** (offline earnings, crystal detail, producer detail). Combat-only modals dormant.
- Tutorial cards: **9+** one-shots.
- Overlays: **4** cinematic-class.
- **MISSING surfaces: 2 critical (Wardrobe, Credits) + 1 partial (Active Perks display).**

The architecture is in much better shape than at the previous audit. The remaining problem isn't TOO MANY surfaces; it's that THREE pieces of owned-state data (cosmetics, QoL perks, consumables) have no consolidated viewer. The reorganization in `recommendation.md` answers where they go.
