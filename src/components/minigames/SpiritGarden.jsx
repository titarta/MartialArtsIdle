import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MiniGameResult } from './MiniGameMode';
import { fmt } from '../../utils/format';
import { useGameText } from '../../i18n/gameText';
import {
  SEEDS, SEEDS_BY_ID, RECIPES, RECIPES_BY_ID,
  LOCKED_SEEDS, LOCKED_SEEDS_BY_ID, ALMANAC_TOTAL,
  DISCOVERY_BONUS, CHANNEL_MIN_VALUE,
  loadGarden, saveGarden,
  stageOf, growthProgress, ripeCount, nextRipeAt,
  plantSeed, harvestPlot, harvestAll,
  basketValue, basketCount, sellHerb, sellBasket,
  canBrew, brew, buffRemainingMs,
  channelPerformance, canChannel, clearBasket,
  nextPlotCost, expandPlot, discoveredCount, growLabel,
} from '../../data/spiritGarden';
import useFurnace from '../../hooks/useFurnace';
import { trackGardenEvent, trackMinigameEvent } from '../../analytics';

const BASE = import.meta.env.BASE_URL;
const url = (s) => (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;
// Each plant ships as a 128x128 PNG sprite sheet at /sprites/plants/{id}.png
// laid out as a 2x2 grid of 64x64 quadrants (seed / sprout / growing / ripe).
// SpriteFor returns the URL; the consuming JSX sets background-image + a
// stage-specific .gd-plant-<stage> class to crop the right quadrant via CSS
// background-position.
const spriteFor = (id) => url(`/sprites/plants/${id}.png`);
// Used by chip + basket renderers — defaults to the "ripe" (bottom-right)
// quadrant since that's the most recognisable view of the plant.
const STAGE_CLASS = {
  seed:    'gd-plant-seed',
  sprout:  'gd-plant-sprout',
  growing: 'gd-plant-growing',
  bloom:   'gd-plant-bloom',
};

/** Compact human countdown: "2h 05m", "12m 30s", "44s". */
function fmtCountdown(ms) {
  if (ms <= 0) return 'ready';
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export default function SpiritGarden({ ratePerSec, onAward }) {
  const { t } = useTranslation('ui');
  const gt = useGameText();
  const plantName  = (s) => gt('gardenPlants', s.id, 'name', s.name);
  const recipeName = (r) => gt('gardenRecipes', r.id, 'name', r.name);
  const [garden, setGarden] = useState(loadGarden);
  // Eternal Tree garden nodes (linger / soil) — read the committed set once.
  const [treeMods] = useState(() => {
    try {
      const owned = new Set(JSON.parse(localStorage.getItem('mai_reincarnation_tree') || '[]'));
      return { durationMult: owned.has('linger') ? 1.3 : 1, growMult: owned.has('soil') ? 0.8 : 1 };
    } catch { return { durationMult: 1, growMult: 1 }; }
  });
  const [now, setNow]       = useState(() => Date.now());
  const [tab, setTab]       = useState('garden');           // 'garden' | 'brew'
  // Default to the free Spirit Mint so a brand-new player can sow immediately
  // without browsing the seed bar first.
  const [selSeed, setSel]   = useState('spirit_mint');
  const [cashing, setCash]  = useState(false);
  const [toast, setToast]   = useState(null);               // { text, key }
  const tickRef  = useRef(null);
  const toastRef = useRef(null);

  // Growth + countdown clock. Cheap; only drives derived display.
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tickRef.current);
  }, []);
  useEffect(() => () => clearTimeout(toastRef.current), []);

  // Single durable mutation path: update React state AND persist together.
  const commit = useCallback((next) => {
    setGarden(next);
    saveGarden(next);
  }, []);

  const flash = useCallback((text) => {
    setToast({ text, key: Date.now() });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const onPlotTap = (i) => {
    const st = stageOf(garden.plots[i], now);
    if (st === 'empty') {
      const seed = SEEDS_BY_ID[selSeed];
      const r = plantSeed(garden, i, selSeed, undefined, treeMods.growMult);
      if (r.ok) { commit(r.garden); try { trackGardenEvent(`plant:${selSeed}`, 1); } catch {} }
      else if (r.reason === 'dew') flash(t('garden.needToSow', { cost: t('garden.dewCost', { n: seed.dewCost }), seed: plantName(seed) }));
    } else if (st === 'bloom') {
      const r = harvestPlot(garden, i);
      if (r.ok) {
        commit(r.garden);
        try { trackGardenEvent('harvest', r.gained?.amount ?? 1); } catch {}
        const nm = SEEDS_BY_ID[r.gained.herbId] ? plantName(SEEDS_BY_ID[r.gained.herbId]) : 'herb';
        flash(r.firstTime ? t('garden.discovered', { herb: nm, n: DISCOVERY_BONUS }) : t('garden.gathered', { n: r.gained.amount, herb: nm }));
      }
    }
  };

  const doHarvestAll = () => {
    const { garden: g2, total, firsts } = harvestAll(garden);
    if (total <= 0) return;
    commit(g2);
    flash(firsts.length ? t('garden.flashHarvestedFirsts', { n: total, f: firsts.length }) : t('garden.flashHarvested', { n: total }));
  };

  const doSellHerb = (id) => {
    const r = sellHerb(garden, id);
    if (r.ok) { commit(r.garden); flash(t('garden.flashDew', { n: r.gained })); }
  };
  const doSellAll = () => {
    const r = sellBasket(garden);
    if (r.ok) { commit(r.garden); try { trackGardenEvent('sell', r.gained); } catch {} flash(t('garden.flashSoldBasket', { n: r.gained })); }
  };
  // Transfer the basket's plants into the Meridian Furnace pantry. The
  // furnace's useFurnace hook reads from the same localStorage key (the
  // App-level instance ticks heat regen in parallel; this seam just calls
  // sendPlantsFromBasket and lets persistence reconcile).
  const furnaceSeam = useFurnace();
  const doSendToFurnace = () => {
    if (basketCount(garden) === 0) { flash(t('garden.flashBasketEmpty')); return; }
    furnaceSeam.sendPlantsFromBasket(garden.basket, () => {
      // Clear the garden basket — the plants now live in the furnace pantry.
      commit({ ...garden, basket: {} });
      flash(t('garden.flashSentFurnace'));
    });
  };
  const doBrew = (rid) => {
    const r = brew(garden, rid, undefined, treeMods.durationMult);
    if (r.ok) { commit(r.garden); try { trackGardenEvent(`brew:${rid}`, 1); } catch {} flash(t('garden.flashBrewed', { name: RECIPES_BY_ID[rid].name })); setTab('garden'); }
  };
  const doExpand = () => {
    const r = expandPlot(garden);
    if (r.ok) { commit(r.garden); flash(t('garden.flashPlotCleared')); }
    else if (r.reason === 'dew') flash(t('garden.needToExpand', { cost: t('garden.expandCost', { n: nextPlotCost(garden.plotCount) }) }));
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const dew        = garden.dew;
  const ripe       = ripeCount(garden, now);
  const bVal       = basketValue(garden);
  const bCount     = basketCount(garden);
  const buffMs     = buffRemainingMs(garden, now);
  const buff       = buffMs > 0 ? garden.buff : null;
  const buffRecipe = buff ? RECIPES_BY_ID[buff.recipeId] : null;
  const expandCost = nextPlotCost(garden.plotCount);
  const nextAt     = nextRipeAt(garden, now);
  const discovered = discoveredCount(garden);
  const channelOK  = canChannel(garden);

  // ── Channel cash-out (shared reward banner) ──────────────────────────────────
  if (cashing) {
    return (
      <div className="gd">
        <MiniGameResult
          ratePerSec={ratePerSec}
          performance01={channelPerformance(garden)}
          label={t('garden.channelledLabel', { n: bCount })}
          onCollect={(qi) => { try { trackGardenEvent('channel', Math.round(qi)); } catch {} onAward?.(qi); commit(clearBasket(garden)); setCash(false); }}
          onAgain={() => setCash(false)}
          againLabel={t('garden.backToGarden')}
        />
      </div>
    );
  }

  return (
    <div className="gd">
      {/* Status: Spirit Dew + almanac progress */}
      <div className="gd-topbar">
        <div className="gd-dew" title={t('garden.dewTitle')}>
          <span className="gd-dew-drop" aria-hidden="true" />
          <span className="gd-dew-val">{fmt(dew)}</span>
          <span className="gd-dew-label">{t('garden.spiritDew')}</span>
        </div>
        <div className="gd-almanac" title={t('garden.almanacTitle')}>
          <span className="gd-almanac-glyph" aria-hidden="true">苗</span>
          <span className="gd-almanac-val">{discovered}<span className="gd-almanac-tot">/{ALMANAC_TOTAL}</span></span>
        </div>
      </div>

      {/* Active elixir buff */}
      {buff && buffRecipe && (
        <div className="gd-elixir">
          <span className="gd-elixir-orb" aria-hidden="true" />
          <div className="gd-elixir-body">
            <div className="gd-elixir-top">
              <span className="gd-elixir-name">{recipeName(buffRecipe)}</span>
              <span className="gd-elixir-pct">+{buffRecipe.pct}% qi/s</span>
            </div>
            <div className="gd-elixir-bar">
              <span className="gd-elixir-bar-fill" style={{ width: `${(100 * buffMs) / buffRecipe.durationMs}%` }} />
            </div>
          </div>
          <span className="gd-elixir-time">{fmtCountdown(buffMs)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="gd-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'garden'}
          className={`gd-tab ${tab === 'garden' ? 'gd-tab-on' : ''}`} onClick={() => setTab('garden')}>
          <span className="gd-tab-glyph">田</span> {t('garden.tabGarden')}
          {ripe > 0 && <span className="gd-tab-dot" aria-hidden="true" />}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'brew'}
          className={`gd-tab ${tab === 'brew' ? 'gd-tab-on' : ''}`} onClick={() => setTab('brew')}>
          <span className="gd-tab-glyph">丹</span> {t('garden.tabBrewhouse')}
          {bCount > 0 && <span className="gd-tab-badge">{bCount}</span>}
        </button>
      </div>

      {tab === 'garden' ? (
        <>
          {/* Plots */}
          <div className="gd-beds">
            {garden.plots.map((plot, i) => {
              const st     = stageOf(plot, now);
              const seed   = plot ? SEEDS_BY_ID[plot.seed] : null;
              const prog   = growthProgress(plot, now);
              const remain = plot && seed ? plot.at + seed.growMs - now : 0;
              // Pre-bloom stages all show the growth countdown + bar; bloom
              // gets the ripe glow instead. 'seed' is the first 33% of grow
              // time, then sprout, then growing — all four render via the
              // same sprite-sheet element with a different stage class that
              // shifts background-position to the matching 64x64 quadrant.
              const growing = st === 'seed' || st === 'sprout' || st === 'growing';
              const label = st === 'empty'
                ? t('garden.plotEmptyLabel', { seed: plantName(SEEDS_BY_ID[selSeed]) })
                : st === 'bloom'
                  ? t('garden.plotHarvestLabel', { seed: plantName(seed) })
                  : t('garden.plotGrowingLabel', { seed: plantName(seed), time: fmtCountdown(remain) });
              return (
                <button key={i} type="button" className={`gd-plot gd-plot-${st}`} onClick={() => onPlotTap(i)} aria-label={label}>
                  {st === 'empty' && <span className="gd-plot-hole" />}
                  {st !== 'empty' && (
                    <span
                      className={`gd-plant ${STAGE_CLASS[st] || ''}`}
                      style={{ backgroundImage: `url(${spriteFor(plot.seed)})` }}
                      aria-hidden="true"
                    />
                  )}
                  {st === 'bloom'  && <span className="gd-ripe" aria-hidden="true" />}
                  {growing && <span className="gd-plot-time">{fmtCountdown(remain)}</span>}
                  {growing && (
                    <span className="gd-plot-bar"><span className="gd-plot-bar-fill" style={{ transform: `scaleX(${prog})` }} /></span>
                  )}
                </button>
              );
            })}
            {expandCost != null && (
              <button type="button" className={`gd-plot gd-plot-expand ${dew < expandCost ? 'gd-plot-poor' : ''}`} onClick={doExpand}
                aria-label={t('garden.expandPlotLabel', { n: expandCost })}>
                <span className="gd-expand-plus" aria-hidden="true">+</span>
                <span className="gd-expand-cost">{t('garden.expandCost', { n: expandCost })}</span>
              </button>
            )}
          </div>

          {ripe > 0 && (
            <button type="button" className="mg-btn mg-btn-primary gd-harvest-all" onClick={doHarvestAll}>
              {t('garden.harvestAll', { n: ripe })}
            </button>
          )}

          <div className="gd-hint">
            {ripe > 0
              ? t('garden.plotsRipe', { count: ripe, n: ripe })
              : nextAt
                ? t('garden.nextRipens', { time: fmtCountdown(nextAt - now) })
                : t('garden.pickSeed')}
          </div>

          {/* Seed selector */}
          <div className="gd-seedbar" role="radiogroup" aria-label={t('garden.seedRadioLabel')}>
            {SEEDS.map((s) => {
              const afford = s.dewCost === 0 || dew >= s.dewCost;
              const on = selSeed === s.id;
              return (
                <button key={s.id} type="button" role="radio" aria-checked={on}
                  className={`gd-chip ${on ? 'gd-chip-on' : ''} ${afford ? '' : 'gd-chip-poor'}`}
                  onClick={() => setSel(s.id)}>
                  <span className="gd-chip-rarity" style={{ background: s.color }} aria-hidden="true" />
                  <span
                    className="gd-chip-sprite gd-plant gd-plant-bloom"
                    style={{ backgroundImage: `url(${spriteFor(s.id)})` }}
                    aria-hidden="true"
                  />
                  <span className="gd-chip-name">{plantName(s)}</span>
                  <span className="gd-chip-cost">{s.dewCost === 0 ? t('common.free') : t('garden.dewCost', { n: s.dewCost })}</span>
                  <span className="gd-chip-time">{growLabel(s.growMs, t)}</span>
                </button>
              );
            })}
            {LOCKED_SEEDS.map((id) => {
              const meta = LOCKED_SEEDS_BY_ID[id];
              return (
                <div key={id} className="gd-chip gd-chip-locked" aria-hidden="true">
                  <span
                    className="gd-chip-sprite gd-plant gd-plant-bloom"
                    style={{ backgroundImage: `url(${spriteFor(id)})` }}
                    aria-hidden="true"
                  />
                  <span className="gd-chip-name">{meta ? plantName(meta) : '???'}</span>
                  <span className="gd-chip-lock">{t('garden.deeperRealms')}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Basket */}
          {bCount === 0 ? (
            <div className="gd-basket-empty">
              {t('garden.basketEmpty')}
            </div>
          ) : (
            <div className="gd-basket">
              <div className="gd-basket-head">
                <span className="gd-basket-title">{t('garden.basket')}</span>
                <span className="gd-basket-meta">{t('garden.basketMeta', { herbs: bCount, dew: bVal })}</span>
              </div>
              <div className="gd-basket-grid">
                {Object.entries(garden.basket).map(([id, n]) => {
                  const s = SEEDS_BY_ID[id];
                  if (!s) return null;
                  return (
                    <button key={id} type="button" className="gd-bk" onClick={() => doSellHerb(id)}
                      title={t('garden.sellHerbTitle', { n, herb: plantName(s), dew: s.sell * n })}>
                      <span className="gd-bk-rarity" style={{ background: s.color }} aria-hidden="true" />
                      <span
                        className="gd-bk-sprite gd-plant gd-plant-bloom"
                        style={{ backgroundImage: `url(${spriteFor(id)})` }}
                        aria-hidden="true"
                      />
                      <span className="gd-bk-count">×{n}</span>
                      <span className="gd-bk-sell">{t('garden.sellHerb', { n: s.sell * n })}</span>
                    </button>
                  );
                })}
              </div>
              <div className="gd-basket-actions">
                <button type="button" className="mg-btn mg-btn-ghost" onClick={doSellAll}>{t('garden.sellAll', { n: bVal })}</button>
                <button type="button" className="mg-btn mg-btn-ghost" onClick={doSendToFurnace}>{t('garden.sendToFurnace')}</button>
                <button type="button" className="mg-btn mg-btn-primary" disabled={!channelOK} onClick={() => setCash(true)}>
                  {t('garden.channel')}
                </button>
              </div>
              {!channelOK && (
                <div className="gd-channel-note">{t('garden.channelNote', { required: CHANNEL_MIN_VALUE, current: bVal })}</div>
              )}
            </div>
          )}

          {/* Elixir recipes */}
          <div className="gd-recipes">
            <div className="gd-recipes-head">
              {t('garden.elixirs')} <span className="gd-recipes-sub">{t('garden.elixirSub')}</span>
            </div>
            {RECIPES.map((r) => {
              const ready = canBrew(garden, r.id);
              return (
                <div key={r.id} className={`gd-recipe ${ready ? '' : 'gd-recipe-poor'}`}>
                  <div className="gd-recipe-main">
                    <div className="gd-recipe-name">{recipeName(r)}</div>
                    <div className="gd-recipe-effect">{r.desc}</div>
                    <div className="gd-recipe-inputs">
                      {Object.entries(r.inputs).map(([id, need]) => {
                        const have = garden.basket[id] || 0;
                        return (
                          <span key={id} className={`gd-ri ${have >= need ? 'gd-ri-ok' : 'gd-ri-no'}`}
                            title={SEEDS_BY_ID[id] ? plantName(SEEDS_BY_ID[id]) : id}>
                            <span
                              className="gd-plant gd-plant-bloom"
                              style={{ backgroundImage: `url(${spriteFor(id)})` }}
                              aria-hidden="true"
                            />
                            {have}/{need}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button type="button" className="mg-btn mg-btn-primary gd-recipe-brew" disabled={!ready} onClick={() => doBrew(r.id)}>
                    {t('garden.brew')}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {toast && <div className="gd-toast" key={toast.key}>{toast.text}</div>}
    </div>
  );
}
