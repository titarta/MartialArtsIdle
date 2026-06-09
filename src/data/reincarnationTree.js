/**
 * reincarnationTree.js — the Eternal Tree node definitions (28 nodes).
 *
 * One root (n_1 Devoted Path) that unveils outward. Layout is a grid:
 * each node has integer (col, row) and connections only run to grid
 * neighbours (orthogonal or diagonal), Idle-Slayer style. Capstones have
 * two prereqs, both placed adjacent to the capstone.
 *
 * Fields:
 *   id          stable id matched by the runtime resolver (useReincarnationTree)
 *   label       display name
 *   glyph       calligraphy sigil drawn on the node disc
 *   branch      grouping label (display only)
 *   cost        karma cost
 *   prereqs     ids that must be owned first (every prereq, AND logic)
 *   col,row     grid position
 *   description player-facing effect text
 *   comingSoon  true = visible but not yet purchasable (effect not wired yet)
 *   keystone    true = branch capstone (display)
 *   capstone    true = cross-branch capstone (display)
 *   teaser      true = unlocks a Hidden Art whose minigame is not built yet
 *
 * The actual EFFECT of a node is resolved at runtime by useReincarnationTree.js
 * (pattern-matching on id). Editing description text alone does NOT change
 * gameplay — that still requires the resolver + the consuming system.
 */

export const NODES = [
  // ── Root ───────────────────────────────────────────────────────────────
  { id: 'n_1', label: 'Devoted Path', glyph: '道', branch: 'Root',
    cost: 1, prereqs: [], col: 3, row: 0,
    description: 'Gain +0.1% Qi/s for each karma spent on the Eternal Tree.' },

  // ── The Sect (disciples) ────────────────────────────────────────────────
  { id: 'roster', label: 'Eternal Roster', glyph: '升', branch: 'The Sect',
    cost: 1, prereqs: ['n_1'], col: 3, row: 1,
    description: 'The Roster (disciple promotion) stays unlocked every life, instead of relocking until your Disciples reach Mythic again.' },
  { id: 'disc_base', label: 'Disciple Foundation', glyph: '育', branch: 'The Sect',
    cost: 2, prereqs: ['roster'], col: 2, row: 1,
    description: 'Disciple producer output is doubled (a flat lift on the whole roster; stacks with Thousand Disciples).' },
  { id: 'disc_transcend', label: 'Transcendent Disciples', glyph: '超', branch: 'The Sect',
    cost: 3, prereqs: ['disc_base'], col: 2, row: 2,
    description: 'Unlock the Transcended tier for your Disciple producer (above Mythic). The Sect Roster also gains a Transcendent rank above Ancestor.' },
  { id: 'star', label: 'Star Disciples', glyph: '星', branch: 'The Sect',
    cost: 1, prereqs: ['roster'], col: 3, row: 2,
    description: '+50% Disciple board-sum bonus: each board point lifts disciple Qi/s by 1.5% instead of 1%.' },
  { id: 'hand', label: 'Open Hand', glyph: '施', branch: 'The Sect',
    cost: 2, prereqs: ['star'], col: 3, row: 3,
    description: 'Disciple placements cost 20% less Merit.' },
  { id: 'thousand', label: 'Thousand Disciples', glyph: '萬', branch: 'The Sect',
    cost: 3, prereqs: ['hand'], col: 3, row: 4, keystone: true,
    description: 'Your Disciple producer output is doubled.' },

  // ── Spirit Garden ───────────────────────────────────────────────────────
  { id: 'garden', label: 'Eternal Garden', glyph: '苗', branch: 'Spirit Garden',
    cost: 1, prereqs: ['roster'], col: 4, row: 2,
    description: 'The Spirit Garden stays unlocked every life.' },
  { id: 'potency', label: 'Verdant Potency', glyph: '露', branch: 'Spirit Garden',
    cost: 2, prereqs: ['garden'], col: 4, row: 3,
    description: 'Spirit Garden elixir buffs are 20% stronger.' },
  { id: 'linger', label: 'Lingering Brew', glyph: '留', branch: 'Spirit Garden',
    cost: 2, prereqs: ['potency'], col: 4, row: 4,
    description: 'Spirit Garden elixir buffs last 30% longer.' },
  { id: 'soil', label: 'Fertile Soil', glyph: '沃', branch: 'Spirit Garden',
    cost: 2, prereqs: ['linger'], col: 4, row: 5,
    description: 'Spirit Garden crops grow 20% faster.' },
  { id: 'bloom', label: 'Spirit Bloom', glyph: '蓮', branch: 'Spirit Garden',
    cost: 3, prereqs: ['soil'], col: 4, row: 6, keystone: true,
    description: 'Begin each life with 50 Spirit Dew and the Verdant Tonic recipe already known.' },

  // ── The Crucible (Hidden Arts + Qi Crystal) ─────────────────────────────
  { id: 'furnace', label: 'Eternal Furnace', glyph: '丹', branch: 'The Crucible',
    cost: 1, prereqs: ['garden'], col: 5, row: 2,
    description: 'Pill Refinement stays unlocked every life.' },
  { id: 'mastery', label: 'Hidden Art Mastery', glyph: '藝', branch: 'The Crucible',
    cost: 2, prereqs: ['furnace'], col: 5, row: 3, comingSoon: true,
    description: 'Strengthens the rewards of every Hidden Art. (Coming soon — effect being defined alongside the minigames.)' },

  // ── Alchemy (Furnace cauldron capacity) ─────────────────────────────────
  // Each cauldron node grants +1 parallel cook slot in the Meridian Furnace.
  // The furnace minigame starts with 1 cauldron (unlocked alongside the
  // p_meridian_furnace producer at realm 7); the rest are prestige-gated.
  { id: 'cauldron_2', label: 'Second Cauldron', glyph: '鼎', branch: 'The Crucible',
    cost: 2, prereqs: ['furnace'], col: 6, row: 3,
    description: '+1 cauldron in the Meridian Furnace (2 parallel cooks).' },
  { id: 'cauldron_3', label: 'Third Cauldron', glyph: '鼎', branch: 'The Crucible',
    cost: 4, prereqs: ['cauldron_2'], col: 6, row: 4,
    description: '+1 cauldron in the Meridian Furnace (3 parallel cooks).' },
  { id: 'cauldron_4', label: 'Fourth Cauldron', glyph: '鼎', branch: 'The Crucible',
    cost: 8, prereqs: ['cauldron_3'], col: 6, row: 5,
    description: '+1 cauldron in the Meridian Furnace (4 parallel cooks).' },
  { id: 'cauldron_5', label: 'Fifth Cauldron', glyph: '鼎', branch: 'The Crucible',
    cost: 16, prereqs: ['cauldron_4'], col: 6, row: 6,
    description: '+1 cauldron in the Meridian Furnace (5 parallel cooks).' },
  { id: 'eternal_alchemy', label: 'Eternal Alchemy', glyph: '丹', branch: 'The Crucible',
    cost: 32, prereqs: ['cauldron_5'], col: 6, row: 7, keystone: true,
    description: 'Keep 1 Foundation Pill effect through reincarnation. (The strongest one is preserved.)' },

  // Qi Crystal line — its own arm off the root
  { id: 'crystal', label: 'Crystalline Focus', glyph: '晶', branch: 'The Crucible',
    cost: 2, prereqs: ['n_1'], col: 4, row: 0, comingSoon: true,
    description: 'Unlocks a new line of Qi Crystal upgrades, bought with Qi on the Upgrades tab. (Coming soon.)' },
  { id: 'lattice', label: 'Dense Lattice', glyph: '紋', branch: 'The Crucible',
    cost: 2, prereqs: ['crystal'], col: 5, row: 0,
    description: 'Qi Crystal levels cost 20% less Qi to feed.' },
  { id: 'core', label: 'Unbroken Core', glyph: '髓', branch: 'The Crucible',
    cost: 3, prereqs: ['lattice'], col: 6, row: 0, keystone: true,
    description: 'Keep 25% of your Qi Crystal level through reincarnation.' },

  // ── Future Arts (teaser minigame unlocks) ───────────────────────────────
  { id: 'echoes', label: 'Ancestral Echoes', glyph: '祖', branch: 'Future Arts',
    cost: 1, prereqs: ['furnace'], col: 6, row: 2, comingSoon: true, teaser: true,
    description: 'Unlock the Treasure Hall Hidden Art across lives. (Coming soon.)' },
  { id: 'beast', label: 'Beast Arena', glyph: '兽', branch: 'Future Arts',
    cost: 1, prereqs: ['echoes'], col: 7, row: 2, comingSoon: true, teaser: true,
    description: 'Unlock the Beast Pact Hidden Art across lives. (Coming soon.)' },

  // ── The Treasury (producers) ────────────────────────────────────────────
  { id: 'frugal', label: 'Frugal Cultivation', glyph: '儉', branch: 'The Treasury',
    cost: 2, prereqs: ['n_1'], col: 2, row: 0,
    description: '5% reduced producer purchase cost.' },
  { id: 'resonance', label: 'Sect Resonance', glyph: '響', branch: 'The Treasury',
    cost: 2, prereqs: ['frugal'], col: 1, row: 1,
    description: 'Producers gain +1% increased Qi/s for each producer of the same type owned.' },
  { id: 'guidance', label: "Senior's Guidance", glyph: '承', branch: 'The Treasury',
    cost: 2, prereqs: ['resonance'], col: 1, row: 2,
    description: 'Producers gain +0.5% increased Qi/s for each producer of the previous type owned.' },
  { id: 'coffers', label: 'Boundless Coffers', glyph: '庫', branch: 'The Treasury',
    cost: 3, prereqs: ['guidance'], col: 1, row: 3, keystone: true,
    description: 'All producers gain +15% increased Qi/s output.' },

  // ── The Ascendant Way (sparks / offline / karma) ────────────────────────
  { id: 'rspark', label: 'Resonant Spark', glyph: '韻', branch: 'The Ascendant Way',
    cost: 2, prereqs: ['crystal'], col: 5, row: 1,
    description: 'Permanent Qi Spark buffs are 25% stronger.' },
  { id: 'vigil', label: 'Unbroken Vigil', glyph: '守', branch: 'The Ascendant Way',
    cost: 2, prereqs: ['rspark'], col: 6, row: 1,
    description: 'Earn 30% more Qi while away (offline).' },
  { id: 'merit', label: 'Boundless Merit', glyph: '福', branch: 'The Ascendant Way',
    cost: 4, prereqs: ['vigil'], col: 7, row: 1,
    description: 'Earn 10% more karma each life.' },

  // ── Cross-branch capstones ──────────────────────────────────────────────
  { id: 'foundation', label: 'Eternal Foundation', glyph: '基', branch: 'Capstone',
    cost: 5, prereqs: ['coffers', 'thousand'], col: 2, row: 3, capstone: true,
    description: 'Keep 20% of every already-unlocked producer’s count through reincarnation.' },
  { id: 'heaven', label: 'Heaven-Touched', glyph: '天', branch: 'Capstone',
    cost: 5, prereqs: ['core', 'vigil'], col: 7, row: 0, capstone: true,
    description: 'While any boost is active, gain +25% Qi.' },
];

export const NODES_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));

/** Sum of all node costs. */
export const TREE_TOTAL_COST = NODES.reduce((s, n) => s + n.cost, 0);
