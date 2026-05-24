/**
 * calendarEvents.js — calendar predicates for time-bound achievements.
 *
 * Lunar New Year dates are notoriously not derivable from a one-line
 * formula, so we ship a hard-coded table for the years the game is
 * expected to be alive. If the player launches in a year past the
 * table, the predicate returns false rather than throw.
 *
 * Each entry is a UTC date string in YYYY-MM-DD form. The match runs
 * against the player's LOCAL date (year, month, day) so a player in
 * Singapore sees the holiday on their wall-clock day, not UTC's.
 */

const LUNAR_NEW_YEAR = new Set([
  '2025-01-29',
  '2026-02-17',
  '2027-02-06',
  '2028-01-26',
  '2029-02-13',
  '2030-02-03',
  '2031-01-23',
  '2032-02-11',
  '2033-01-31',
  '2034-02-19',
  '2035-02-08',
]);

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True iff today (local) is the lunar new year. */
export function isLunarNewYear(now = new Date()) {
  return LUNAR_NEW_YEAR.has(ymd(now));
}

/** True iff today (local) is the 9th day of the 9th month. */
export function isDoubleNinth(now = new Date()) {
  return now.getMonth() === 8 && now.getDate() === 9; // month is 0-indexed
}

/**
 * Returns one of 'night' | 'morning' | 'afternoon' | 'evening' for
 * the current local hour. Used by the Sky Watcher achievement.
 *   00-04: night
 *   05-11: morning
 *   12-17: afternoon
 *   18-23: evening
 */
export function timeBracket(now = new Date()) {
  const h = now.getHours();
  if (h < 5)  return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
