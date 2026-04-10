export const LAW_RARITY = {
  Iron:         { label: 'Iron',         color: '#9ca3af', passiveSlots: 1 },
  Bronze:       { label: 'Bronze',       color: '#cd7f32', passiveSlots: 2 },
  Silver:       { label: 'Silver',       color: '#c0c0c0', passiveSlots: 3 },
  Gold:         { label: 'Gold',         color: '#f5c842', passiveSlots: 4 },
  Transcendent: { label: 'Transcendent', color: '#c084fc', passiveSlots: 5 },
};

export const THREE_HARMONY_MANUAL = {
  id:                   'three_harmony_manual',
  name:                 'Three Harmony Manual',
  element:              'Normal',
  rarity:               'Iron',
  // realmIndex 10 = Qi Transformation - Early Stage
  realmRequirement:     10,
  realmRequirementLabel:'Qi Transformation',
  flavour:              'The ancient text speaks of no fire, no storm, no mountain — only the even breath between all things.',
  cultivationSpeedMult: 1.0,
  essenceMult:          0.35,
  soulMult:             0.30,
  bodyMult:             0.35,
  passives: [
    {
      name:        'Steady Breath',
      description: 'Cultivation is not interrupted when taking damage below 10% of max DEF.',
    },
  ],
};

// Active law used until a swap mechanic is implemented
export const DEFAULT_LAW = THREE_HARMONY_MANUAL;
