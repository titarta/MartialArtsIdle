/**
 * bloodLotus.js — Blood Lotus currency system.
 *
 * Blood Lotus is the single premium currency. Primarily purchased via IAP,
 * earned slowly through milestones, events, and the blood_lotus_per_breakthrough perk.
 *
 * Balance is persisted in localStorage separately from the main save so it
 * survives a save wipe (players keep paid currency after a reset).
 */

const BLOOD_LOTUS_KEY = 'mai_blood_lotus';

export function getBloodLotusBalance() {
  try {
    // One-time migration from the legacy 'mai_jade' key.
    const legacy = localStorage.getItem('mai_jade');
    if (legacy !== null && localStorage.getItem(BLOOD_LOTUS_KEY) === null) {
      localStorage.setItem(BLOOD_LOTUS_KEY, legacy);
      localStorage.removeItem('mai_jade');
    }
    const raw = localStorage.getItem(BLOOD_LOTUS_KEY);
    if (raw !== null) return Math.max(0, parseInt(raw, 10) || 0);
  } catch {}
  return 0;
}

function notifyChange(next) {
  try { window.dispatchEvent(new CustomEvent('blood-lotus-changed', { detail: next })); } catch {}
}

export function addBloodLotus(amount) {
  const next = getBloodLotusBalance() + Math.max(0, Math.floor(amount));
  try { localStorage.setItem(BLOOD_LOTUS_KEY, String(next)); } catch {}
  notifyChange(next);
  return next;
}

/**
 * Attempt to spend Blood Lotus. Returns true and deducts if balance is sufficient.
 * Returns false without touching balance if insufficient.
 */
export function spendBloodLotus(amount) {
  const cost = Math.max(0, Math.floor(amount));
  const balance = getBloodLotusBalance();
  if (balance < cost) return false;
  try { localStorage.setItem(BLOOD_LOTUS_KEY, String(balance - cost)); } catch {}
  notifyChange(balance - cost);
  return true;
}

// ── IAP stubs — replace with platform SDK calls when ready ───────────────────

export const BLOOD_LOTUS_PACKAGES = [
  { id: 'blood_lotus_60',   amount: 300,   price: '$0.99',  label: 'Handful of Blood Lotus'  },
  { id: 'blood_lotus_330',  amount: 1650,  price: '$4.99',  label: 'Pouch of Blood Lotus'    },
  { id: 'blood_lotus_980',  amount: 4900,  price: '$14.99', label: 'Chest of Blood Lotus'    },
  { id: 'blood_lotus_1980', amount: 9900,  price: '$29.99', label: 'Vault of Blood Lotus'    },
  { id: 'blood_lotus_3280', amount: 16400, price: '$49.99', label: 'Treasury of Blood Lotus' },
  { id: 'blood_lotus_6480', amount: 32400, price: '$99.99', label: 'Heaven\'s Fortune'       },
];

export async function purchaseBloodLotus(packageId) {
  const { purchaseProduct } = await import('../iap/iapService');
  const pkg = BLOOD_LOTUS_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { ok: false, error: 'Unknown package' };
  try {
    await purchaseProduct(packageId);
    addBloodLotus(pkg.amount);
    return { ok: true, amount: pkg.amount };
  } catch (err) {
    if (err?.message?.includes('cancel')) return { ok: false, cancelled: true };
    return { ok: false, error: err?.message ?? 'Purchase failed' };
  }
}

// ── Blood Lotus costs ─────────────────────────────────────────────────────────

export const BLOOD_LOTUS_COSTS = {
  reroll_minor:       50,   // reroll on a minor level-up selection
  reroll_breakthrough: 0,   // first reroll on breakthrough is free (handled in hook)
  reroll_extra:       100,  // additional rerolls on breakthrough after the free one
  // Law offers are rarer than augments and shape several realms of play,
  // so each reroll past the free first costs more than reroll_extra.
  reroll_law_extra:   150,
};
