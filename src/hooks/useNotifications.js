import { useState, useCallback } from 'react';
import AudioManager from '../audio/AudioManager';

/**
 * useNotifications — toast queue + nav badge map.
 *
 * The Cookie-Clicker pivot retired combat, the Worlds hub, gathering, mining,
 * and alchemy, so the world-unlock toasts + worlds / production badges that
 * used to fire from here are gone. The toast queue + addToast API stay live
 * so achievement / unlock / spark toasts still surface.
 */

let toastCounter = 0;

export default function useNotifications(/* { cultivation } */) {
  const [toastQueue, setToastQueue] = useState([]);

  // No nav-tab badges remain in v1. The empty bag means NavBar's badge map
  // lookup ({} ?? false) just falls through to no dot on every tab.
  const badges = {};

  /** Call when the player navigates to a tab to clear its badge. */
  const clearBadge = useCallback(() => {
    // No-op in v1 — there are no live badges to clear.
  }, []);

  const dismissToast = useCallback((id) => {
    setToastQueue(q => q.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    // Sanctum v38: backfill defaults for legacy callers that don't pass
    // kicker / glyph / type. Component still renders cleanly with a
    // generic 'TIDINGS' stamp if none of these are set.
    setToastQueue(q => [...q, {
      id: `ext-${++toastCounter}`,
      type:   toast.type   ?? 'info',
      kicker: toast.kicker ?? null,
      glyph:  toast.glyph  ?? '印', // wax seal default
      ...toast,
    }]);
    try { AudioManager.playSfx('ui_notify'); } catch {}
  }, []);

  return { badges, toastQueue, clearBadge, dismissToast, addToast };
}
