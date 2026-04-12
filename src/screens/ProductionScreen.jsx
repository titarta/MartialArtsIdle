import { useState } from 'react';
import { QUALITY, ARTEFACTS_BY_ID } from '../data/artefacts';
import { LAW_RARITY } from '../data/laws';
import { TECHNIQUE_QUALITY } from '../data/techniques';
import { ITEMS_BY_ID } from '../data/items';
import { MOD } from '../data/stats';
import { AFFIX_SLOT_COUNT, RARITY_TIER } from '../data/affixPools';
import { ARTEFACT_NEXT_RARITY } from '../hooks/useArtefacts';
import { TECH_NEXT_QUALITY } from '../hooks/useTechniques';
import { LAW_NEXT_RARITY } from '../hooks/useCultivation';

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getTier(rarity) {
  return RARITY_TIER[rarity] ?? 1;
}

// ─── Craft costs ──────────────────────────────────────────────────────────────

const CRAFT_COSTS = {
  hone:    (tier) => [{ itemId: 'chaos_jade',      qty: 2 * tier }],
  replace: (tier) => [{ itemId: 'void_stone',      qty: 2 * tier }],
  add:     (tier) => [{ itemId: 'mithril_essence', qty: 2 * tier }],
};

// Upgrade costs: two bracket minerals in increasing amounts.
const UPGRADE_COST = {
  common:   [ { itemId: 'black_tortoise_iron',     qty: 10 }, { itemId: 'crimson_flame_crystal',  qty: 3  } ],
  uncommon: [ { itemId: 'crimson_flame_crystal',   qty: 8  }, { itemId: 'void_stone',             qty: 3  } ],
  rare:     [ { itemId: 'void_stone',              qty: 5  }, { itemId: 'star_metal_ore',         qty: 3  } ],
  epic:     [ { itemId: 'star_metal_ore',          qty: 8  }, { itemId: 'heavenly_profound_metal', qty: 2 } ],
  Iron:     [ { itemId: 'black_tortoise_iron',     qty: 10 }, { itemId: 'crimson_flame_crystal',  qty: 3  } ],
  Bronze:   [ { itemId: 'crimson_flame_crystal',   qty: 8  }, { itemId: 'void_stone',             qty: 3  } ],
  Silver:   [ { itemId: 'void_stone',              qty: 5  }, { itemId: 'star_metal_ore',         qty: 3  } ],
  Gold:     [ { itemId: 'star_metal_ore',          qty: 8  }, { itemId: 'heavenly_profound_metal', qty: 2 } ],
};

// ─── Quality label helpers ───────────────────────────────────────────────────

function artQuality(rarity)  { return QUALITY[rarity]           ?? { label: rarity,   color: '#aaa' }; }
function techQuality(quality){ return TECHNIQUE_QUALITY[quality] ?? { label: quality,  color: '#aaa' }; }
function lawQuality(rarity)  { return LAW_RARITY[rarity]         ?? { label: rarity,   color: '#aaa' }; }

// ─── Value display helpers ────────────────────────────────────────────────────

const STAT_LABELS = {
  physical_damage:   'Phys. Dmg',
  elemental_damage:  'Elem. Dmg',
  psychic_damage:    'Psy. Dmg',
  defense:           'Defense',
  elemental_defense: 'Elem. Def',
  soul_toughness:    'Soul Tough.',
  health:            'Health',
  essence:           'Essence',
  soul:              'Soul',
  body:              'Body',
  exploit_chance:    'Exploit %',
};

function formatAffixValue(affix) {
  if (affix.type === MOD.INCREASED) {
    return `+${Math.round(affix.value * 100)}% ${STAT_LABELS[affix.stat] ?? affix.stat}`;
  }
  return `+${affix.value} ${STAT_LABELS[affix.stat] ?? affix.stat}`;
}

function formatMultLabel(key) {
  switch (key) {
    case 'cultivationSpeedMult': return 'Cultivation Speed';
    case 'essenceMult': return 'Essence Mult.';
    case 'soulMult':    return 'Soul Mult.';
    case 'bodyMult':    return 'Body Mult.';
    default:            return key;
  }
}

// ─── CostBadge ────────────────────────────────────────────────────────────────

function CostBadge({ costs, inventory }) {
  return (
    <span className="tx-craft-cost">
      {costs.map(c => {
        const mat  = ITEMS_BY_ID[c.itemId];
        const have = inventory.getQuantity(c.itemId);
        const ok   = have >= c.qty;
        return (
          <span key={c.itemId} className={`tx-craft-cost-item ${ok ? 'tx-cost-ok' : 'tx-cost-short'}`}>
            {mat?.name ?? c.itemId} ×{c.qty}
          </span>
        );
      })}
    </span>
  );
}

function canAfford(costs, inventory) {
  return costs.every(c => inventory.getQuantity(c.itemId) >= c.qty);
}

function spend(costs, inventory) {
  for (const c of costs) inventory.removeItem(c.itemId, c.qty);
}

// ─── Modifier rows ────────────────────────────────────────────────────────────

function AffixRow({ affix, idx, tier, inventory, onHone, onReplace }) {
  const honeCosts    = CRAFT_COSTS.hone(tier);
  const replaceCosts = CRAFT_COSTS.replace(tier);
  return (
    <div className="tx-mod-row">
      <div className="tx-mod-left">
        <span className="tx-mod-name">{affix.name}</span>
        <span className="tx-mod-value">{formatAffixValue(affix)}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn ${canAfford(honeCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(honeCosts, inventory)) { spend(honeCosts, inventory); onHone(idx); } }}
          title="Hone — randomize this modifier's value"
        >
          ⟳
          <CostBadge costs={honeCosts} inventory={inventory} />
        </button>
        <button
          className={`tx-craft-btn ${canAfford(replaceCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(replaceCosts, inventory)) { spend(replaceCosts, inventory); onReplace(idx); } }}
          title="Replace — swap for a random different modifier"
        >
          ↺
          <CostBadge costs={replaceCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

function PassiveRow({ passive, idx, tier, inventory, onReplace }) {
  const replaceCosts = CRAFT_COSTS.replace(tier);
  return (
    <div className="tx-mod-row">
      <div className="tx-mod-left">
        <span className="tx-mod-name">{passive.name}</span>
        <span className="tx-mod-desc">{passive.description}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn ${canAfford(replaceCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(replaceCosts, inventory)) { spend(replaceCosts, inventory); onReplace(idx); } }}
          title="Replace — swap for a random different passive"
        >
          ↺
          <CostBadge costs={replaceCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

function MultRow({ label, value, multKey, tier, inventory, onHone }) {
  const honeCosts = CRAFT_COSTS.hone(tier);
  return (
    <div className="tx-mod-row">
      <div className="tx-mod-left">
        <span className="tx-mod-name">{label}</span>
        <span className="tx-mod-value">×{value.toFixed(2)}</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn ${canAfford(honeCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(honeCosts, inventory)) { spend(honeCosts, inventory); onHone(multKey); } }}
          title="Hone — randomize this multiplier's value"
        >
          ⟳
          <CostBadge costs={honeCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

function EmptySlotRow({ tier, inventory, onAdd }) {
  const addCosts = CRAFT_COSTS.add(tier);
  return (
    <div className="tx-mod-row tx-mod-row-empty">
      <div className="tx-mod-left">
        <span className="tx-mod-empty">— Empty Slot —</span>
      </div>
      <div className="tx-mod-actions">
        <button
          className={`tx-craft-btn tx-craft-btn-add ${canAfford(addCosts, inventory) ? '' : 'tx-craft-btn-disabled'}`}
          onClick={() => { if (canAfford(addCosts, inventory)) { spend(addCosts, inventory); onAdd(); } }}
          title="Add — fill this slot with a random modifier"
        >
          +
          <CostBadge costs={addCosts} inventory={inventory} />
        </button>
      </div>
    </div>
  );
}

// ─── CostRow (upgrade section) ───────────────────────────────────────────────

function CostRow({ itemId, needed, owned }) {
  const mat  = ITEMS_BY_ID[itemId];
  const name = mat?.name ?? itemId;
  const has  = owned >= needed;
  return (
    <div className="tx-cost-row">
      <span className="tx-cost-name">{name}</span>
      <span className={`tx-cost-qty ${has ? 'tx-cost-ok' : 'tx-cost-short'}`}>
        {needed} <span className="tx-cost-sep">/</span> {owned}
      </span>
    </div>
  );
}

// ─── Detail panels ─────────────────────────────────────────────────────────

function ArtefactDetail({ inst, artefacts, inventory }) {
  const art    = ARTEFACTS_BY_ID[inst.catalogueId];
  const rarity = inst.rarity ?? art?.rarity ?? 'common';
  const q      = artQuality(rarity);
  const tier   = getTier(rarity);
  const affixes   = inst.affixes ?? [];
  const maxSlots  = AFFIX_SLOT_COUNT[rarity] ?? 2;
  const emptySlots = Math.max(0, maxSlots - affixes.length);

  const nextRar  = ARTEFACT_NEXT_RARITY[rarity];
  const nextQ    = nextRar ? artQuality(nextRar) : null;
  const upgCost  = nextRar ? UPGRADE_COST[rarity] : null;
  const upgAfford = upgCost?.every(c => inventory.getQuantity(c.itemId) >= c.qty) ?? false;

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{art?.name ?? inst.catalogueId}</span>
          <span className="tx-item-sub">{art?.slot} · {art?.weaponType ?? ''}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{q.label}</span>
      </div>

      <div className="tx-section-title">Modifiers</div>
      <div className="tx-mod-list">
        {affixes.map((a, i) => (
          <AffixRow
            key={a.id + i}
            affix={a}
            idx={i}
            tier={tier}
            inventory={inventory}
            onHone={(idx)    => artefacts.honeAffix(inst.uid, idx)}
            onReplace={(idx) => artefacts.replaceAffix(inst.uid, idx)}
          />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <EmptySlotRow
            key={`empty-${i}`}
            tier={tier}
            inventory={inventory}
            onAdd={() => artefacts.addAffix(inst.uid)}
          />
        ))}
      </div>

      <div className="tx-section-title">Upgrade Quality</div>
      {upgCost ? (
        <div className="tx-upgrade-section">
          <div className="tx-upgrade-arrow">
            Upgrade to{' '}
            <span style={{ color: nextQ.color, fontWeight: 700 }}>{nextQ.label}</span>
          </div>
          <div className="tx-cost-list">
            {upgCost.map(c => (
              <CostRow key={c.itemId} itemId={c.itemId} needed={c.qty} owned={inventory.getQuantity(c.itemId)} />
            ))}
          </div>
          <button
            className={`tx-upgrade-btn ${upgAfford ? '' : 'tx-upgrade-btn-disabled'}`}
            onClick={() => {
              if (!upgAfford) return;
              for (const c of upgCost) inventory.removeItem(c.itemId, c.qty);
              artefacts.upgradeArtefact(inst.uid);
            }}
            disabled={!upgAfford}
          >
            Upgrade
          </button>
        </div>
      ) : (
        <p className="tx-max-quality">Already at maximum quality.</p>
      )}
    </div>
  );
}

function TechniqueDetail({ tech, techniques, inventory }) {
  const q        = techQuality(tech.quality);
  const tier     = getTier(tech.quality);
  const passives  = tech.passives ?? [];
  const maxSlots  = Object.keys(TECHNIQUE_QUALITY).indexOf(tech.quality) + 1;
  const emptySlots = Math.max(0, maxSlots - passives.length);

  const nextQn   = TECH_NEXT_QUALITY[tech.quality];
  const nextQ    = nextQn ? techQuality(nextQn) : null;
  const upgCost  = nextQn ? UPGRADE_COST[tech.quality] : null;
  const upgAfford = upgCost?.every(c => inventory.getQuantity(c.itemId) >= c.qty) ?? false;

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{tech.name}</span>
          <span className="tx-item-sub">{tech.type} · {tech.rank} · {tech.element}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{q.label}</span>
      </div>

      {/* Stats */}
      <div className="tx-section-title">Stats</div>
      <div className="tx-stat-list">
        {tech.type === 'Attack' && (
          <>
            {tech.arteMult   != null && <div className="tx-stat-row"><span>Arte Mult.</span><span>×{tech.arteMult.toFixed(2)}</span></div>}
            {tech.elemBonus  != null && tech.elemBonus !== 1 && <div className="tx-stat-row"><span>Elem. Bonus</span><span>×{tech.elemBonus.toFixed(2)}</span></div>}
          </>
        )}
        {tech.type === 'Heal' && tech.healPercent != null && (
          <div className="tx-stat-row"><span>Heal</span><span>{Math.round(tech.healPercent * 100)}% HP</span></div>
        )}
        {tech.type === 'Defend' && (
          <>
            {tech.defMult      != null && <div className="tx-stat-row"><span>DEF Mult.</span><span>×{tech.defMult.toFixed(2)}</span></div>}
            {tech.buffDuration != null && <div className="tx-stat-row"><span>Duration</span><span>{tech.buffDuration}s</span></div>}
          </>
        )}
        {tech.type === 'Dodge' && (
          <>
            {tech.dodgeChance  != null && <div className="tx-stat-row"><span>Dodge Chance</span><span>{Math.round(tech.dodgeChance * 100)}%</span></div>}
            {tech.buffDuration != null && <div className="tx-stat-row"><span>Duration</span><span>{tech.buffDuration}s</span></div>}
          </>
        )}
      </div>

      {/* Passives */}
      <div className="tx-section-title">Passives</div>
      <div className="tx-mod-list">
        {passives.map((p, i) => (
          <PassiveRow
            key={p.name + i}
            passive={p}
            idx={i}
            tier={tier}
            inventory={inventory}
            onReplace={(idx) => techniques.replacePassive(tech.id, idx)}
          />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <EmptySlotRow
            key={`empty-${i}`}
            tier={tier}
            inventory={inventory}
            onAdd={() => techniques.addPassive(tech.id)}
          />
        ))}
      </div>

      {/* Upgrade */}
      <div className="tx-section-title">Upgrade Quality</div>
      {upgCost ? (
        <div className="tx-upgrade-section">
          <div className="tx-upgrade-arrow">
            Upgrade to{' '}
            <span style={{ color: nextQ.color, fontWeight: 700 }}>{nextQ.label}</span>
          </div>
          <div className="tx-cost-list">
            {upgCost.map(c => (
              <CostRow key={c.itemId} itemId={c.itemId} needed={c.qty} owned={inventory.getQuantity(c.itemId)} />
            ))}
          </div>
          <button
            className={`tx-upgrade-btn ${upgAfford ? '' : 'tx-upgrade-btn-disabled'}`}
            onClick={() => {
              if (!upgAfford) return;
              for (const c of upgCost) inventory.removeItem(c.itemId, c.qty);
              techniques.upgradeTechnique(tech.id);
            }}
            disabled={!upgAfford}
          >
            Upgrade
          </button>
        </div>
      ) : (
        <p className="tx-max-quality">Already at maximum quality.</p>
      )}
    </div>
  );
}

function LawDetail({ law, cultivation, inventory }) {
  const q        = lawQuality(law.rarity);
  const tier     = getTier(law.rarity);
  const passives  = law.passives ?? [];
  const maxSlots  = LAW_RARITY[law.rarity]?.passiveSlots ?? 1;
  const emptySlots = Math.max(0, maxSlots - passives.length);

  const nextRn   = LAW_NEXT_RARITY[law.rarity];
  const nextQ    = nextRn ? lawQuality(nextRn) : null;
  const upgCost  = nextRn ? UPGRADE_COST[law.rarity] : null;
  const upgAfford = upgCost?.every(c => inventory.getQuantity(c.itemId) >= c.qty) ?? false;

  const MULT_KEYS = ['cultivationSpeedMult', 'essenceMult', 'soulMult', 'bodyMult'];

  return (
    <div className="tx-detail-panel">
      <div className="tx-detail-header">
        <div>
          <span className="tx-item-name">{law.name}</span>
          <span className="tx-item-sub">{law.element} · {law.realmRequirementLabel ?? 'Unknown Realm'}</span>
        </div>
        <span className="tx-quality-badge" style={{ color: q.color, borderColor: q.color }}>{q.label}</span>
      </div>

      {/* Multipliers */}
      <div className="tx-section-title">Multipliers</div>
      <div className="tx-mod-list">
        {MULT_KEYS.map(key => (
          <MultRow
            key={key}
            label={formatMultLabel(key)}
            value={law[key] ?? 0}
            multKey={key}
            tier={tier}
            inventory={inventory}
            onHone={(mk) => cultivation.honeLawMult(law.id, mk)}
          />
        ))}
      </div>

      {/* Passives */}
      <div className="tx-section-title">Passives</div>
      <div className="tx-mod-list">
        {passives.map((p, i) => (
          <PassiveRow
            key={p.name + i}
            passive={p}
            idx={i}
            tier={tier}
            inventory={inventory}
            onReplace={(idx) => cultivation.replaceLawPassive(law.id, idx)}
          />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <EmptySlotRow
            key={`empty-${i}`}
            tier={tier}
            inventory={inventory}
            onAdd={() => cultivation.addLawPassive(law.id)}
          />
        ))}
      </div>

      {/* Upgrade */}
      <div className="tx-section-title">Upgrade Quality</div>
      {upgCost ? (
        <div className="tx-upgrade-section">
          <div className="tx-upgrade-arrow">
            Upgrade to{' '}
            <span style={{ color: nextQ.color, fontWeight: 700 }}>{nextQ.label}</span>
          </div>
          <div className="tx-cost-list">
            {upgCost.map(c => (
              <CostRow key={c.itemId} itemId={c.itemId} needed={c.qty} owned={inventory.getQuantity(c.itemId)} />
            ))}
          </div>
          <button
            className={`tx-upgrade-btn ${upgAfford ? '' : 'tx-upgrade-btn-disabled'}`}
            onClick={() => {
              if (!upgAfford) return;
              for (const c of upgCost) inventory.removeItem(c.itemId, c.qty);
              cultivation.upgradeLaw(law.id);
            }}
            disabled={!upgAfford}
          >
            Upgrade
          </button>
        </div>
      ) : (
        <p className="tx-max-quality">Already at maximum quality.</p>
      )}
    </div>
  );
}

// ─── TransmutationPanel ──────────────────────────────────────────────────────

const ITEM_TABS = [
  { key: 'artefacts',  label: 'Artefacts'  },
  { key: 'techniques', label: 'Techniques' },
  { key: 'laws',       label: 'Laws'       },
];

function TransmutationPanel({ inventory, artefacts, techniques, cultivation }) {
  const [itemTab,  setItemTab]  = useState('artefacts');
  const [selected, setSelected] = useState(null);

  const switchTab = (tab) => { setItemTab(tab); setSelected(null); };

  // Resolve the selected item's data
  let selectedInst = null;
  if (selected) {
    if (itemTab === 'artefacts')  selectedInst = artefacts.owned.find(o => o.uid === selected) ?? null;
    if (itemTab === 'techniques') selectedInst = techniques.ownedTechniques[selected] ?? null;
    if (itemTab === 'laws')       selectedInst = cultivation.ownedLaws.find(l => l.id === selected) ?? null;
  }

  return (
    <div className="tx-panel">
      {/* Item-type tabs */}
      <div className="inv-tabs">
        {ITEM_TABS.map(t => (
          <button
            key={t.key}
            className={`inv-tab ${itemTab === t.key ? 'inv-tab-active' : ''}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div className="inv-grid tx-item-grid">
        {itemTab === 'artefacts' && artefacts.owned.map(inst => {
          const art    = ARTEFACTS_BY_ID[inst.catalogueId];
          const rarity = inst.rarity ?? art?.rarity ?? 'common';
          const q      = artQuality(rarity);
          return (
            <button
              key={inst.uid}
              className={`inv-slot tx-slot ${selected === inst.uid ? 'tx-slot-selected' : ''}`}
              style={{ borderColor: q.color }}
              onClick={() => setSelected(inst.uid === selected ? null : inst.uid)}
            >
              <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
              <span className="inv-name" style={{ color: q.color }}>{art?.name ?? inst.catalogueId}</span>
              <span className="inv-slot-label">{art?.slot}</span>
            </button>
          );
        })}

        {itemTab === 'techniques' && Object.values(techniques.ownedTechniques).map(tech => {
          const q = techQuality(tech.quality);
          return (
            <button
              key={tech.id}
              className={`inv-slot tx-slot ${selected === tech.id ? 'tx-slot-selected' : ''}`}
              style={{ borderColor: q.color }}
              onClick={() => setSelected(tech.id === selected ? null : tech.id)}
            >
              <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
              <span className="inv-name" style={{ color: q.color }}>{tech.name}</span>
              <span className="inv-slot-label">{tech.type}</span>
            </button>
          );
        })}

        {itemTab === 'laws' && cultivation.ownedLaws.map(law => {
          const q = lawQuality(law.rarity);
          return (
            <button
              key={law.id}
              className={`inv-slot tx-slot ${selected === law.id ? 'tx-slot-selected' : ''}`}
              style={{ borderColor: q.color }}
              onClick={() => setSelected(law.id === selected ? null : law.id)}
            >
              <span className="inv-quality-gem" style={{ color: q.color }}>◆</span>
              <span className="inv-name" style={{ color: q.color }}>{law.name}</span>
              <span className="inv-slot-label">{law.element}</span>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedInst && itemTab === 'artefacts' && (
        <ArtefactDetail
          inst={selectedInst}
          artefacts={artefacts}
          inventory={inventory}
        />
      )}
      {selectedInst && itemTab === 'techniques' && (
        <TechniqueDetail
          tech={selectedInst}
          techniques={techniques}
          inventory={inventory}
        />
      )}
      {selectedInst && itemTab === 'laws' && (
        <LawDetail
          law={selectedInst}
          cultivation={cultivation}
          inventory={inventory}
        />
      )}

      {!selected && (
        <p className="tx-hint">Select an item above to inspect and modify it.</p>
      )}
    </div>
  );
}

// ─── ProductionScreen ─────────────────────────────────────────────────────────

const PROD_TABS = [
  { key: 'refining',      label: 'Refining'     },
  { key: 'alchemy',       label: 'Alchemy'      },
  { key: 'transmutation', label: 'Transmutation' },
];

function ProductionScreen({ inventory, artefacts, techniques, cultivation }) {
  const [activeTab, setActiveTab] = useState('transmutation');

  return (
    <div className="screen production-screen">
      <h1>Production</h1>
      <p className="subtitle">Refine, brew, and transmute</p>

      <div className="inv-tabs">
        {PROD_TABS.map(t => (
          <button
            key={t.key}
            className={`inv-tab ${activeTab === t.key ? 'inv-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'refining' && (
        <div className="prod-coming-soon">
          <span className="prod-coming-icon">⚒</span>
          <p>Artefact Refining — coming soon</p>
        </div>
      )}

      {activeTab === 'alchemy' && (
        <div className="prod-coming-soon">
          <span className="prod-coming-icon">⚗</span>
          <p>Alchemy — coming soon</p>
        </div>
      )}

      {activeTab === 'transmutation' && (
        <TransmutationPanel
          inventory={inventory}
          artefacts={artefacts}
          techniques={techniques}
          cultivation={cultivation}
        />
      )}
    </div>
  );
}

export default ProductionScreen;
