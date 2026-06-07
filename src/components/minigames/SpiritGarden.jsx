import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MiniGameResult } from './MiniGameMode';
import { fmt } from '../../utils/format';
import { HERBS } from '../../data/materials';
import {
  SEEDS, SEEDS_BY_ID, RECIPES, RECIPES_BY_ID, LOCKED_SEEDS, ALMANAC_TOTAL,
  DISCOVERY_BONUS, CHANNEL_MIN_VALUE,
  loadGarden, saveGarden,
  stageOf, growthProgress, ripeCount, nextRipeAt,
  plantSeed, harvestPlot, harvestAll,
  basketValue, basketCount, sellHerb, sellBasket,
  canBrew, brew, buffRemainingMs,
  channelPerformance, canChannel, clearBasket,
  nextPlotCost, expandPlot, discoveredCount, growLabel,
} from '../../data/spiritGarden';

const BASE = import.meta.env.BASE_URL;
const url = (s) => (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;
const spriteFor = (id) => url(`/sprites/items/${id}.png`);

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
  const [selSeed, setSel]   = useState('iron_herb_1');      // free seed selected by default
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
      if (r.ok) commit(r.garden);
      else if (r.reason === 'dew') flash(`Need ${t('garden.dewCost', { n: seed.dewCost })} to sow ${seed.name}`);
    } else if (st === 'bloom') {
      const r = harvestPlot(garden, i);
      if (r.ok) {
        commit(r.garden);
        const nm = SEEDS_BY_ID[r.gained.herbId]?.name ?? 'herb';
        flash(r.firstTime ? t('garden.discovered', { herb: nm, n: DISCOVERY_BONUS }) : t('garden.gathered', { n: r.gained.amount, herb: nm }));
      }
    }
  };

  const doHarvestAll = () => {
    const { garden: g2, total, firsts } = harvestAll(garden);
    if (total <= 0) return;
    commit(g2);
    flash(firsts.length ? t('garden.gathered', { n: total, herb: 'herbs' }) + `. ${firsts.length} newly discovered` : t('garden.gathered', { n: total, herb: 'herbs' }));
  };

  const doSellHerb = (id) => {
    const r = sellHerb(garden, id);
    if (r.ok) { commit(r.garden); flash(`+${r.gained} Dew`); }
  };
  const doSellAll = () => {
    const r = sellBasket(garden);
    if (r.ok) { commit(r.garden); flash(`Sold basket. +${r.gained} Dew`); }
  };
  const doBrew = (rid) => {
    const r = brew(garden, rid, undefined, treeMods.durationMult);
    if (r.ok) { commit(r.garden); flash(t('garden.brew') + ` ${RECIPES_BY_ID[rid].name}`); setTab('garden'); }
  };
  const doExpand = () => {
    const r = expandPlot(garden);
    if (r.ok) { commit(r.garden); flash('New plot cleared'); }
    else if (r.reason === 'dew') flash(`Need ${t('garden.expandCost', { n: nextPlotCost(garden.plotCount) })} to clear a plot`);
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
          onCollect={(qi) => { onAward?.(qi); commit(clearBasket(garden)); setCash(false); }}
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
        <div className="gd-dew" title="Spirit Dew — the garden's own currency">
          <span className="gd-dew-drop" aria-hidden="true" />
          <span className="gd-dew-val">{fmt(dew)}</span>
          <span className="gd-dew-label">{t('garden.spiritDew')}</span>
        </div>
        <div className="gd-almanac" title="Distinct spirit herbs discovered">
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
              <span className="gd-elixir-name">{buffRecipe.name}</span>
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
              const growing = st === 'seed' || st === 'sprout';
              const label = st === 'empty'
                ? `Empty plot. Sow ${SEEDS_BY_ID[selSeed].name}`
                : st === 'bloom'
                  ? `Harvest ${seed.name}`
                  : `${seed.name} growing, ${fmtCountdown(remain)} left`;
              return (
                <button key={i} type="button" className={`gd-plot gd-plot-${st}`} onClick={() => onPlotTap(i)} aria-label={label}>
                  {st === 'empty'  && <span className="gd-plot-hole" />}
                  {st === 'seed'   && <span className="gd-seed" />}
                  {st === 'sprout' && <img className="gd-herb gd-herb-sprout" src={spriteFor(plot.seed)} alt="" draggable={false} />}
                  {st === 'bloom'  && <img className="gd-herb gd-herb-bloom" src={spriteFor(plot.seed)} alt="" draggable={false} />}
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
                aria-label={`Clear a new plot for ${expandCost} Spirit Dew`}>
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
          <div className="gd-seedbar" role="radiogroup" aria-label="Choose a seed to sow">
            {SEEDS.map((s) => {
              const afford = s.dewCost === 0 || dew >= s.dewCost;
              const on = selSeed === s.id;
              return (
                <button key={s.id} type="button" role="radio" aria-checked={on}
                  className={`gd-chip ${on ? 'gd-chip-on' : ''} ${afford ? '' : 'gd-chip-poor'}`}
                  onClick={() => setSel(s.id)}>
                  <span className="gd-chip-rarity" style={{ background: s.color }} aria-hidden="true" />
                  <img className="gd-chip-sprite" src={spriteFor(s.id)} alt="" draggable={false} />
                  <span className="gd-chip-name">{s.name}</span>
                  <span className="gd-chip-cost">{s.dewCost === 0 ? t('common.free') : t('garden.dewCost', { n: s.dewCost })}</span>
                  <span className="gd-chip-time">{growLabel(s.growMs)}</span>
                </button>
              );
            })}
            {LOCKED_SEEDS.map((id) => (
              <div key={id} className="gd-chip gd-chip-locked" aria-hidden="true">
                <img className="gd-chip-sprite" src={spriteFor(id)} alt="" draggable={false} />
                <span className="gd-chip-name">{HERBS[id]?.name ?? '???'}</span>
                <span className="gd-chip-lock">{t('garden.deeperRealms')}</span>
              </div>
            ))}
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
                      title={`Sell ${n}x ${s.name} for ${s.sell * n} Spirit Dew`}>
                      <span className="gd-bk-rarity" style={{ background: s.color }} aria-hidden="true" />
                      <img className="gd-bk-sprite" src={spriteFor(id)} alt="" draggable={false} />
                      <span className="gd-bk-count">×{n}</span>
                      <span className="gd-bk-sell">{t('garden.sellHerb', { n: s.sell * n })}</span>
                    </button>
                  );
                })}
              </div>
              <div className="gd-basket-actions">
                <button type="button" className="mg-btn mg-btn-ghost" onClick={doSellAll}>{t('garden.sellAll', { n: bVal })}</button>
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
                    <div className="gd-recipe-name">{r.name}</div>
                    <div className="gd-recipe-effect">{r.desc}</div>
                    <div className="gd-recipe-inputs">
                      {Object.entries(r.inputs).map(([id, need]) => {
                        const have = garden.basket[id] || 0;
                        return (
                          <span key={id} className={`gd-ri ${have >= need ? 'gd-ri-ok' : 'gd-ri-no'}`}
                            title={SEEDS_BY_ID[id]?.name ?? id}>
                            <img src={spriteFor(id)} alt="" draggable={false} />
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
