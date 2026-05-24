/**
 * achievementBus.js — lightweight event bus for achievements that don't
 * fit the snapshot-poll model.
 *
 * Most achievements check against a snapshot of player state (realm
 * index, lifetime taps, peak qi/s) on a debounced effect in App.jsx.
 * A handful need direct event signals because the condition is
 * transient: tap rhythm, exact-timestamp tap, hold duration, "20
 * non-interactable taps in a row", etc. Those fire here.
 *
 * Subscribers (useAchievements) listen for an event id and unlock the
 * matching achievement immediately. The bus is fire-and-forget; no
 * payload is required, but achievements may want metadata so the API
 * passes through whatever the caller supplies.
 *
 * No React dependency. Safe to call from inside hooks, effects, or
 * non-React modules. Listener cleanup is the caller's responsibility.
 */

const listeners = new Map(); // eventId → Set<fn>

/**
 * Fire an event. Subscribers are called synchronously in subscription
 * order. Errors in listeners are caught so one bad subscriber cannot
 * break the bus for the rest.
 */
export function fire(eventId, payload) {
  const set = listeners.get(eventId);
  if (!set || set.size === 0) return;
  for (const fn of set) {
    try { fn(payload); } catch {}
  }
}

/**
 * Subscribe to an event. Returns an unsubscribe function. Call once
 * and store the returned cleanup; calling multiple times for the same
 * fn dedupes naturally because we use a Set.
 */
export function subscribe(eventId, fn) {
  if (typeof fn !== 'function') return () => {};
  let set = listeners.get(eventId);
  if (!set) {
    set = new Set();
    listeners.set(eventId, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(eventId);
  };
}

/**
 * Subscribe to ALL events. Used by the achievement engine which wants
 * to match any incoming event id against its `event` field. The
 * callback receives `(eventId, payload)`.
 */
const ANY = '__any__';
export function subscribeAll(fn) {
  return subscribe(ANY, fn);
}

// Wrap fire to also notify any-subscribers. Done by re-defining the
// export above? We can't, so instead we replace the public fire with
// a wrapper. Keep the original as _fireDirect for testing.
const _fireDirect = fire;
export function fireWithAny(eventId, payload) {
  _fireDirect(eventId, payload);
  _fireDirect(ANY, { eventId, payload });
}

// Default export so call sites can `import bus from '../systems/achievementBus'`.
const bus = {
  fire: fireWithAny,
  subscribe,
  subscribeAll,
};
export default bus;
