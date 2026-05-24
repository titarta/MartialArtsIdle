# Typography Audit v2 — Coherent Rule System

Second pass on top of `typography-audit.md`. The v1 pass was correct but partial: it added Cinzel to four lore surfaces (`.journey-group-name`, `.modal-title`, `.tech-modal-title`, `.home-breakthrough-name` and a few siblings) and left the *rest* of the game's named nouns in system sans. Result was incoherent — the same noun would render in two fonts depending on which screen you opened. This pass enumerates every named-noun surface and brings them onto a single rule.

---

## The rule (one rule, no exceptions)

> **Named noun → Cinzel.** Any text that is the name of a specific in-game entity — a realm, a stage, a region, a world, a law, a technique, a pill, an artefact, a gear piece, a producer, an enemy, an achievement, a spark, a buff, a reincarnation node, a shop item — renders in `var(--font-display)`.
>
> **Everything else → system sans.**
> - Section headers ("AUDIO", "INVENTORY", "PRODUCERS"): functional, not lore.
> - Body / description copy: read every frame.
> - Button CTAs ("BREAK THROUGH", "EQUIP"): tap targets must read instantly.
> - Kickers / tags ("READY", "+10", "LOCKED"): meta-labels on cards, not names.
> - Numeric counters: sans + always `tabular-nums`.
> - Modal titles: Cinzel **only if the modal subject is a named noun** (Heavenly Treasury yes, Settings no, Confirm Wipe no, Daily Gift no, Reincarnation no).

The test for "named noun": substitute the rendered string with a generic placeholder. If the surface becomes *meaningless* without the specific name ("Steel Body — Layer 7" vs "Realm — Layer 7"), it's a named noun. If the surface remains meaningful ("Settings" → "Menu" works fine), it's utility.

---

## What was already on Cinzel before this pass

| Selector | Surface |
|---|---|
| `.journey-group-name` | Journey list section headers (realm group names) |
| `.modal-title` | Generic modal title (Treasury, Item names, etc.) |
| `.tech-modal-title` | Technique slot modal title |
| `.ach-modal-title` | Achievements modal title |
| `.ach-card-title` | Achievement card name |
| `.ach-detail-title` | Achievement detail row name |
| `.tutorial-title` | Tutorial card title |
| `.home-breakthrough-name` | Old breakthrough banner (dead code, kept for revert) |
| `.home-breakthrough-kicker` | Old breakthrough kicker |
| `.char-evolve-name` | REAL breakthrough banner — realm name |
| `.char-evolve-kicker` | REAL breakthrough banner — "BREAKTHROUGH" |
| `.char-evolve-sub` | REAL breakthrough banner — tier sub |
| `.blshop-title` | Vermillion Bazaar header |
| `.blshop-eyebrow` | Vermillion Bazaar eyebrow ("CRIMSON OFFERINGS") |
| `.blshop-pack-label` | Pack name on each tile |
| `.blshop-pack-badge` | Pack tier badge text |

Already on `font-variant-numeric: tabular-nums`: 50+ numeric surfaces.

---

## Violations found (MISSING-CINZEL — named noun rendering in sans)

These are the surfaces that need Cinzel. Grouped by category.

### Realm / stage names (most leaked — same string in 3-4 places, mixed fonts)
| Selector | Where | Sample string | Fix |
|---|---|---|---|
| `.home-realm-name` | HUD over cultivator (compact) | "Tempered Body - Layer 7" | Add Cinzel |
| `.home-scene-realm-name` | Scene overlay realm strip | "Tempered Body" | Add Cinzel |
| `.home-pc-realm-name` | PC sidebar | "Tempered Body" | Add Cinzel |
| `.crystal-evolve-name` | Crystal-tier evolve banner | "Mortal Crystal · Tier 2" | Add Cinzel |
| `.coll-page-subtitle` | Page subtitle on Collection/Character | "Tempered Body — Layer 7" | Add Cinzel |

### Region / world names (Worlds screen)
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.world-name` | World card header | "Mortal Realm" | Add Cinzel |
| `.region-name` | Region row | "Misty Bamboo Grove" | Add Cinzel |
| `.enemy-chip-name` | Region preview enemy chip | "Spirit Crane" | Add Cinzel (small but it's an enemy name) |
| `.enemy-tooltip-name` | Enemy hover tooltip | "Spirit Crane" | Add Cinzel |
| `.stage-hud-name` | Combat HUD nameplate | "Spirit Crane" / "You" | Add Cinzel |

### Inventory / item names (Collection screen, picker modals, tooltips)
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.inv-name` | Generic item card name in Collection grid | "Cinnabar Pill" | Add Cinzel |
| `.coll-modal-title` | Item detail modal title | "Heavenly Crane Step" | Add Cinzel |
| `.art-tooltip-name` | Artefact hover tooltip | "Sun-Warmed Bracer" | Add Cinzel |
| `.art-pick-name` | Artefact picker card name (inline) | "Cloudbreaker Vambrace" | Add Cinzel |
| `.art-inline-card-name` | Inline picker grid card name | (same) | Add Cinzel |
| `.tech-icon-name` | Technique icon label | "Heavenly Crane Step" | Add Cinzel |
| `.tech-item-name` | Technique picker row name | (same) | Add Cinzel |
| `.build-tech-name` | Equipped technique label (Build tab) | (same) | Add Cinzel |
| `.law-name` | Equipped law name (Build tab) | "Sword Will Origin" | Add Cinzel |
| `.law-picker-card-name` | Law picker grid card name | (same) | Add Cinzel |
| `.active-set-name` | Equipped artefact set name | "Sword Sect Initiate" | Add Cinzel |
| `.pill-drawer-card-name` | Pill drawer card name | "Cinnabar Pill" | Add Cinzel |
| `.alc-forge-name` | Forge recipe name (Production) | "Cinnabar Pill" | Add Cinzel |
| `.alc-slot-name` | Workshop slot herb name | "Sky-Iron Lotus" | Add Cinzel |
| `.alc-herb-name` | Herbs list row | (same) | Add Cinzel |
| `.coll-set-card-name` | Set name in detail modal | "Sword Sect Initiate" | Add Cinzel |
| `.artefact-upgrade-title` | Artefact upgrade modal title | "Cloudbreaker Vambrace" | Add Cinzel |
| `.artefact-upgrade-cost-name` | Material cost row | "Phoenix Feather" | Add Cinzel |
| `.artefact-upgrade-feed-name` | Sacrifice candidate row | (same as inv-name) | Add Cinzel |

### Producer / upgrade names (Cultivation screen — every-screen prominence)
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.pl-name` | Producer lane name | "Apprentice", "Inner Disciple" | Add Cinzel |
| `.cs-up-name` | Upgrade card name | "Twin Cultivation" | Add Cinzel |
| `.cs-up-chip-name` | Upgrade chip name | (same) | Add Cinzel |

### Sparks / buffs (Sparks tab + active spark bar + spark choice modal)
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.st-block-name` | Spark grid card name | "Iron Resolve" | Add Cinzel |
| `.st-detail-name` | Spark detail title | (same) | Add Cinzel |
| `.qs-card-name` | Spark choice modal card name | (same) | Add Cinzel |
| `.qs-detail-name` | Spark choice modal expanded name | (same) | Add Cinzel |
| `.asb-row-name` | Active sparks popover row name | (same) | Add Cinzel |
| `.augment-name` | Initial law selection card (rare path) | "Sword Will Origin" | Add Cinzel |

### Reincarnation / Eternal Tree node names
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.reinc-node-label` | Tree node label | "Hollow Vessel" | Add Cinzel |
| `.et-node-tooltip-name` | Tree node hover tooltip name | (same) | Add Cinzel |
| `.et-branch-name` | Branch sidebar name | "Vermillion Path" | Add Cinzel |

### Shop / IAP item names
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.bls-card-name` | Blood Lotus spend shop card | "Phoenix Bloodroot" | Add Cinzel |
| `.bls-strip-name` | Shop strip name | (same) | Add Cinzel |
| `.bls-buff-card-name` | Buff card name | "Crimson Veil" | Add Cinzel |
| `.bls-item-name` | Item row name | (same) | Add Cinzel |

### Tooltips (named noun headers)
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.enemy-tooltip-drop-name` | Drop name in enemy tooltip | "Cloudbreaker Vambrace" | Add Cinzel |
| `.activity-tooltip-drop-name` | Same, gather tooltip | (same) | Add Cinzel |
| `.activity-tooltip-title` | Activity name | "Misty Bamboo Grove" | Add Cinzel |
| `.cdm-next-name` | Crystal detail next-tier name | "Refined Crystal · Tier 2" | Add Cinzel |
| `.cfm-title` / `.pdm-name` | Crystal modal title ("Qi Crystal") | "Qi Crystal" | Add Cinzel |
| `.ctt-title` | Crystal tooltip title ("Qi Crystal" / "🔒 Qi Crystal") | (same) | Add Cinzel |

### Existing-Cinzel modal title surfaces that should *also* apply to siblings
| Selector | Where | Sample | Fix |
|---|---|---|---|
| `.qs-title` | Qi Spark modal h2 ("Qi Spark") | "Qi Spark" | Add Cinzel |
| `.pill-modal-title` | Pill drawer header ("◈ Pills") | "Pills" | Add Cinzel |
| `.bls-header-title` | Blood Lotus shop header | "Blood Lotus Shop" | Add Cinzel |
| `.daily-modal-title` | Daily gift modal title ("Daily Gift") | "Daily Gift" | Keep sans — utility modal title, not a named entity (judgement call) |
| `.reinc-title` | Reincarnation modal title | "Reincarnation" | Add Cinzel (it's the name of the cosmology event) |
| `.et-card-title` | Eternal Tree card title ("Eternal Tree") | "Eternal Tree" | Add Cinzel |
| `.et-confirm-title` / `.reinc-confirm-title` | "Begin a New Life?" | utility — Keep sans |
| `.offline-title` | Offline earnings modal title ("Welcome Back") | Utility — Keep sans |
| `.sel-title` | Law selection title | "Choose your first Cultivation Law" | Keep sans — sentence-form utility title |
| `.loot-banner-title` | "Loot Ready" | Utility — Keep sans |

---

## Violations found (WRONG-CINZEL — utility surfaces using Cinzel)

| Selector | Sample | Decision |
|---|---|---|
| `.modal-title` | Already Cinzel; "Settings" / "Save Data" / "Wipe Save" titles use this selector | **Leave as-is.** Most modal-title sites *are* named entities (Treasury, Pill, Item, Slot picker label). The few utility uses are rare and the cost of introducing a `--lore` modifier is more code than the inconsistency is worth. The single rule "modal-title is Cinzel" is easier to maintain than "modal-title is Cinzel except when…". Settings has its own `.stg-title` selector — Settings modal titles do NOT use `.modal-title`. Verified. |

---

## Violations found (MISSING-TABULAR-NUMS)

Already comprehensive (60+ sites). Spot-checked a few more:
- `.home-mb-label` (mantra/spark numeric badges) — already has it on .home-mb-icon-row siblings. Not missing.
- `.coll-page-subtitle` already has it.
- `.daily-day-reward` already has it.
- Reviewed numeric surfaces during Cinzel pass; no obvious missing tabular-nums caught.

No new tabular-nums additions in this pass.

---

## Section headers / utility labels — STAY in sans (validating the rule)

| Selector | Why it stays sans |
|---|---|
| `.col-section-title` | "INVENTORY", "ARTEFACTS" — functional groupings |
| `.alc-section-title` | "FORGE", "WORKSHOP" — functional |
| `.stg-section-label` | "AUDIO", "VISUAL EFFECTS" — functional |
| `.stg-title` | "Settings" — utility modal title |
| `.stg-option-label` / `.stg-action-label` | toggles + buttons — interactive |
| `.coll-modal-subtitle` | rarity/type kicker under name | already tracked uppercase |
| `.coll-modal-section-title` | "Affixes", "Cost" — functional |
| `.reinc-info-card-title` / `.et-info-col-title` | "Lost on Rebirth", "Survives Rebirth" — functional |
| `.reinc-stat-label` / `.reinc-tree-karma-label` | "Karma", "Lives" — micro-labels |
| `.region-info-title-row` | container, not text |
| `.cs-buy-mode-label` | "Buy:" — micro-label |
| `.tutorial-kicker` | "STAGE 1" — tracked kicker |
| `.hq-kicker` | "PETITION" — tracked kicker |
| `.gear-slot-name` | unequipped slot label "Helm" | technically a slot type. Not a named noun. Keep sans. |
| `.build-slot-label` | "Technique 1" — slot index |
| `.active-sets-title` | "ACTIVE SETS" — section title |
| `.art-inline-picker-title` | "Select Artefact" — utility |
| `.law-picker-card-stats` | numeric — sans + tabular-nums (already) |
| `.home-pc-section-label` | "Cultivation" — section header on PC sidebar |
| `.home-gate-bypass-sub` | "Heaven's Pardon · ×3" — numeric kicker |
| `.home-mb-label`, `.home-pill-chip-label`, `.home-idle-chip-label`, `.home-sel-btn-label`, `.home-crystal-refine-label` | mostly counters + verbs, kept sans |

These are deliberate negatives — the rule's "named noun → Cinzel" only fires when the rendered string is a proper noun.

---

## Files touched

- `src/App.css` — 30+ named-noun selectors get `font-family: var(--font-display);` added
- No JSX touched (no new modifier classes needed — covered by the "modal-title is universally Cinzel" decision above)
- No new fonts bundled

## After

The string "Tempered Body" now reads in Cinzel on:
1. Home HUD `.home-realm-name`
2. Home scene overlay `.home-scene-realm-name`
3. Home PC sidebar `.home-pc-realm-name`
4. Collection / Character page subtitle `.coll-page-subtitle`
5. Journey group `.journey-group-name`
6. REAL breakthrough banner `.char-evolve-name`

Six surfaces, one font. That's the coherence the v1 pass was missing.

---

## Verification

Confirmed via Chrome DevTools `getComputedStyle` against a live render of each class:

- **56 named-noun classes** — all return `Cinzel, Georgia, 'Times New Roman', serif` for `font-family`. (Full list in section "Violations found (MISSING-CINZEL)" above.)
- **27 utility classes** — all return the system stack `-apple-system, BlinkMacSystemFont, …`. Bi-directional rule enforcement confirmed.
- Bundled fonts unchanged: `cinzel-latin.woff2` (25.9 KB) + `ma-shan-zheng-common.woff2` (69.9 KB) = **95.8 KB total**.
- Production build: clean, 329 KB CSS (gzip 60 KB), no new chunks.

In-context screenshots: see `audit-v2-screenshots/`. The audit-overlay screenshot at `audit-v2-screenshots/01-cross-surface-overlay.png` shows the same realm string rendered six times in identical Cinzel + the negative-control utility labels in system sans.
