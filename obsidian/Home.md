# Idle Cultivation — Design Document

> Mobile idle game combining cultivation (xianxia), idle mechanics, and incremental progression.

## Navigation

- [[Game Vision]] — Concept, target market
- [[Roadmap]] — Development stages
- [[Cultivation System]] — Qi rate, realms, breakthroughs
- [[Realm Progression]] — Realm list, costs, breakthrough gates
- [[Stats]] — Stat reference + modifier types
- [[Elements]] — 5-element system
- [[Items]] — Pills and Artefacts
- [[Materials]] — Herbs, Minerals, QI Stones
- [[QI Crystal]] — Flat qi/s upgrade
- [[Tab Progression]] — Feature unlock gates
- [[Reincarnation]] — Karma formula, 7-node Eternal Tree
- [[Implementation Notes]] — Tech stack, file structure, feature status
- [[Ideation]] — Open questions, scratchpad

## Core Pillars

| Pillar | Description |
|---|---|
| **Idle** | Set up farming, leave game running |
| **Mobile** | Designed for short sessions with passive progress |
| **Cultivation** | Xianxia-inspired progression — realms, qi, laws |

## Tech Stack

React 19 + Vite + Capacitor 8 · localStorage auto-save · `requestAnimationFrame` game loop
