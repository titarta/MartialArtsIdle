/**
 * discipleArmy.js — state + math for the Disciple minigame ("Sect Skirmish").
 *
 * Loop: raise ARMY POWER (recruit disciples + drill them) → MARCH the gauntlet
 * as a PUSH-YOUR-LUCK climb (each push drains Vigor by a rising, variable cost;
 * run dry and the line BREAKS, keeping only BUST_PENALTY of the spoils; BANK any
 * time to lock the full reward for the depth reached). Scarce one-shot TACTICS
 * hedge the clutch waves. Army Power buys Vigor (the runway), so growing the
 * producer / drilling lets you push deeper.
 *
 * Persistence lives here (localStorage `mai_disciple_army`) because the drill is
 * an offline action: it resolves from a timestamp on mount, not a live timer.
 *
 * ALL numbers are STARTING VALUES — validate via scripts/sim-cultivation.mjs.
 * The guard-rail that matters most: marchReward() is capped per march so the
 * gauntlet can never out-earn plain idling (REWARD_CAP_MIN).
 */

const KEY = 'mai_disciple_army';

// ── Army Power ──────────────────────────────────────────────────────────────
export const BASE_STR = 10;          // per-disciple base might
export const DEV_MIN_TROOPS = 60;    // dev-preview floor so the game is playable at 0 owned

// ── Gauntlet / stance ─────────────────────────────────────────────────────────
export const THREAT_BASE = 50;
export const THREAT_GROWTH = 1.05;
// Stance vs foe is a rock-paper-scissors triangle (kept for a possible future
// pre-run risk profile; the live climb is push-your-luck, below).
export const STANCE_MULT = { favored: 1.15, even: 1.0, outmatched: 0.85 };

// ── Reward (minutes-of-production) ─────────────────────────────────────────────
export const REWARD_BASE_MIN = 2;
export const REWARD_PER_WAVE_MIN = 1.0;
export const REWARD_CAP_MIN = 30;        // hard cap per march (THE abuse guard)
export const RECORD_BONUS_MIN = 5;
export const REPEAT_PENALTY = 0.4;

// ── Push-your-luck climb ──────────────────────────────────────────────────────
export const VIGOR_BASE = 70;
export const VIGOR_PER_POWER = 0.06;     // Vigor = VIGOR_BASE + power × this
export const PUSH_COST_BASE = 5;         // wave-0 push cost
export const PUSH_COST_PER_WAVE = 1.3;   // + per wave (risk ramps with depth)
export const PUSH_COST_VARIANCE = 0.25;  // ± range on each push (the gamble)
export const BUST_PENALTY = 0.3;         // fraction of spoils kept if the line breaks
export const TACTICS = [
  { id: 'brace', name: 'Brace', glyph: '盾', blurb: 'Next advance is safe: no Vigor spent, cannot break.' },
  { id: 'rally', name: 'Rally', glyph: '鼓', blurb: 'Beat the drums — restore a surge of Vigor.' },
  { id: 'surge', name: 'Surge', glyph: '銳', blurb: 'Overrun two waves in one charge.' },
];
export const startingVigor = (power) => Math.round(VIGOR_BASE + (power || 0) * VIGOR_PER_POWER);
export const pushCost      = (wave)  => PUSH_COST_BASE + wave * PUSH_COST_PER_WAVE;
export const pushCostRange = (wave)  => { const c = pushCost(wave); return [Math.round(c * (1 - PUSH_COST_VARIANCE)), Math.round(c * (1 + PUSH_COST_VARIANCE))]; };
export const rollPushCost  = (wave)  => { const c = pushCost(wave); return Math.max(1, Math.round(c * (1 + (Math.random() * 2 - 1) * PUSH_COST_VARIANCE))); };
export const rallyAmount   = (power) => Math.round(startingVigor(power) * 0.4);

// ── Drill regimens (the offline wait) ─────────────────────────────────────────
export const REGIMENS = [
  { id: 'quick',     name: 'Quick Rally',    glyph: '憩', ms: 15 * 60 * 1000,     gain: 0.05, blurb: 'A short rest. Heals the army and a touch of drill.' },
  { id: 'standard',  name: 'Standard Drill', glyph: '練', ms: 2 * 60 * 60 * 1000, gain: 0.15, blurb: 'Hours of forms. Heals fully, hardens the ranks.' },
  { id: 'seclusion', name: 'Seclusion',      glyph: '閉', ms: 8 * 60 * 60 * 1000, gain: 0.35, blurb: 'Deep seclusion. Heals fully, great strength gain.' },
];
export const REGIMEN_BY_ID = Object.fromEntries(REGIMENS.map(r => [r.id, r]));

// ── Formations vs foe archetypes ──────────────────────────────────────────────
export const FORMATIONS = [
  { id: 'wall',  beats: 'charge', glyph: '盾', name: 'Iron Wall',      counters: 'Charge',      tip: 'Braces a headlong charge.' },
  { id: 'spear', beats: 'swarm',  glyph: '矛', name: 'Spear Vanguard', counters: 'Swarm',       tip: 'Skewers a loose swarm.' },
  { id: 'wind',  beats: 'shield', glyph: '風', name: 'Wind Skirmish',  counters: 'Shield Line', tip: 'Outflanks a rigid line.' },
];
export const FORMATION_BY_ID = Object.fromEntries(FORMATIONS.map(f => [f.id, f]));
export const FOES = [
  { id: 'charge', name: 'Reckless Charge', glyph: '突', short: 'Charge',      desc: 'A headlong wall of bodies. Skirmishers get trampled.', beatsFormation: 'wind' },
  { id: 'swarm',  name: 'Bandit Swarm',    glyph: '群', short: 'Swarm',       desc: 'A loose, numberless mob that engulfs a static line.',  beatsFormation: 'wall' },
  { id: 'shield', name: 'Shield Line',     glyph: '壁', short: 'Shield Line', desc: 'A rigid, disciplined wall that blunts a spear charge.', beatsFormation: 'spear' },
];
export const pickFoe = () => FOES[Math.floor(Math.random() * FOES.length)];

/** Stance vs foe → 'favored' | 'even' | 'outmatched'. */
export function verdict(formationId, foe) {
  if (!formationId || !foe) return 'even';
  const f = FORMATION_BY_ID[formationId];
  if (f && f.beats === foe.id) return 'favored';
  if (foe.beatsFormation === formationId) return 'outmatched';
  return 'even';
}

// ── State ────────────────────────────────────────────────────────────────────
export function defaultArmy() {
  return { trainBonus: 0, bestWave: 0, status: 'ready', drill: null };
  // status: 'ready' (can march) | 'spent' (marched, must heal) | 'drilling'
}

export function loadArmy() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === 'object') return { ...defaultArmy(), ...raw };
  } catch { /* ignore malformed */ }
  return defaultArmy();
}

export function saveArmy(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore quota */ }
}

/** Resolve a completed drill from its timestamp (offline-safe). Pure. */
export function resolveDrill(state, now = Date.now()) {
  if (state.status === 'drilling' && state.drill && now >= state.drill.endsAt) {
    const reg = REGIMEN_BY_ID[state.drill.regimen];
    return {
      ...state,
      trainBonus: Math.round((state.trainBonus + (reg?.gain || 0)) * 1000) / 1000,
      status: 'ready',
      drill: null,
    };
  }
  return state;
}

// ── Derived math ──────────────────────────────────────────────────────────────
export const perDiscipleStr = (trainBonus) => BASE_STR * (1 + trainBonus);
export const drillLevel     = (trainBonus) => Math.round(trainBonus / 0.05);
export const armyPower      = (troops, trainBonus) => Math.floor(troops * perDiscipleStr(trainBonus));

// ── Battlefield token layout ─────────────────────────────────────────────────
export const MAX_TOKENS = 28;
const seededRand = (n) => { let s = n * 97 + 13; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
export function tokenLayout(shape, count, band) {
  const pts = [];
  const H = band.hi - band.lo;
  if (shape === 'wall' || shape === 'shield') {
    const rows = shape === 'shield' ? 2 : 3, per = Math.ceil(count / rows);
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / per), c = i % per;
      const span = per > 1 ? c / (per - 1) : 0.5;
      pts.push({ x: 14 + span * 72, y: band.lo + (rows > 1 ? r / (rows - 1) : 0) * H });
    }
  } else if (shape === 'spear' || shape === 'charge') {
    const up = shape === 'spear';
    let placed = 0, row = 0;
    while (placed < count) {
      const inRow = Math.min(row + 1, count - placed);
      for (let c = 0; c < inRow; c++) {
        const x = 50 + (c - (inRow - 1) / 2) * 9;
        const frac = Math.min(1, row / 7);
        pts.push({ x, y: up ? band.hi - frac * H : band.lo + frac * H });
      }
      placed += inRow; row += 1;
    }
  } else {
    const rnd = seededRand(shape === 'wind' ? 7 : 31);
    for (let i = 0; i < count; i++) pts.push({ x: 8 + rnd() * 84, y: band.lo + rnd() * H });
  }
  return pts;
}

/** Furthest wave a stance-multiplied power clears (kept for sims / future use). */
export function simulateMarch(power, stanceMult = 1) {
  let remaining = power * stanceMult;
  let wave = 0;
  while (wave < 999) {
    const cost = THREAT_BASE * Math.pow(THREAT_GROWTH, wave);
    if (remaining < cost) break;
    remaining -= cost;
    wave += 1;
  }
  return wave;
}

/** Reward for reaching `wave`, given the prior record `bestWave`. */
export function marchReward(wave, bestWave, ratePerSec) {
  const isRecord = wave > bestWave;
  let minutes = Math.min(REWARD_CAP_MIN, REWARD_BASE_MIN + wave * REWARD_PER_WAVE_MIN);
  if (isRecord) minutes = Math.min(REWARD_CAP_MIN + RECORD_BONUS_MIN, minutes + RECORD_BONUS_MIN);
  else minutes *= REPEAT_PENALTY;
  return { qi: Math.max(0, (ratePerSec || 0) * 60 * minutes), minutes, isRecord };
}
