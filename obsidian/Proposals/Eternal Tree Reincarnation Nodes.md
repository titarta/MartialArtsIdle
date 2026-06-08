# Eternal Tree, Reincarnation Nodes

**Status:** Proposal, awaiting node selection
**Date:** 2026-06-04
**Surface:** The Eternal Tree (between-lives prestige screen). `src/components/EternalTreeScreen.jsx`, `src/data/reincarnationTree.js`, `src/hooks/useReincarnationTree.js`
**Review tool:** `design/eternal-tree-mockup.html` (renders like the real in-game screen: pan / zoom / tap a node, mark Keep / Revise / Cut, Export)

---

## 1. Goal & Context

Grow the reincarnation tree from its current 7 live nodes (plus 18 flavour-only placeholders) into a real, branching prestige tree of about 30 nodes. Two hard constraints from the brief:

1. **Use only content we have.** Every node must hook a system that is actually running in v1.
2. **Chains must make sense.** A node that improves disciples should sit next to more disciple nodes, not next to an unrelated bonus.

## 2. The Constraint That Shaped It: live vs shelved

The single biggest finding. Most of the current placeholder nodes promise things the game cannot do in v1, because `combat`, `inventory`, and `laws` are flagged **off** in `src/data/featureFlags.js`. So "+combat damage", "+rare drop chance", "+artefact roll quality", "+1 law slot", "+pill effect", and "+breakthrough chance" all hook dead systems. The nodes here only touch the **8 live systems**:

| Live system | What a node can touch | Existing node |
|---|---|---|
| Cultivation core (qi/s) | global qi/s, offline rate, realm-gate easing | n_1 Devoted Path |
| Disciples / Roster | board-sum bonus, Merit rate, placement cost | n_2 Star Disciple (was a stub) |
| Qi Crystal | crystal qi-bonus mult, feed cost | n_3 Crystalline Focus |
| Producers | cost, self-synergy, cross-synergy, output mult | n_5 / n_6 / n_7 |
| Qi Sparks | rarity weights, permanent buff values | n_4 Discerning Eye |
| Spirit Garden | elixir potency / duration, grow time | (none) |
| Ad-boost | "while a boost is active" qi bonus | (none) |
| Karma | karma earned per life | (none) |

**Pre-wired seams.** The code already anticipates several prestige modifiers with no node yet: `treeProducerOutputMultRef` and `treeHeavenlyMultRef` are stubbed to 1, `qiOnRealmFracRef` to 0, and `keepProducerLevelsFrac` is already referenced by `wipeReincarnation`. Nodes that hit these are the cheapest to ship.

**Reincarnation facts that ground the design.** `wipeReincarnation` (in `src/systems/save.js`) wipes producers, crystal, sparks, upgrades, and the run; it preserves karma, the tree, the law library, and lifetime stats. Minigame *internal* state (Roster board, Garden dew) is not wiped, but minigame **access** is gated by the producer hitting Mythic (~100 owned), and producers reset each life. So a node that keeps a Hidden Art open across lives is genuinely useful.

## 3. Structure: an Idle Slayer adjacency grid

Nodes sit on a fixed grid and every connection links cells one step apart, orthogonal or diagonal. No long stretched edges. The whole tree grows from a single root, Devoted Path (top centre), exactly like the live tree grows from n_1. Its three grid-neighbours are the three live Hidden Art doors: Eternal Roster, Eternal Garden, Eternal Furnace. Taking Roster opens the Treasury (producers) and the Sect column beside it; taking Furnace opens Fortune and the Crucible column. Five chains then run straight down adjacent columns: Treasury, Sect, Garden, Crucible, Fortune. The two teaser unlocks (Echoes, Beast) sit at the top edge off the Furnace.

Two capstones close the bottom, and the grid is arranged so each one is adjacent to BOTH of its requirements: Eternal Foundation touches Boundless Coffers (Treasury keystone, diagonal) and Thousand Disciples (Sect keystone, above); Heaven-Touched touches Unbroken Core (Crucible keystone, left) and Unbroken Vigil (Fortune keystone, above). The two-requirement rule holds by construction.

Grid (col, row):

```
col:   0          1          2          3          4          5
row0:                      DEVOTED               ECHOES     BEAST
row1: FRUGAL     ROSTER    GARDEN     FURNACE    DISCERN
row2: START      STAR      POTENCY    MASTERY    RSPARK
row3: RESONANCE  STIPEND   LINGER     CRYSTAL    SMOOTH
row4: GUIDANCE   HAND      SOIL       LATTICE    VIGIL
row5: COFFERS    THOUSAND  BLOOM      CORE       HEAVEN     MERIT
row6:            FOUNDATION
```

| Branch | Anchor Hidden Art | Chain identity |
|---|---|---|
| The Sect | The Roster (Disciple) | unlock the disciple game, then upgrade the disciples |
| Spirit Garden | Spirit Garden (Herb Garden) | unlock the farm, then stronger / longer / faster brews |
| The Crucible | Pill Refinement (Furnace) | refinement: cash-out boost + Qi Crystal |
| The Treasury | (Ancestral Echoes teaser) | the producer economy spine |
| The Ascendant Way | (Beast Arena teaser) | the cultivator's own dao: qi/s, sparks, realm walls |

## 4. Node list (starting values, tune via the in-game Designer)

Karma is scarce (cube-root of cumulative Qi), so the full tree costs many lives to fill, which is the intended prestige horizon. Costs below total roughly 70 karma.

**The Sect (Disciples).** Eternal Roster (keep the Roster open across lives) > Star Disciples (+50% board-sum bonus, reborn n_2) > Sect Stipend (+30% Merit) > Open Hand (placements 20% cheaper) > **Thousand Disciples** (Disciple producer output x2, keystone).

**Spirit Garden.** Eternal Garden (keep the Garden open) > Verdant Potency (elixirs +20% stronger) > Lingering Brew (+30% duration) > Fertile Soil (crops grow 20% faster) > **Spirit Bloom** (start each life with 50 Dew + the Verdant recipe, keystone).

**The Crucible.** Eternal Furnace (keep Pill Refinement open) > Hidden Art Mastery (every minigame cash-out +25%, hits all five) > Crystalline Focus (+20% crystal bonus, n_3) > Dense Lattice (crystal feed 20% cheaper) > **Unbroken Core** (keep 25% of crystal level through rebirth, keystone, highest wiring cost).

**The Treasury.** Auspicious Start (begin each life owning 10 of every unlocked producer) > Frugal Cultivation (n_5) > Sect Resonance (n_6) > Senior's Guidance (n_7) > **Boundless Coffers** (all producers +15% output, keystone, pre-wired ref).

**The Ascendant Way.** Devoted Path (+0.1% qi/s per karma spent, n_1) > Discerning Eye (n_4) > Resonant Spark (permanent spark buffs +25%) > Smooth Ascension (major-realm gates 20% lower, seam exists) > Unbroken Vigil (+30% offline qi) > Boundless Merit (+10% karma per life, **balance-sensitive**, may cut).

**Future Arts (dormant teasers).** Ancestral Echoes (Treasure) and Beast Arena (Beast Pact). Repurpose option: until the minigames ship, make each a live "+25% that producer's output" node so the slot is not dead.

**Cross-branch capstones.** Eternal Foundation (keep 20% of every producer count through rebirth; needs Thousand Disciples + Boundless Coffers; the `keepProducerLevelsFrac` modifier is already anticipated in code). Heaven-Touched (+25% qi while any boost or elixir is active; needs Unbroken Core + Unbroken Vigil; uses the stubbed `treeHeavenlyMultRef`).

## 5. 5-Component Evaluation (tree as a whole)

| Component | Read |
|---|---|
| Clarity | Strong. Each node states one concrete effect on a system the player already knows. |
| Motivation | Strong. Keystones and capstones change persistent state across lives, not just a flat number. |
| Response | N/A (a spend screen, not a twitch system). Agency is in which branch you pour scarce karma into. |
| Satisfaction | Depends on the buy moment: needs the existing anchor / light feedback when a node locks in. |
| Fit | Strong, by construction: only live, on-theme systems; the Hidden Art unlocks tie to producers. |

## 6. Open Decisions (need sign-off)

1. **Teaser unlocks:** keep Ancestral Echoes / Beast Arena as dormant unlock slots, or repurpose them as live producer-output nodes now?
2. **Boundless Merit** (+karma/life): keep (gated deep, small %), or cut to avoid a prestige feedback loop?
3. **Unbroken Core** (carry crystal level): worth the high wiring cost, or swap for a cheaper crystal node?
4. **Entry points:** five independent branch heads (pick any path), or force Devoted Path first as a single root like today?
5. **Costs:** all-1-karma like today, or the graded 1 to 5 costs proposed here?

## 7. Next Steps

1. Curate in `design/eternal-tree-mockup.html`: tap a node, mark Keep / Revise / Cut + notes, Export, paste back.
2. Implement the survivors: add to `src/data/reincarnationTree.js` (reuse n_1, n_3, n_4, n_5, n_6, n_7 ids so their wiring carries over), extend the `modifiers` resolver in `useReincarnationTree.js`, thread new refs in `App.jsx`, and wire the disciple / garden / crystal / minigame seams.
3. Update `src/designer/schemas/reincarnationTree.js` so cost / desc / prereqs stay tunable in the in-game Designer.

## Related
- [[Spirit Garden Cropping & Alchemy Loop]] (the garden branch hooks this loop)
- [[The Five Phases — Wuxing Identity Model [1 Redesign]]] (longer-horizon identity redesign)
- Code: `src/data/reincarnationTree.js`, `src/hooks/useReincarnationTree.js`, `src/components/EternalTreeScreen.jsx`, `src/data/minigames.js`, `src/data/discipleMerge.js`, `src/data/spiritGarden.js`, `src/systems/save.js`
