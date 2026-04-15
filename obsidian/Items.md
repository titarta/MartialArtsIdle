# Items

Two main item categories: **Pills** and **Artefacts**.

---

## Pills

Pills provide **permanent, irreversible** base stat improvements when consumed. There is no duration — the stat bonus is added once and persists indefinitely across all sessions.

### Properties

- Crafted at the **Production** screen using 3 herbs (recipe system)
- Consuming a pill instantly and permanently adds its stat bonuses to the character
- A floating animation shows the gained stats on the pill card on consume
- Pills are categorised: **Cultivation**, **Combat**, **Harvest**, **Mining**

### Rarity Tiers

Pills follow the Iron / Bronze / Silver / Gold / Transcendent rarity system, matching the herb tiers used to craft them.

### Cultivation Pills (examples)

| ID | Name | Rarity | Permanent Effect |
|---|---|---|---|
| qi_condensation_pill | Qi Condensation Pill | Iron | +50% Qi Speed |
| qi_gathering_pill | Qi Gathering Pill | Bronze | +100% Qi Speed |
| profound_qi_pill | Profound Qi Pill | Silver | +200% Qi Speed |
| qi_ascension_pill | Qi Ascension Pill | Gold | +500% Qi Speed |
| immortal_qi_pill | Immortal Qi Pill | Transcendent | +1000% Qi Speed |

### Combat Pills (examples)

| ID | Name | Rarity | Permanent Effect |
|---|---|---|---|
| body_tempering_pill | Body Tempering Pill | Iron | +30 Defense |
| iron_skin_pill | Iron Skin Pill | Bronze | +60 Defense, +100 Health |
| combat_pill | Combat Pill | Silver | +30 Phys Dmg, +20 Elem Dmg, +80 Defense |

### Harvest / Mining Pills (examples)

| ID | Name | Rarity | Permanent Effect |
|---|---|---|---|
| spirit_calming_pill | Spirit Calming Pill | Iron | +20% Harvest Speed |
| miners_focus_pill | Miner's Focus Pill | Iron | +20% Mining Speed |
| heavenly_root_pill | Heavenly Root Pill | Silver | +60% Harvest Speed, +30 Harvest Luck |

### Implementation Notes

- **Hook:** `src/hooks/usePills.js`
- **Persistence:** `mai_pills` (owned counts) + `mai_permanent_pill_stats` (accumulated bonuses)
- `getStatModifiers()` returns permanent flat/increased mods for the stats system
- `getQiMult()` returns `1 + permanentStats.qi_speed` for the cultivation rate
- Pill drawer: `src/components/PillDrawer.jsx`

### TODO

- [ ] Finalise pill name lore (current names are placeholder-to-final)
- [ ] Define recipe discovery mechanic beyond the 3-herb combo system
- [ ] Add visual distinction for "used" pills vs newly acquired
- [ ] Alchemy unlock is already at realm 0 (Production tab)

---

## Artefacts

Artefacts are equipped items that affect **combat**. They are split into **Weapons** and **Armour**.

### Quality Tiers

Iron → Bronze → Silver → Gold → **Transcendent**

### Soul Binding

At [[Reincarnation]]:
- Artefacts can be **bound to the soul** — persist across reincarnations
- **Lower bound limit** applies (artefacts below a quality threshold cannot be bound)

### Artifact Refining

Unlocked at [[Realm Progression#Emperor Realm|Emperor Realm]].

---

## Weapons

Weapons are the attack artefact type. They provide a **flat damage bonus** to the attack formula and have type requirements for specific [[Secret Techniques]]. Some [[Laws]] also grant bonuses for specific weapon types.

### Weapon Types

| Type | Notes |
|---|---|
| Sword | Most common; broad secret technique support |
| Polearm | Reach-based; favoured by Body-heavy builds |
| *(others TBD)* | — |

---

## Armour

Armour artefacts are worn in **seven slots**. Each slot provides defensive or utility bonuses (DEF, resistances, stat boosts). In a cultivation setting, armour takes the form of spiritual garments and accessories rather than metal plate.

### Armour Slots

| Slot | Description |
|---|---|
| **Head** | Headbands, crowns, jade hairpins — focus and spiritual defence |
| **Body** | Robes and battle vests — the primary defensive piece |
| **Hands** | Bracers and gauntlets — enhance strikes and block |
| **Waist** | Sashes and belts — stability, qi circulation, weapon carry |
| **Feet** | Boots and sandals — movement, footwork, ground cultivation |
| **Neck** | Pendants and talismans — soul protection, elemental resistance |
| **Finger** | Rings — power focus or spatial storage; iconic in xianxia |

---

### Head Armour

| Name | Rarity | Description |
|---|---|---|
| Spirit Headband | Common | A simple cloth band imbued with basic spiritual energy, aiding focus during cultivation. |
| Jade Cultivation Crown | Uncommon | A carved jade circlet that stabilizes the spiritual sea and reduces breakthrough turbulence. |
| Ghost King's Circlet | Rare | Forged from ghost iron, it dulls spiritual attacks and suppresses soul-based debuffs. |
| Heaven-Forged War Crown | Epic | A battle crown smelted in heavenly fire; greatly increases resistance to elemental damage. |
| Crown of the Undying | Legendary | Said to have been worn by an Open Heaven cultivator; protects the spirit from lethal soul attacks. |

---

### Body Armour

| Name | Rarity | Description |
|---|---|---|
| Cotton Spirit Robe | Common | Lightweight robe woven with spirit thread, providing minimal but consistent qi circulation. |
| Cloud Silk Battle Vest | Uncommon | A vest spun from high-altitude cloud silk that deflects minor physical and elemental strikes. |
| Dragon Scale Armour | Rare | Scales shed by a lesser dragon beast; hard as iron and resistant to fire and lightning. |
| Phoenix Feather War Robe | Epic | Woven from phoenix down; regenerates minor damage over time and resists extreme heat. |
| Heaven-Piercing Divine Robe | Legendary | A supreme-grade robe that shifts between softness and steel; nullifies strikes below a power threshold. |

---

### Hand Armour

| Name | Rarity | Description |
|---|---|---|
| Iron Bracers | Common | Basic iron bracers that reinforce the forearms and improve blocking stability. |
| Tiger Claw Gauntlets | Uncommon | Gauntlets styled after tiger claws; slightly increases the damage of unarmed and polearm strikes. |
| Mithril Bracers | Rare | Lightweight mithril bracers that conduct elemental energy through each strike. |
| Dragon Vein Gauntlets | Epic | Gauntlets threaded with dragon-vein ore; amplify Essence-based attacks channelled through the hands. |
| Heaven Palm Guards | Legendary | Ancient guards worn by a palm-technique grandmaster; dramatically amplify open-palm secret techniques. |

---

### Waist Armour

| Name | Rarity | Description |
|---|---|---|
| Leather Cultivation Belt | Common | A sturdy belt that stabilizes the dantian and reduces qi dispersal during combat. |
| Spirit Jade Sash | Uncommon | A silk sash inlaid with spirit jade beads; improves qi circulation between upper and lower body. |
| Serpent Skin Belt | Rare | Crafted from the shed skin of a spiritual serpent; increases agility and resistance to poison. |
| Golden Dragon Belt | Epic | A broad belt embossed with a coiling dragon; greatly increases Body-stat conversion. |
| Void Emperor's Sash | Legendary | A sash woven from spatial thread; absorbs a portion of incoming damage into a void pocket. |

---

### Feet Armour

| Name | Rarity | Description |
|---|---|---|
| Wind-Step Boots | Common | Light boots enchanted for swift footwork; marginally increases dodge rate. |
| Swiftcloud Sandals | Uncommon | Sandals that carry a trace of cloud energy; allow brief bursts of accelerated movement. |
| Thunderstep Boots | Rare | Boots crackling with stored lightning; each step can release a low-power shock on contact. |
| Dragon Treading Boots | Epic | Forged from the bones of a dragon beast's foot; dramatically improves ground stability and stomp attacks. |
| Heaven-Soaring Sandals | Legendary | Sandals said to let the wearer walk on air; massively boost dodge and movement-based secret techniques. |

---

### Neck Armour

| Name | Rarity | Description |
|---|---|---|
| Jade Spirit Pendant | Common | A smoothed jade piece worn close to the heart; gently strengthens the spiritual sea. |
| Soul Calming Necklace | Uncommon | A string of spirit beads that suppresses soul fluctuations and mental debuffs in combat. |
| Blood Dragon Talisman | Rare | A carved bone talisman soaked in dragon beast blood; increases raw physical resistance. |
| Elemental Core Pendant | Epic | Contains a compressed elemental core; amplifies the wearer's elemental affinity bonus. |
| Heaven's Eye Amulet | Legendary | A talisman housing the petrified eye of a divine beast; reveals hidden attacks and grants brief precognition. |

---

### Finger Armour (Rings)

Rings in xianxia serve dual purposes — **power rings** boost combat stats, while **spatial rings** provide storage. Both can roll as artefacts.

| Name | Rarity | Description |
|---|---|---|
| Copper Spirit Ring | Common | A plain copper ring that channels a faint qi current through the meridians. |
| Jade Focus Ring | Uncommon | A carved jade ring that sharpens elemental technique control, reducing wasted energy. |
| Void Stone Ring | Rare | Set with a void stone fragment; has a small storage space and slightly boosts spatial-technique damage. |
| Dragon Blood Ring | Epic | A ring forged with dragon blood alloy; significantly boosts Essence and Body stats. |
| Immortal Soul Ring | Legendary | A ring said to contain a sliver of an immortal's soul; dramatically boosts all three primary stats. |

---

### TODO
- [ ] Define stat bonuses per slot and rarity tier
- [ ] Define whether each slot gives DEF, stat boosts, or special effects
- [ ] Define artefact refining mechanics
- [ ] Define soul-binding cost and eligibility thresholds
- [ ] Define weapon type list beyond sword and polearm
- [ ] Define artefact Bonuses from Cultivation Types

---

## Related

- [[Materials]]
- [[Combat]]
- [[Laws]]
- [[Secret Techniques]]
- [[Realm Progression]]
- [[Reincarnation]]

---

## Claude Commands
