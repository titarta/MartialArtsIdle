import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, CATEGORY_REQUIRES } from '../data/achievements';
import { FEATURES } from '../data/featureFlags';
import bus from '../systems/achievementBus';

const SAVE_KEY = 'mai_achievements';

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function persist(set) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify([...set]));
  } catch {}
}

// Legacy gating: a few entries from earlier versions of the game used a
// `category` field tied to a FEATURES flag. The new flat list does not
// set `category`, so this returns false for every new entry and only
// hides any straggler (none should exist after the v3 rewrite).
function isHiddenInBuild(achievement) {
  const req = CATEGORY_REQUIRES[achievement?.category] ?? null;
  if (!req) return false;
  return !FEATURES[req];
}

export default function useAchievements({ onUnlock } = {}) {
  const [unlocked, setUnlocked] = useState(load);
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;

  // Build the visible-in-this-build list once. Frozen at mount because
  // FEATURES is a build-time constant.
  const visible = useMemo(
    () => ACHIEVEMENTS.filter(a => !isHiddenInBuild(a)),
    [],
  );

  // Core unlock helper. Adds ids to the set, fires onUnlock for each,
  // persists. Idempotent: re-firing an already-unlocked id is a no-op.
  const unlockMany = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    const fresh = ids.filter(id => !unlockedRef.current.has(id) && ACHIEVEMENTS_BY_ID[id]);
    if (fresh.length === 0) return;
    const next = new Set(unlockedRef.current);
    for (const id of fresh) {
      next.add(id);
      onUnlock?.(ACHIEVEMENTS_BY_ID[id]);
    }
    unlockedRef.current = next;
    persist(next);
    setUnlocked(next);
  }, [onUnlock]);

  // Snapshot-poll check. Called by App.jsx whenever a tracked metric
  // changes. We extend the snapshot with the virtual
  // `unlockedCountExcludingThis` field for each entry under evaluation
  // so the recursive "Achievement Unlocked" and the capstone can read
  // a per-entry count.
  const check = useCallback((snapshot) => {
    const newly = [];
    const currentUnlocked = unlockedRef.current;
    for (const a of visible) {
      if (currentUnlocked.has(a.id)) continue;
      if (typeof a.condition !== 'function') continue;
      try {
        // Compute the per-entry virtual field. This is the count of
        // OTHER currently-unlocked achievements plus any we have
        // queued during this same check (so the recursive entry can
        // fire on the same tick that another achievement unlocks).
        const otherCount = currentUnlocked.size + newly.length
          - (currentUnlocked.has(a.id) ? 1 : 0);
        const ext = { ...snapshot, unlockedCountExcludingThis: otherCount };
        if (a.condition(ext)) newly.push(a.id);
      } catch {}
    }
    unlockMany(newly);
  }, [visible, unlockMany]);

  // Event-bus subscription. An entry with `event: 'foo'` unlocks the
  // moment bus.fire('foo') runs anywhere in the app.
  useEffect(() => {
    const subs = [];
    for (const a of visible) {
      if (!a.event) continue;
      const sub = bus.subscribe(a.event, () => unlockMany([a.id]));
      subs.push(sub);
    }
    return () => { for (const u of subs) u(); };
  }, [visible, unlockMany]);

  return {
    unlocked,
    unlockedCount: visible.filter(a => unlocked.has(a.id)).length,
    totalCount:    visible.length,
    visible,
    isUnlocked:    (id) => unlocked.has(id),
    check,
    // Exposed so debug bridges or special flows (test panel etc.) can
    // force-fire an unlock without going through the bus.
    forceUnlock:   (id) => unlockMany([id]),
  };
}
