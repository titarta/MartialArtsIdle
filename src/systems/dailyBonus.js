/**
 * dailyBonus.js — Daily login reward system.
 *
 * 7-day repeating cycle. Missing a day resets the streak to Day 1.
 * Balance is awarded in Blood Lotus via addBloodLotus().
 */

import { addBloodLotus } from './bloodLotus';
import bus from './achievementBus';
import { peakStat } from './statsRecorder';

const KEY = 'mai_daily_bonus';
// Achievement key: consecutive days played without missing. Distinct
// from `streak` (which cycles 1-7 for the reward table). This monotonic
// counter is what 30-day and 100-day Hermit achievements check.
const CONSEC_KEY = 'mai_consecutive_days';
// Skip-streak tracker for the "No Daily Bread" achievement. Counts
// daily checks where the bonus was AVAILABLE but the player did not
// collect it (i.e. they ignored the modal). Cleared on any collect.
const SKIP_KEY   = 'mai_daily_skip_streak';

function loadConsecutive() {
  try { return JSON.parse(localStorage.getItem(CONSEC_KEY) || '0') | 0; } catch { return 0; }
}
function saveConsecutive(n) {
  try { localStorage.setItem(CONSEC_KEY, String(n | 0)); } catch {}
}
function loadSkipStreak() {
  try { return JSON.parse(localStorage.getItem(SKIP_KEY) || '0') | 0; } catch { return 0; }
}
function saveSkipStreak(n) {
  try { localStorage.setItem(SKIP_KEY, String(n | 0)); } catch {}
}

// 7-day reward cycle in Blood Lotus
export const DAILY_REWARDS = [10, 10, 15, 10, 10, 15, 35];

function todayStr() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastCollected: null, streak: 0 };
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

/**
 * Returns the current daily bonus state without side effects.
 * streak is 1-indexed (1–7).
 */
export function getDailyBonusState() {
  const { lastCollected, streak } = load();
  const today = todayStr();

  if (lastCollected === today) {
    return {
      isAvailable: false,
      streak,
      todayReward: DAILY_REWARDS[streak - 1] ?? DAILY_REWARDS[0],
    };
  }

  // Determine next streak position
  let nextStreak = 1;
  if (lastCollected) {
    const diffDays = Math.round(
      (new Date(today) - new Date(lastCollected)) / 86_400_000
    );
    if (diffDays === 1) {
      nextStreak = streak >= 7 ? 1 : streak + 1;
    }
    // missed > 1 day → reset to 1
  }

  return {
    isAvailable: true,
    streak: nextStreak,
    todayReward: DAILY_REWARDS[nextStreak - 1],
  };
}

/**
 * Collects today's bonus. Returns the amount awarded, or 0 if already collected.
 */
export function collectDailyBonus() {
  const state = getDailyBonusState();
  if (!state.isAvailable) return 0;

  // Update the monotonic consecutive-days counter. If the last collect
  // was yesterday, increment. If it was today, leave alone (re-collect
  // attempt). Otherwise reset to 1.
  const prev = load();
  const today = todayStr();
  let consec = loadConsecutive();
  if (prev.lastCollected) {
    const diffDays = Math.round(
      (new Date(today) - new Date(prev.lastCollected)) / 86_400_000
    );
    if (diffDays === 1)      consec += 1;
    else if (diffDays > 1)   consec  = 1;
    // diffDays === 0 means same-day re-collect (shouldn't happen via
    // isAvailable, but leave the counter alone defensively).
  } else {
    consec = 1;
  }
  saveConsecutive(consec);
  try { peakStat('consecutiveDays', consec); } catch {}

  // Skip-streak handling. If the skip counter is >=7 when the player
  // finally claims, fire the No Daily Bread achievement.
  const skipped = loadSkipStreak();
  if (skipped >= 7) {
    try { bus.fire('daily_skip_streak_claim', { skipped }); } catch {}
  }
  saveSkipStreak(0);

  save({ lastCollected: today, streak: state.streak });
  addBloodLotus(state.todayReward);
  return state.todayReward;
}

/**
 * Increment the skip-streak counter. Called by the daily-bonus modal
 * when the player dismisses it without claiming (one bump per local
 * day to prevent runaway increments from re-opens within the same day).
 */
export function noteDailyBonusSkipped() {
  try {
    const lastSkipDay = localStorage.getItem('mai_daily_skip_last_day');
    const today = todayStr();
    if (lastSkipDay === today) return; // already counted today
    localStorage.setItem('mai_daily_skip_last_day', today);
    saveSkipStreak(loadSkipStreak() + 1);
  } catch {}
}
