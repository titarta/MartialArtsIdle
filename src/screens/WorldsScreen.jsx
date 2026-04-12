import { useState, useEffect } from 'react';
import WORLDS from '../data/worlds';
import ENEMIES from '../data/enemies';
import { preloadEnemySprites } from '../utils/preload';

const BASE = import.meta.env.BASE_URL;

const TABS = [
  { id: 'world',   label: 'World'  },
  { id: 'gather',  label: 'Gather' },
  { id: 'mine',    label: 'Mine'   },
];

const SCREEN_MAP = {
  world:  'combat-arena',
  gather: 'gathering',
  mine:   'mining',
};

// Shows the first idle frame of an enemy sprite as a small card.
// The idle sheet is 512×128 (4 frames). We clip to the first 128×128
// by setting the img width to 4× the display size and anchoring left.
function EnemyChip({ enemyId }) {
  const def = ENEMIES[enemyId];
  if (!def?.sprite) return null;

  const displaySize = 52;
  const sheetWidth  = displaySize * 4; // 4 frames side by side

  return (
    <div className="enemy-chip">
      <div
        className="enemy-chip-sprite"
        style={{ width: displaySize, height: displaySize }}
      >
        <img
          src={`${BASE}sprites/enemies/${def.sprite}-idle.png`}
          alt={def.name}
          style={{ width: sheetWidth, height: displaySize }}
        />
      </div>
      <span className="enemy-chip-name">{def.name}</span>
    </div>
  );
}

function RegionRow({ region, tab, locked, onNavigate }) {
  const isWorld = tab === 'world';
  const content = isWorld
    ? { secondary: `Drops: ${region.drops}` }
    : tab === 'gather'
    ? { primary: region.herbs }
    : { primary: region.ores };

  // Deduplicate enemy IDs (a pool may have the same enemy at different weights).
  const enemyIds = isWorld
    ? [...new Set((region.enemyPool ?? []).map(e => e.enemyId))]
    : [];

  function handleClick() {
    if (isWorld) {
      // Preload all 3 animation sets for this region's enemies right before
      // entering combat — they'll be in cache by the time the first hit lands.
      const sprites = [...new Set(
        (region.enemyPool ?? []).map(e => ENEMIES[e.enemyId]?.sprite).filter(Boolean)
      )];
      sprites.forEach(sprite => preloadEnemySprites(sprite));
    }
    onNavigate(SCREEN_MAP[tab], { region });
  }

  return (
    <div
      className={`region-row${locked ? ' region-locked' : ''}${isWorld && !locked ? ' region-row-world' : ''}`}
      onClick={!locked ? handleClick : undefined}
      role={!locked ? 'button' : undefined}
    >
      <div className="region-row-left">
        <div className="region-row-info">
          <span className="region-name">{locked ? '???' : region.name}</span>
          <span className="region-min-realm">{region.minRealm}</span>
        </div>
        {!locked && !isWorld && content.primary && (
          <div className="region-row-detail">
            <span className="region-detail-primary">{content.primary}</span>
          </div>
        )}
        {!locked && isWorld && content.secondary && (
          <div className="region-row-detail">
            <span className="region-detail-secondary">{content.secondary}</span>
          </div>
        )}
      </div>

      {!locked && isWorld && enemyIds.length > 0 && (
        <div className="enemy-chip-row">
          {enemyIds.map(id => <EnemyChip key={id} enemyId={id} />)}
        </div>
      )}
    </div>
  );
}

function WorldCard({ world, tab, realmIndex, onNavigate }) {
  const worldLocked = realmIndex < world.minRealmIndex;
  const [open, setOpen] = useState(!worldLocked && world.id === 1);

  // When the world card opens, preload attack + hit sheets for every enemy in
  // this world. Idle is already fetched by the EnemyChip <img> on render.
  useEffect(() => {
    if (!open || worldLocked) return;
    const sprites = new Set();
    world.regions.forEach(region =>
      (region.enemyPool ?? []).forEach(e => {
        const sprite = ENEMIES[e.enemyId]?.sprite;
        if (sprite) sprites.add(sprite);
      })
    );
    sprites.forEach(sprite => preloadEnemySprites(sprite, ['attack', 'hit']));
  }, [open, worldLocked, world.regions]);

  return (
    <div className={`world-card${worldLocked ? ' world-locked' : ''}`}>
      <button
        className="world-header"
        onClick={() => !worldLocked && setOpen(o => !o)}
        disabled={worldLocked}
      >
        <div className="world-header-left">
          <span className="world-number">World {world.id}</span>
          <span className="world-name">{world.name}</span>
        </div>
        <div className="world-header-right">
          <span className="world-realms-tag">{world.realms}</span>
          {worldLocked
            ? <span className="world-lock-icon">&#x1F512;</span>
            : <span className={`world-chevron${open ? ' open' : ''}`}>&#9660;</span>
          }
        </div>
      </button>

      {open && !worldLocked && (
        <div className="region-list">
          {world.regions.map(region => (
            <RegionRow
              key={region.name}
              region={region}
              tab={tab}
              locked={realmIndex < region.minRealmIndex}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorldsScreen({ cultivation, onNavigate }) {
  const [tab, setTab] = useState('world');
  const realmIndex = cultivation.realmIndex;

  return (
    <div className="screen worlds-screen">
      <h1>Worlds</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      <div className="worlds-tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`worlds-tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="worlds-list">
        {WORLDS.map(world => (
          <WorldCard
            key={world.id}
            world={world}
            tab={tab}
            realmIndex={realmIndex}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export default WorldsScreen;
