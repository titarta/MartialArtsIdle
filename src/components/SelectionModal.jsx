import { SELECTION_BY_ID, SELECTION_RARITY } from '../data/selections';
import { JADE_COSTS } from '../systems/jade';

function EffectLine({ effect }) {
  if (effect.type === 'stat_mod') {
    const prefix = effect.mod === 'more' ? '×' : '+';
    const val    = effect.mod === 'increased'
      ? `${Math.round(effect.value * 100)}%`
      : effect.mod === 'more'
      ? effect.value.toFixed(2)
      : effect.value;
    const label  = effect.stat.replace(/_/g, ' ');
    return <span className="sel-card-effect">{prefix}{val} {label}</span>;
  }
  // special — show description text from parent instead
  return null;
}

function SelectionCard({ optionId, onPick, disabled }) {
  const opt = SELECTION_BY_ID[optionId];
  if (!opt) return null;

  const rarity = SELECTION_RARITY[opt.rarity];

  return (
    <div
      className={`sel-card sel-card-${opt.rarity}${disabled ? ' sel-card-disabled' : ''}`}
      style={{ '--rarity-color': rarity.color }}
    >
      <div className="sel-card-header">
        <span className="sel-card-rarity" style={{ color: rarity.color }}>{rarity.label}</span>
        <span className="sel-card-category">{opt.category}</span>
      </div>

      <p className="sel-card-name">{opt.name}</p>
      <p className="sel-card-desc">{opt.description}</p>

      <div className="sel-card-effects">
        {opt.effects.map((eff, i) => <EffectLine key={i} effect={eff} />)}
      </div>

      {opt.maxStacks > 1 && (
        <span className="sel-card-stacks">Max {opt.maxStacks} stacks</span>
      )}

      <button
        className="sel-card-pick-btn"
        onClick={() => onPick(optionId)}
        disabled={disabled}
      >
        Choose
      </button>
    </div>
  );
}

function SelectionModal({ selection, jadeBalance, onPick, onReroll, onClose }) {
  if (!selection) return null;

  const { id, realmLabel, tier, options, freeRerolls, rerollsUsed } = selection;
  const hasFreeReroll    = rerollsUsed < freeRerolls;
  const rerollCost       = hasFreeReroll
    ? 0
    : (tier === 'breakthrough' ? JADE_COSTS.reroll_extra : JADE_COSTS.reroll_minor);
  const canAffordReroll  = hasFreeReroll || jadeBalance >= rerollCost;
  const isBreakthrough   = tier === 'breakthrough';

  return (
    <div className="modal-overlay sel-overlay" onClick={onClose}>
      <div
        className={`sel-modal${isBreakthrough ? ' sel-modal-breakthrough' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sel-header">
          {isBreakthrough && (
            <span className="sel-breakthrough-badge">⚡ Breakthrough</span>
          )}
          <h2 className="sel-title">
            {isBreakthrough ? 'Realm Breakthrough Reward' : 'Level-Up Reward'}
          </h2>
          <p className="sel-realm">{realmLabel}</p>
          <p className="sel-instruction">Choose one perk to keep permanently</p>
        </div>

        {/* Cards */}
        <div className="sel-cards-row">
          {options.map(optId => (
            <SelectionCard
              key={optId}
              optionId={optId}
              onPick={(optId) => onPick(id, optId)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="sel-footer">
          <button
            className={`sel-reroll-btn${!canAffordReroll ? ' sel-reroll-disabled' : ''}`}
            onClick={() => canAffordReroll && onReroll(id)}
            disabled={!canAffordReroll}
            title={hasFreeReroll ? 'Free reroll' : `Costs ${rerollCost} Jade`}
          >
            {hasFreeReroll
              ? '↺ Reroll (Free)'
              : `↺ Reroll (${rerollCost} 🪨)`}
          </button>

          <span className="sel-jade-balance">🪨 {jadeBalance} Jade</span>

          <button className="sel-skip-btn" onClick={onClose}>
            Decide Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectionModal;
