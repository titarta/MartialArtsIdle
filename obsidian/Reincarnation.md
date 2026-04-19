# Reincarnation — Rebirth System

> *"The body is ash. The soul remembers. The next life begins wiser."*

---

## Overview

Reincarnation is the prestige mechanic. The player resets all progress in
exchange for **Reincarnation Karma**, a permanent currency spent in the
**Eternal Tree** to unlock powerful lifelong buffs.

- **Tab name:** Rebirth (new entry in the main NavBar).
- **Tab visibility:** unlocked the first time the player reaches **Saint Early Stage**
  (realm index 24). Once unlocked it stays visible forever, even after reincarnating
  (gate: `karma.unlocked === highestReached >= SAINT_UNLOCK_INDEX`).
- **The Reincarnate button itself** is additionally gated on the **current**
  realm — `cultivation.realmIndex >= 24` — so reborn characters cannot
  immediately rebirth again until they cultivate back up to Saint. The Eternal
  Tree remains spendable in the meantime.
- **Karma is awarded immediately on reaching a new realm for the first time.**
  Re-reaching a realm in a later life grants zero additional karma. Players
  can spend their karma in the Eternal Tree at any point — rebirth is not
  required to unlock nodes.

### What a rebirth does to the law library

Reincarnation wipes QI, realms, pills, inventory, artefacts, techniques, and selections — but the **entire owned-law library survives**. `activeLawId` is cleared, so the reborn character is unequipped and must pick a new active law from their persisted library. That unequip moment is the intentional identity reset — every life can be a different playstyle without losing past acquisitions. Karma and the Eternal Tree also persist.

---

## Karma per realm

Awarded for the breakthrough *into* the realm. Starting realm (index 0) grants
nothing — you only earn karma by progressing.

| Major realm (index range)        | Karma / stage | Major total |
|----------------------------------|--------------:|------------:|
| Tempered Body Layer 2–10 (1–9)   | 1             | 9           |
| Qi Transformation (10–13)        | 1             | 4           |
| True Element (14–17)             | 1             | 4           |
| Separation & Reunion (18–20)     | 2             | 6           |
| Immortal Ascension (21–23)       | 2             | 6           |
| Saint (24–26) — **unlock here**  | 2             | 6           |
| Saint King (27–29)               | 3             | 9           |
| Origin Returning (30–32)         | 3             | 9           |
| Origin King (33–35)              | 4             | 12          |
| Void King (36–38)                | 4             | 12          |
| Dao Source (39–41)               | 5             | 15          |
| Emperor Realm (42–44)            | 5             | 15          |
| Open Heaven Layer 1–6 (45–50)    | 6             | 36          |
| **Peak total**                   |               | **143**     |

Reaching peak in a single life awards all 143 karma.

Karma state lives in `localStorage` key `mai_reincarnation` and tracks:
- `karma` — current spendable balance
- `highestReached` — highest realm index ever touched across all lives
- `maxAwarded` — highest realm index that has already granted its karma
- `lives` — number of completed reincarnations

Pending karma (what would be awarded if the player reincarnated right now)
= `Σ karmaForReachingIndex(i)` for `i` from `maxAwarded+1` to `highestReached`.

---

## The Eternal Tree

A **5-branch radial tree** rendered in an SVG canvas (pannable + scroll-to-zoom).
Four main branches radiate from the root with a sealed fifth branch (Yin Yang)
that unlocks once the player has bought ≥ 2 of the four main keystones.

| Branch | Theme | Direction |
|---|---|---|
| 🏛 **Ancestor's Legacy** | Carry-overs from past lives, offline cap, head-start | 135° |
| ⚔ **Martial Dao** | Combat — technique slots, exploit, drop quality | 45° |
| 🌟 **Fate's Path** | Drop-rate, rarity upgrades, preview-luck | 320° |
| 💪 **Heavenly Will** | Cultivation Power, HP, survival | 220° |
| ☯ **Yin Yang** *(sealed)* | Phase-based playstyle around the Taiji Manual | 270° |

Each main branch has 4 sequential nodes + 1 keystone (5 nodes). Yin Yang has
6 nodes. **Cross-branch connector nodes** (`cb_*`) link adjacent keystones
with AND prereqs and grant cross-branch synergies.

Authoritative definitions: `NODES` array in `src/data/reincarnationTree.js`.
Each node is `{ id, branch, step, label, icon, desc, cost, prereqs, prereqMode, keystone? }`
with `prereqMode ∈ { 'or', 'and', 'yyUnlock' }`.

Purchases persist in `localStorage` key `mai_reincarnation_tree` and are NOT
wiped on reincarnation. Each node is a one-time purchase. Nodes can be
bought at any time during a run — rebirth is not required.

### Sample node effects (representative — full list in code)

| Node | Branch | Cost | Effect |
|---|---|---|---|
| Inherited Meridians (`al_1`) | Legacy | 50 | +10% cultivation speed permanently. |
| Ancient Roots ★ (`al_k`) | Legacy | 300 | Start each life with your previous Law in your collection. |
| Veteran's Eye (`md_1`) | Martial | 75 | Dropped techniques arrive one quality tier higher. |
| The Fourth Form (`md_4`) | Martial | 250 | Unlocks a 4th technique slot. |
| Heaven's Bladework ★ (`md_k`) | Martial | 400 | Auto-upgrades highest-quality technique once per life. |
| Lucky Star (`fp_1`) | Fate | 50 | +1% technique drop rate on all enemies. |
| Fortune's Thread ★ (`fp_k`) | Fate | 350 | First technique drop in each world is the highest tier available. |
| Soul Tempering (`hw_1`) | Will | 100 | +5% Cultivation Power (purchasable up to 5×). |
| Heavenly Constitution ★ (`hw_k`) | Will | 500 | Cultivation Power growth curve permanently steepened. |
| Taiji Manual (`yy_1`) | Yin Yang | 400 | Adds the Yin/Yang phase-cycling Taiji law to your collection. |
| Primordial Balance ★ (`yy_k`) | Yin Yang | 800 | Taiji Manual ascends to Transcendent + 6th passive slot. |

---

## The reincarnate flow

1. Player clicks **Reincarnate** in the Rebirth tab.
2. Confirmation modal explains what is wiped vs what survives.
3. On confirm:
   - `karma.reincarnate()` bumps the life counter (karma itself was already
     granted incrementally as realms were reached).
   - `wipeReincarnation()` snapshots the **entire** owned-laws library,
     calls `wipeSave()` (which clears the standard set; `mai_jade`,
     `mai_lang`, `mai_reincarnation`, and `mai_reincarnation_tree` are
     untouched), then re-seeds `mai_owned_laws` from the snapshot.
     `mai_active_law` is intentionally **not** restored — the reborn
     character must re-equip a law from the persisted library.
   - `window.location.reload()` boots a fresh run — karma, tree and the
     full owned-laws library load back from their keys.

---

## Code map

| Responsibility                               | File                                   |
|----------------------------------------------|----------------------------------------|
| Karma scaling + tree node definitions        | `src/data/reincarnationTree.js`        |
| Karma state + per-realm tracking             | `src/hooks/useReincarnationKarma.js`   |
| Tree purchases + derived modifiers           | `src/hooks/useReincarnationTree.js`    |
| Tab UI                                       | `src/screens/ReincarnationScreen.jsx`  |
| Save-key preservation                        | `src/systems/save.js` (`wipeReincarnation`) |
| Nav tab entry                                | `src/components/NavBar.jsx`            |
| Wiring into cultivation / combat / stats     | `src/App.jsx` + `useCultivation.js` + `useCombat.js` |
