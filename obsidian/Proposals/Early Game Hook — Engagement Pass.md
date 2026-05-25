# Early Game Hook — Engagement Pass

**Status:** Proposal — NOT implemented
**Date:** 2026-04-26

---

## Problem

First ~150 seconds has one input (hold cultivator), one number, no decisions. Combat, laws, crystal, gathering all gated past Layer 3+. Multiple testers reported "slow / low interaction."

---

## Diagnosis

| Component | Score | Why |
|---|---|---|
| Clarity | OK | qi/s + progress bar legible |
| **Motivation** | **WEAK** | No goal teaser; player can't see what qi unlocks |
| **Response** | **WEAK** | One input, no decisions in first 2.5 min |
| **Satisfaction** | **WEAK** | Breakthroughs quiet; no juice between |
| Fit | OK | Calm pace matches genre |

Fix Motivation + Response **before** tuning numbers.

---

## Proposals

**Tier 1 — Juice (cheap, fix ~60% of perceived slowness)**
- 1.1 Floating qi numbers on every tick (+1 flies off cultivator, fades 800ms)
- 1.2 Achievement spam early (every layer break L1–L10, then every 5)
- 1.3 "Coming next" goal-teaser strip (5 grayed icons with requirements)
- 1.4 Stronger hold state (aura pulse + screen-edge glow)

**Tier 2 — Decisions (Response)**
- 2.1 Focus tokens before each hold session (tap 1 of 3 random buffs)
- 2.2 Optional rhythm tap during hold (+20% boost on hit)

**Tier 3 — Move content earlier (Motivation)**
- 3.1 Tappable Qi Crystal at L1 (+5 flat qi/tap — NOT compounding)
- 3.2 First stance choice at L2 (weak options, resets on reincarnation)
- 3.3 Training-dummy combat preview at L1 (trivial fight, no drops)

**Tier 4 — Return-visit hook**
- 4.1 In-session offline reward: if tab backgrounded ≥10s, show "While you cultivated, +X qi"

---

## Priority Order

1. Ship Tier 1 (1.1 + 1.2 + 1.3) first — ~1 day. Re-test.
2. Then 3.1 (Crystal at L1). Half-day.
3. Then 2.1 (focus tokens).
4. Re-test before adding more.

---

## Related

- [[Tab Progression]]
- [[Cultivation System]]
