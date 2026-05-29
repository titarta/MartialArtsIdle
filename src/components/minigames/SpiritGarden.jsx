import { useState, useEffect, useRef } from 'react';
import { MiniGameResult } from './MiniGameMode';

const BASE = import.meta.env.BASE_URL;
const url = (s) => (typeof s === 'string' && s.startsWith('/')) ? `${BASE}${s.replace(/^\//, '')}` : s;

// ── STARTING VALUES (tune later) ───────────────────────────────────────────
const PLOTS      = 6;
const START_SEEDS = 8;                 // action budget; refills on a real timer in production
const GROW_MS    = 7000;               // MOCKUP-ACCELERATED. Real garden grows over minutes/offline.
const TARGET_HARVEST = 12;             // harvest this many for a max-value cash-out

const SPROUT = '/sprites/items/silver_herb_1.png';
const BLOOM  = '/sprites/items/gold_herb_2.png';

const emptyPlots = () => Array.from({ length: PLOTS }, () => null);

export default function SpiritGarden({ ratePerSec, onAward }) {
  const [plots, setPlots]     = useState(emptyPlots);   // null | { at:number }
  const [seeds, setSeeds]     = useState(START_SEEDS);
  const [harvest, setHarvest] = useState(0);
  const [now, setNow]         = useState(Date.now());
  const [cashing, setCashing] = useState(false);
  const tick = useRef(null);

  useEffect(() => {
    tick.current = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick.current);
  }, []);

  const stageOf = (plot) => {
    if (!plot) return 'empty';
    const age = now - plot.at;
    if (age >= GROW_MS) return 'bloom';
    if (age >= GROW_MS / 2) return 'sprout';
    return 'seed';
  };

  const plant = (i) => {
    if (plots[i] || seeds <= 0) return;
    setSeeds((s) => s - 1);
    setPlots((p) => p.map((v, idx) => (idx === i ? { at: Date.now() } : v)));
  };
  const harvestPlot = (i) => {
    if (stageOf(plots[i]) !== 'bloom') return;
    setHarvest((h) => h + 1);
    setPlots((p) => p.map((v, idx) => (idx === i ? null : v)));
  };
  const onPlotTap = (i) => {
    const st = stageOf(plots[i]);
    if (st === 'empty') plant(i);
    else if (st === 'bloom') harvestPlot(i);
  };

  const performance = Math.min(1, harvest / TARGET_HARVEST);
  const bloomReady = plots.some((p) => stageOf(p) === 'bloom');

  if (cashing) {
    return (
      <div className="gd">
        <MiniGameResult
          ratePerSec={ratePerSec}
          performance01={performance}
          label={`Harvest channelled · ${harvest} spirit herbs`}
          onCollect={(qi) => { onAward?.(qi); setHarvest(0); setCashing(false); }}
          onAgain={() => setCashing(false)}
          againLabel="Back to the garden"
        />
      </div>
    );
  }

  return (
    <div className="gd">
      <div className="gd-beds">
        {plots.map((plot, i) => {
          const st = stageOf(plot);
          return (
            <button
              key={i}
              type="button"
              className={`gd-plot gd-plot-${st}`}
              onClick={() => onPlotTap(i)}
              aria-label={st === 'empty' ? 'Plant a seed' : st === 'bloom' ? 'Harvest' : 'Growing'}
            >
              {st === 'empty' && <span className="gd-plot-hole" />}
              {st === 'seed' && <span className="gd-seed" />}
              {st === 'sprout' && <img className="gd-herb gd-herb-sprout" src={url(SPROUT)} alt="" draggable={false} />}
              {st === 'bloom' && <img className="gd-herb gd-herb-bloom" src={url(BLOOM)} alt="" draggable={false} />}
              {st === 'bloom' && <span className="gd-ripe" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="gd-meters">
        <div className="gd-meter">
          <span className="gd-meter-label">Seeds</span>
          <span className="gd-meter-val">{seeds}</span>
        </div>
        <div className="gd-meter">
          <span className="gd-meter-label">Harvested</span>
          <span className="gd-meter-val gd-meter-accent">{harvest}</span>
        </div>
      </div>

      <div className="gd-hint">
        {seeds <= 0 && !bloomReady && harvest === 0
          ? 'Out of seeds. (They refill on a timer — and offline — in the real garden.)'
          : bloomReady
            ? 'A plot has bloomed. Tap it to harvest.'
            : 'Tap a plot to sow. Spirit herbs ripen on their own.'}
      </div>

      <div className="gd-actionbar">
        <button type="button" className="mg-btn mg-btn-ghost" disabled title="Mockup: routes harvest into the Pill Refinement furnace for a buff.">
          Refine → pill buff
        </button>
        <button type="button" className="mg-btn mg-btn-primary" disabled={harvest <= 0} onClick={() => setCashing(true)}>
          Channel {harvest > 0 ? `${harvest} ` : ''}→ Qi
        </button>
      </div>
    </div>
  );
}
