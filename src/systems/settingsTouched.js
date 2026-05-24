/**
 * settingsTouched.js — tracker for the Settings Connoisseur achievement.
 *
 * Maintains a Set of touched setting categories in localStorage. When
 * the Set covers every key in `ALL_SETTING_KEYS`, fires the
 * `settings_all_touched` bus event. Subsequent touches are no-ops.
 *
 * The category list is intentionally small (5 buckets, not every
 * individual control) so the achievement is reachable without being
 * trivia. Touching ANY audio mute counts the whole audio_mute bucket,
 * etc.
 */

import bus from './achievementBus';

const KEY = 'mai_settings_touched';

// Buckets, not individual controls. Adjust this list if a new high-
// level settings category ships; the achievement description does not
// promise an exhaustive grid touch.
export const ALL_SETTING_KEYS = [
  'audio_mute',     // any mute button (master/bgm/sfx)
  'audio_vol',      // any volume slider
  'language',       // language picker
  'rendering',      // rendering mode (smooth/crisp)
  'particles',      // visual effects toggle
];

function loadSet() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
}

/**
 * Mark a setting category as touched. Fires the bus event when the
 * full set is now covered. Safe to call repeatedly; the achievement
 * fires once and the bus listener in useAchievements is idempotent.
 */
export function noteSettingTouched(categoryKey) {
  if (!categoryKey || !ALL_SETTING_KEYS.includes(categoryKey)) return;
  const set = loadSet();
  if (set.has(categoryKey)) return;
  set.add(categoryKey);
  saveSet(set);
  if (ALL_SETTING_KEYS.every(k => set.has(k))) {
    try { bus.fire('settings_all_touched'); } catch {}
  }
}
