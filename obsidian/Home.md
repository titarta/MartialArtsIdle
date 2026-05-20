# Idle Cultivation — Design Document

> Mobile idle game combining cultivation (xianxia), idle mechanics, and incremental progression.

## Navigation

- [[Game Vision]] — Overall concept, target market, monetization angle
- [[Roadmap]] — Development stages
- [[Cultivation System]] — Realms, sub-realms, breakthroughs
- [[Primary Stats]] — Essence, Soul, Body
- [[Stats]] — Full stat reference + modifier catalogue
- [[Realm Progression]] — Major realms and their thresholds
- [[Laws]] — Elemental cultivation arts
- [[Secret Techniques]] — Advanced combat skills
- [[Items]] — Pills and Artefacts
- [[Artefacts]] — Affix pools, weights, and generation rules
- [[Materials]] — Herbs, Minerals, Cultivation resources
- [[Worlds/World]] — Combat zones, region unlocks
- [[Worlds/Gathering]] — Herb collection (idle, occasional enemies)
- [[Worlds/Mining]] — Ore extraction for artefact crafting (idle, occasional enemies)
- [[Combat]] — Map, zones, enemies
- [[Enemies]] — Enemy types, stat profiles, technique pools, region assignments
- [[Reincarnation]] — Prestige system
- [[Implementation Notes]] — Tech stack, file structure, what's built vs stubbed
- [[Ideation]] — Brainstorms, open questions, scratchpad

## Core Pillars

| Pillar | Description |
|---|---|
| **Idle** | Set up farming, leave game running |
| **Mobile** | Designed for short sessions with passive progress |
| **Cultivation** | Xianxia-inspired progression — realms, qi, laws |

## Key Design Goals

- Incremental progression with visible **power bumps** to maintain engagement
- Multiple cultivation types via **procedural generation** (find books)
- **Reincarnation** as prestige loop — retain knowledge, reset world
- Long-term: target Chinese market if quality warrants

---

## Implementation Status

_Updated 2026-05-20. See [[Implementation Notes]] for full technical details._

| Layer | Feature | Status |
|---|---|---|
| **Layer 1** | Qi cultivation loop, realm progression, focused mode, offline Qi | ✅ Done |
| **Layer 1** | QI Crystal, Qi Sparks, Selection events, Ad boost | ✅ Done |
| **Layer 2** | Laws (element, rarity, cult speed, typeMults, uniques) | ✅ Done |
| **Layer 2** | Secret Techniques, Technique slots + drops | ✅ Done |
| **Layer 2** | Combat loop, Enemies, Cleared regions | ✅ Done |
| **Layer 2** | Artefacts (drop, equip, roll, sets, upgrades), Unique modifiers | ✅ Done |
| **Layer 2** | Primary stats (Essence/Soul/Body) | ⚠️ Defined; some not fully wired |
| **Layer 3** | Gathering (idle herb collection) | ✅ Done |
| **Layer 3** | Pills, Alchemy / Production screen, Crafting | ✅ Done |
| **Layer 4** | Mining ore data + world region mapping | ⚠️ Data only |
| **Layer 4** | Mining hook + UI screen | ❌ Not started |
| **Layer 4** | Artefact refinement (ore → material) | ❌ Not started |
| **Prestige** | Reincarnation (karma, eternal tree, wipe rules) | ✅ Done |
| **Infra** | Daily bonus, IAP / Blood Lotus, Achievements, Audio, EN/PT i18n | ✅ Done |

**Not started:** World bosses, domain drops, active play content (see [[Proposals/Early Game Hook — Engagement Pass]]), return-visit signal.

**Tech stack:** React 19 + Vite + Capacitor 8 (mobile)  
**Save system:** localStorage, auto-save every 2s, export/import via base64  
**Game loop:** `requestAnimationFrame` with delta-time

---

## Claude Commands
