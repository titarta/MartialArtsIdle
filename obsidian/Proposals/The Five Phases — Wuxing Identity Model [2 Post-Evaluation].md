# Forging the Five Phases — Post-Evaluation and Monetisation

**Status:** Post-evaluation — gaps identified, actionable  
**Date:** 2026-04-21  
**Companion document:** [[The Five Phases — Wuxing Identity Model [1 Redesign]]]

---

## Purpose

This document evaluates the Wuxing Identity Model redesign against three questions:

1. Are there still structural gaps?
2. Will players feel progression, express playstyle, and have goals worth grinding toward?
3. Are there enough monetisation hooks, and what should we borrow from comparable games?

---

## 5-Component Audit of the Full Redesign

| Component | Score | Gap |
|---|---|---|
| Clarity | **Strong** | Law diversity must remain legible, not overwhelming |
| Motivation | **Medium** | Named goals (world bosses) not yet defined |
| Response | N/A (idle) | Law + set choice IS the player's response — must feel consequential |
| Satisfaction | **Medium-weak** | Set completion moment needs a celebration event |
| Fit | **Strong** | Wuxing + xianxia cultivation theme cohesive |

---

## Structural Gaps

### Gap 1 — No named goals beyond "reach next realm" (Critical)

This is the biggest unresolved issue. All grinding is in service of a number going up. Players who cannot feel the *specific reason* they are farming drop off within two weeks.

**Root cause:** every game that achieves long-term retention gives players a specific, named target. Genshin: "clear Abyss Floor 12." Path of Exile: "kill Shaper." Idle Heroes: "unlock 6-star character." We have none of this.

**Fix — World Bosses:**
One named boss per world, not auto-fought, requiring a deliberate challenge run. Defeating it unlocks the next world and drops exclusive rewards (a specific law, a guaranteed main-stat set piece). Every item the player grinds for becomes a step toward that named fight.

"Defeat the Blood Sea Leviathan to unlock World 3."

This converts "farm to get stronger" into "farm to beat *that specific thing.*" The entire purpose of idle farming becomes legible.

---

### Gap 2 — Law diversity collapses identity (High)

One law per element means every Fire player has the identical passive. Within two weeks, the community finds the dominant law, everyone copies it, and build diversity dies.

**Fix — 3–4 laws per element minimum**, each with a different passive that enables genuinely different strategies within the same element:

- Fire/Offensive option A: "Every 3rd basic attack is a guaranteed exploit."
- Fire/Offensive option B: "Techniques deal +30% magical damage."
- Fire/Offensive option C: "Exploit damage multiplier increased by 40%."

All three are Fire. All three are valid. None is obviously dominant. Players form sub-identities ("I'm a Flameform player") which drives community engagement and long-term retention.

---

### Gap 3 — Set completion has no celebration moment (Medium)

The moment a player equips their 4th matching piece should feel like an event — visual effect, sound, a flash notification: *"Fire Set Awakened."* Currently this would just be a modifier quietly activating.

Genshin handles this with a dedicated set display that illuminates when activated. It is the moment the build *clicks* for the player emotionally. Missing this moment means they do not register the payoff they worked for.

**Fix:** Set activation triggers a screen flash + sound effect + a persistent "Set Active" indicator on the character screen. Low implementation cost, high emotional payoff.

---

### Gap 4 — Domain-specific drops missing (Medium)

Currently any combat region can drop any element artefact. This means "grind anywhere" — which removes the reason to care about which region you idle in beyond raw difficulty.

**Fix — Region-element affinity:**
Specific world regions drop specific element artefacts. Examples:

| World | Region type | Primary artefact elements |
|---|---|---|
| World 1 | Mortal Sect | Any (tutorial, no restriction) |
| World 2 | Desert Ruins / Beast Plains | Fire, Earth |
| World 3 | Burial Grounds / Void Rifts | Metal, Water |
| World 4 | Origin Depths / Primordial Forest | Wood, Earth |
| World 5 | Void Sea / Emperor Tombs | Water, Metal |
| World 6 | Open Heaven | All elements, higher quality floor |

A player building a Metal set now has a reason to specifically idle World 3 regions. Worlds feel distinct. Idle assignment becomes a strategic choice.

---

### Gap 5 — No "reason to return tomorrow" signal (Medium)

Genshin's answer is daily commissions + resin reset. Our game needs an idle-native equivalent: offline gains accumulate while away, but there is always one named thing waiting when the player returns.

The home screen idle widget already exists. It needs to surface a specific goal, not just "you were gathering." Examples:
- "You are 3 fights away from pity on a Gold artefact."
- "Blood Sea Leviathan is now within your power range."
- "Your Fire set is 3/4 — one piece away from awakening."

These are not new systems — they are surfaces for state that already exists.

---

## Monetisation Analysis

### Current hooks are structurally weak

Doubling offline gains and stamina recovery do not create desire — they reduce frustration. Players spend to remove an annoyance, not to get something they want. This is the weaker monetisation model.

The purchases that sustain games long-term are ones the player *wants*, not ones they *need to avoid frustration.*

---

### Borrow from Genshin

**Pity counter (borrow directly)**
After X combat runs without a rare artefact drop, the next is guaranteed Gold+ quality. Source: Genshin Impact gacha system (publicly documented by miHoYo, soft pity at 74 pulls, hard pity at 90).

- Converts dry streaks from "I'm unlucky" to "I'm building toward a guarantee"
- Blood lotus advances the pity counter — spending feels fair, not predatory
- Critical psychological difference: the player knows the system is working for them even when not spending

**Targeted reroll (borrow the concept, adapt)**
Currently rerolling a modifier is pure random. Blood lotus unlocks "targeted hone" — reroll one modifier and choose from 3 options instead of 1.

This is the single highest-value purchase in the modifier layer because it addresses the core frustration directly: investing in a piece and getting a bad roll. Players feel agency, not exploitation.

**Law scrolls as rare drops with blood lotus pity**
Laws should not be freely available from a menu. They drop from world bosses. Blood lotus can buy a "Law Selection Scroll" — presents 3 random laws of the player's current element to choose from.

This creates the desire loop of Genshin's banner without pure gacha mechanics. The player knows what they are buying; they are paying for agency over randomness, not random outcomes. This is the single most powerful monetisation surface in the entire design.

**Timed farming acceleration**
"Double idle farming for 4 hours" — classic idle monetisation, fits the game perfectly. Maps to "spend to extend a good session" psychology. Low friction, no power ceiling implications. Players who are actively enjoying the game will spend here naturally.

---

### Do NOT borrow from Genshin

**Stamina / resin system**
Limiting how much players can play per day is deeply unpopular with the dedicated player segment — the exact audience that would otherwise be the game's retention backbone and word-of-mouth promoters. An idle game that limits active engagement fights itself. Gate behind cultivation time or materials, never daily caps.

**Character gacha / banner system**
No characters exist in this game and adding them changes the game's identity. Laws are the character analog. Law scrolls (above) give the same psychological hook without the scope expansion.

---

## What "Wanting to Spend" Looks Like in This Game

For a player to voluntarily spend blood lotus, they need to be in one of these states:

| State | Trigger | Blood lotus offer |
|---|---|---|
| Close to set completion | 3/4 pieces equipped | "Boost drop rate for matching element for 2 hours" |
| Stuck on world boss | HP too low, keep dying | "Double material gains for 4 hours to accelerate prep" |
| Bad modifier roll on good piece | Frustration at RNG | "Targeted hone — choose from 3 options" |
| Wanting a specific law | Boss dropped the wrong one | "Law Selection Scroll — pick from 3 of your element" |
| Long offline session | Just returned after 8h | "Collect ×2 — watch ad or spend" (already exists) |
| Approaching pity | 60/74 runs without Gold | "Advance pity by 10 — guarantee sooner" |

The pattern: spending is offered at the moment of **desire or near-miss**, not at the moment of **frustration or block**. This distinction determines whether players feel generous or squeezed.

---

## Summary: What the Redesign Still Needs

These layer on top of the Wuxing model without changing its architecture:

| Priority | Item | Effort |
|---|---|---|
| Critical | World bosses as named goals (one per world) | High — new content |
| Critical | Law diversity: 3–4 laws per element | Medium — data + balance |
| High | Region-element artefact affinity | Low — data change |
| High | Pity counter for artefact drops | Medium — new mechanic |
| High | Law scrolls from boss drops + blood lotus pity | Medium — acquisition + shop |
| Medium | Set completion celebration moment | Low — UI/audio |
| Medium | Targeted reroll (blood lotus) | Low — UI variant |
| Medium | Home screen named goal surfacing | Low — UI reading existing state |

None of these require changing the Wuxing redesign's core architecture. They are progression and surface layers built on top of the solid foundation the redesign provides.
