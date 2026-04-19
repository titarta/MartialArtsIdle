const SAVE_KEY       = 'mai_save';
const TECH_KEY       = 'mai_techniques';
const OWNED_TECH_KEY = 'mai_owned_techniques';

/**
 * Cookie Clicker-style save system.
 * - Auto-saves to localStorage
 * - Export: base64 encoded string the user can copy
 * - Import: paste a base64 string to restore
 */

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...state,
      lastSeen: Date.now(),
    }));
  } catch {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function wipeSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(TECH_KEY);
  localStorage.removeItem(OWNED_TECH_KEY);
  localStorage.removeItem('mai_artefacts');
  localStorage.removeItem('mai_inventory');
  localStorage.removeItem('mai_owned_laws');
  localStorage.removeItem('mai_active_law');
  localStorage.removeItem('mai_pills');
  localStorage.removeItem('mai_active_pills');
  localStorage.removeItem('mai_seen_worlds');
  localStorage.removeItem('mai_pending_selections');
  localStorage.removeItem('mai_active_selections');
  localStorage.removeItem('mai_cleared_regions');
  localStorage.removeItem('mai_seen_features');
  localStorage.removeItem('mai_auto_farm');
  localStorage.removeItem('mai_qi_crystal');
  localStorage.removeItem('mai_achievements');
  // mai_jade is intentionally NOT wiped — paid currency survives a save reset
  // mai_lang is intentionally NOT wiped — language preference survives a save reset
  // mai_reincarnation + mai_reincarnation_tree also survive — karma and
  // Eternal Tree persist through a full wipe.
}

/**
 * Wipe for reincarnation. Preserves karma + tree (their keys are outside
 * the wipeSave list) and also the currently-active law — the player keeps
 * the manual they're cultivating across rebirths, but loses any other
 * collected laws.
 */
export function wipeReincarnation() {
  // Snapshot the active law BEFORE the wipe
  let activeLaw = null;
  let activeId  = null;
  try {
    const activeRaw = localStorage.getItem('mai_active_law');
    activeId = activeRaw ? JSON.parse(activeRaw) : null;
    const ownedRaw = localStorage.getItem('mai_owned_laws');
    const owned    = ownedRaw ? JSON.parse(ownedRaw) : [];
    activeLaw = owned.find(l => l.id === activeId) ?? owned[0] ?? null;
  } catch {}

  wipeSave();

  // Restore the active law as the sole owned law
  if (activeLaw) {
    try {
      localStorage.setItem('mai_owned_laws',  JSON.stringify([activeLaw]));
      localStorage.setItem('mai_active_law', JSON.stringify(activeLaw.id));
    } catch {}
  }
}

// ─── Technique slots ──────────────────────────────────────────────────────────

export function saveTechniques(slots) {
  try {
    localStorage.setItem(TECH_KEY, JSON.stringify(slots));
  } catch {}
}

export function loadTechniques() {
  try {
    const raw = localStorage.getItem(TECH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ─── Owned (dropped) techniques ───────────────────────────────────────────────

export function saveOwnedTechniques(owned) {
  try { localStorage.setItem(OWNED_TECH_KEY, JSON.stringify(owned)); } catch {}
}

export function loadOwnedTechniques() {
  try {
    const raw = localStorage.getItem(OWNED_TECH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function exportSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return btoa(raw);
}

export function importSave(encoded) {
  try {
    const json = atob(encoded.trim());
    const data = JSON.parse(json);
    // Basic validation — must have expected keys
    if (typeof data.realmIndex !== 'number' || typeof data.qi !== 'number') {
      return { ok: false, error: 'Invalid save data' };
    }
    localStorage.setItem(SAVE_KEY, json);
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Could not decode save string' };
  }
}
