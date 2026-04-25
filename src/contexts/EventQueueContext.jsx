/**
 * EventQueueContext.jsx — single FIFO queue for spontaneous UI events.
 *
 * Solves the "things piling on screen" problem: breakthrough banners, level-up
 * cards, crystal evolution overlays, daily bonus + offline earnings on launch
 * etc. used to fire from independent effects and stack on top of each other.
 *
 * Now they all enqueue into one ordered list. The head of the queue is the
 * "current event" — only one is presented at a time. When dismissed, the
 * next one slides in.
 *
 * Two extra knobs:
 *  - `priority: 'high'` jumps to the front of the queue (used for crystal
 *    evolution + offline earnings, which feel cheap to interrupt).
 *  - `dedupe: true` replaces a pending event of the same kind instead of
 *    stacking duplicates.
 *
 * Player-initiated modals (Settings, Achievements, Crystal Feed, etc.) don't
 * go through the queue — they open immediately on tap. But while one is open
 * they pause the queue via `useBlockingPresence(true)`, so a queued event
 * never pops over the modal the player is actively using.
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const EventQueueContext = createContext(null);

export function EventQueueProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const idCounterRef = useRef(0);

  // Set of registered blockers. Queue head is hidden while size > 0.
  const blockersRef = useRef(new Set());
  const [blockerCount, setBlockerCount] = useState(0);

  const enqueue = useCallback((kind, payload = null, opts = {}) => {
    const id = ++idCounterRef.current;
    const event = { id, kind, payload, priority: opts.priority ?? 'normal' };
    setQueue(prev => {
      let next = prev;
      if (opts.dedupe) next = next.filter(e => e.kind !== kind);
      return event.priority === 'high' ? [event, ...next] : [...next, event];
    });
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setQueue(prev => {
      if (prev.length === 0) return prev;
      if (id == null) return prev.slice(1);
      // If id matches head, pop head; otherwise remove from middle.
      if (prev[0].id === id) return prev.slice(1);
      return prev.filter(e => e.id !== id);
    });
  }, []);

  const clear = useCallback(() => setQueue([]), []);

  const registerBlocker = useCallback((id) => {
    blockersRef.current.add(id);
    setBlockerCount(blockersRef.current.size);
  }, []);

  const unregisterBlocker = useCallback((id) => {
    blockersRef.current.delete(id);
    setBlockerCount(blockersRef.current.size);
  }, []);

  const head = queue[0] ?? null;
  const isBlocked = blockerCount > 0;
  const value = {
    // Visible to renderers — null while blocked so consumers don't show the event.
    currentEvent: isBlocked ? null : head,
    isBlocked,
    queueLength: queue.length,
    enqueue,
    dismiss,
    clear,
    registerBlocker,
    unregisterBlocker,
  };

  return (
    <EventQueueContext.Provider value={value}>
      {children}
    </EventQueueContext.Provider>
  );
}

export function useEventQueue() {
  const ctx = useContext(EventQueueContext);
  if (!ctx) throw new Error('useEventQueue must be used inside EventQueueProvider');
  return ctx;
}

/**
 * Mark the calling component as a blocker while `enabled` is true. Use this
 * in any modal/overlay that should NOT be interrupted by a queued event —
 * crystal feed, settings, achievements, journey, blood-lotus shop, pills, etc.
 */
export function useBlockingPresence(enabled) {
  const { registerBlocker, unregisterBlocker } = useEventQueue();
  useEffect(() => {
    if (!enabled) return undefined;
    const id = `blk_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    registerBlocker(id);
    return () => unregisterBlocker(id);
  }, [enabled, registerBlocker, unregisterBlocker]);
}
