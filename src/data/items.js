const RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af' },
  Bronze:       { label: 'Bronze',       color: '#cd7f32' },
  Silver:       { label: 'Silver',       color: '#c0c0c0' },
  Gold:         { label: 'Gold',         color: '#f5c842' },
  Transcendent: { label: 'Transcendent', color: '#c084fc' },
};

const ITEMS = {
  herbs: [
    { id: 'iron_herb_1',          name: 'Mortal Qi Grass',       rarity: 'Iron',         description: 'A weed that grows wherever mortal cultivators train, soaking up residual qi from their exercises.' },
    { id: 'iron_herb_2',          name: 'Wild Spirit Root',       rarity: 'Iron',         description: 'A gnarled root found in borderland wilderness, drawn to faint spiritual energy in the soil.' },
    { id: 'bronze_herb_1',        name: 'Qi Vein Vine',           rarity: 'Bronze',       description: 'A creeping vine that grows along underground qi veins, its leaves faintly luminescent.' },
    { id: 'bronze_herb_2',        name: 'Misty Forest Bloom',     rarity: 'Bronze',       description: 'A pale flower that blooms only in spirit-mist forests, pollinated by forest spirits.' },
    { id: 'silver_herb_1',        name: 'Desert Silver Lotus',    rarity: 'Silver',       description: 'A silver lotus that survives in scorched desert ruins, drawing water from deep ley lines.' },
    { id: 'silver_herb_2',        name: 'Blood Reed',             rarity: 'Silver',       description: 'A blood-red reed that grows at the edges of the blood sea, its sap thick with corrupted vitality.' },
    { id: 'gold_herb_1',          name: 'Burial Ground Lotus',    rarity: 'Gold',         description: 'A dark lotus that blooms only above saint-grade burial sites, feeding on centuries of death qi.' },
    { id: 'gold_herb_2',          name: 'Void Thorn Vine',        rarity: 'Gold',         description: 'A thorned vine that grows through rift cracks, its barbs sharp enough to pierce saint-grade defenses.' },
    { id: 'transcendent_herb_1',  name: 'Origin Spring Petal',    rarity: 'Transcendent', description: 'A petal shed by flowers growing at the world\'s origin qi springs, saturated with primordial energy.' },
    { id: 'transcendent_herb_2',  name: 'Heaven Root Vine',       rarity: 'Transcendent', description: 'A legendary vine whose roots reach through bedrock to the world core, channeling heaven-grade energy.' },
  ],
  minerals: [
    { id: 'iron_mineral_1',          name: 'Cracked Qi Stone',      rarity: 'Iron',         description: 'A fractured stone used in sect training grounds, its surface etched by years of qi discharge.' },
    { id: 'iron_mineral_2',          name: 'Iron Beast Shard',      rarity: 'Iron',         description: 'A dense bone shard shed by iron-grade beasts in the borderland wilds.' },
    { id: 'bronze_mineral_1',        name: 'Qi Beast Fang',         rarity: 'Bronze',       description: 'A fang broken off by beasts that feed directly on qi veins, still carrying residual energy.' },
    { id: 'bronze_mineral_2',        name: 'Spirit Wood Sliver',    rarity: 'Bronze',       description: 'A sliver of petrified wood from spirit-forest trees struck by centuries of cultivator battles.' },
    { id: 'silver_mineral_1',        name: 'Iron Spine Fragment',   rarity: 'Silver',       description: 'A spine fragment from iron spine boars, dense enough to deflect early-stage sword qi.' },
    { id: 'silver_mineral_2',        name: 'Array Jade Shard',      rarity: 'Silver',       description: 'Shattered jade from ancient city formation arrays, still holding faint inscription patterns.' },
    { id: 'gold_mineral_1',          name: 'Saint Bone Sliver',     rarity: 'Gold',         description: 'A sliver of bone from saint-realm corpses, radiating a cold death qi that resists refinement.' },
    { id: 'gold_mineral_2',          name: 'Forbidden Seal Shard',  rarity: 'Gold',         description: 'A fragment of the void seals that once contained the Forbidden Lands, crackling with restrained power.' },
    { id: 'transcendent_mineral_1',  name: 'Void Crystal',          rarity: 'Transcendent', description: 'A crystal grown inside rift tears, its structure formed entirely by compressed void energy.' },
    { id: 'transcendent_mineral_2',  name: 'Origin Stone Core',     rarity: 'Transcendent', description: 'The crystallized core of origin qi deposits found only at the deepest layers of the world.' },
  ],
  pills: [
    { id: 'qi_condensation_pill',  name: 'Qi Condensation Pill',  rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'body_tempering_pill',   name: 'Body Tempering Pill',   rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'spirit_calming_pill',   name: 'Spirit Calming Pill',   rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'fortification_pill',    name: 'Fortification Pill',    rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'miners_focus_pill',     name: "Miner's Focus Pill",    rarity: 'Iron',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_gathering_pill',     name: 'Qi Gathering Pill',     rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'meridian_opening_pill', name: 'Meridian Opening Pill', rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'flame_body_pill',       name: 'Flame Body Pill',       rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'iron_skin_pill',        name: 'Iron Skin Pill',        rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'earth_pulse_pill',      name: 'Earth Pulse Pill',      rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'spirit_sight_pill',     name: 'Spirit Sight Pill',     rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_flow_pill',          name: 'Qi Flow Pill',          rarity: 'Bronze',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'profound_qi_pill',      name: 'Profound Qi Pill',      rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'dragon_blood_pill',     name: 'Dragon Blood Pill',     rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'soul_stabilizing_pill', name: 'Soul Stabilizing Pill', rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'vitality_pill',         name: 'Vitality Pill',         rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'heavenly_root_pill',    name: 'Heavenly Root Pill',    rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'deep_vein_pill',        name: 'Deep Vein Pill',        rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_surge_pill',         name: 'Qi Surge Pill',         rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'combat_pill',           name: 'Combat Pill',           rarity: 'Silver',       description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_ascension_pill',     name: 'Qi Ascension Pill',     rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'true_element_pill',     name: 'True Element Pill',     rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'heaven_marrow_pill',    name: 'Heaven Marrow Pill',    rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'origin_gathering_pill', name: 'Origin Gathering Pill', rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'qi_breakthrough_pill',  name: 'Qi Breakthrough Pill',  rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'dao_heart_pill',        name: 'Dao Heart Pill',        rarity: 'Gold',         description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'immortal_qi_pill',      name: 'Immortal Qi Pill',      rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'heaven_defying_pill',   name: 'Heaven Defying Pill',   rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'dao_foundation_pill',   name: 'Dao Foundation Pill',   rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
    { id: 'eternal_vigor_pill',    name: 'Eternal Vigor Pill',    rarity: 'Transcendent', description: 'A cultivated pill that provides temporary buffs.' },
  ],
  cultivation: [
    { id: 'iron_cultivation_1',         name: 'Qi Fragment',           rarity: 'Iron',         description: 'A sliver of condensed qi shed during mortal cultivation sessions.' },
    { id: 'iron_cultivation_2',         name: 'Spirit Stone Shard',    rarity: 'Iron',         description: 'A broken piece of common spirit stone, still holding residual spiritual energy.' },
    { id: 'bronze_cultivation_1',       name: 'Beast Core Shard',      rarity: 'Bronze',       description: 'A fragment of beast core from slain qi-vein creatures, dense with elemental energy.' },
    { id: 'bronze_cultivation_2',       name: 'Qi Crystal',            rarity: 'Bronze',       description: 'A small crystal formed from compressed qi in borderland ravines.' },
    { id: 'silver_cultivation_1',       name: 'Silver Spirit Essence', rarity: 'Silver',       description: 'Distilled essence from ancient frontier ruins, containing the spiritual imprint of past immortals.' },
    { id: 'silver_cultivation_2',       name: 'Soul Shard',            rarity: 'Silver',       description: 'A fragment of soul-force left behind by corrupted cultivators who lost themselves to the blood sea.' },
    { id: 'gold_cultivation_1',         name: 'Saint Qi Relic',        rarity: 'Gold',         description: 'A calcified relic of saint-realm qi, recovered from burial grounds and war altars.' },
    { id: 'gold_cultivation_2',         name: 'Void Qi Pearl',         rarity: 'Gold',         description: 'A small pearl formed inside void rift predators, containing compressed void-attribute energy.' },
    { id: 'transcendent_cultivation_1', name: 'Primordial Qi Essence', rarity: 'Transcendent', description: 'Pure primordial energy drawn from origin springs at the world\'s core depths.' },
    { id: 'transcendent_cultivation_2', name: 'Heaven Core Crystal',   rarity: 'Transcendent', description: 'A crystal of pure heaven-grade energy, formed only at the deepest sanctuaries of the Origin Depths.' },
  ],
};

// Flat lookup by id
const ITEMS_BY_ID = {};
for (const category of Object.values(ITEMS)) {
  for (const item of category) {
    ITEMS_BY_ID[item.id] = item;
  }
}

export { RARITY, ITEMS, ITEMS_BY_ID };
