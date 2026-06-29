/* global __MAI_VERSION__ */
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

// 2026-05-23 — Re-priced to create a real bonus ladder vs. the Handful baseline.
// Tier 1 anchors the BL-per-$ rate; every successive tier adds a real, honest
// bonus over baseline so the marketing chips in the IAP modal aren't lying.
//
//   tier              $        amount   BL/$    bonus vs T1
//   Handful           0.99     300      303     —
//   Pouch             4.99     1,750    351     +16%
//   Chest            14.99     5,500    367     +21%
//   Vault            29.99    11,700    390     +29%
//   Treasury         49.99    21,000    420     +39%
//   Heaven's Fortune 99.99    45,500    455     +50%
//
// Existing player balances on disk are untouched — this only changes the
// amount granted on FUTURE purchases. The bigger packs now feel like real
// deals (which is the point — the prior amounts gave almost-identical BL/$
// across all tiers, so a Heaven's Fortune wasn't actually a better deal
// than a Handful).
export const BLOOD_LOTUS_PACKAGES = [
  { id: 'blood_lotus_1', amount: 300,    price: '$0.99',  label: 'Handful of Blood Lotus'  },
  { id: 'blood_lotus_2', amount: 1750,   price: '$4.99',  label: 'Pouch of Blood Lotus'    },
  { id: 'blood_lotus_3', amount: 5500,   price: '$14.99', label: 'Chest of Blood Lotus'    },
  { id: 'blood_lotus_4', amount: 11700,  price: '$29.99', label: 'Vault of Blood Lotus'    },
  { id: 'blood_lotus_5', amount: 21000,  price: '$49.99', label: 'Treasury of Blood Lotus' },
  { id: 'blood_lotus_6', amount: 45500,  price: '$99.99', label: 'Heaven\'s Fortune'       },
];

// ── Grant ledger ──────────────────────────────────────────────────────────────
// Blood Lotus is granted from RevenueCat's transaction history, NOT from "the
// purchase call resolved". Each granted store transaction id is recorded here
// so a transaction is granted exactly once no matter how many times we see it
// (purchase return, boot recovery, shop-open recovery, Restore button).
// This is what makes a paid-but-errored purchase recoverable instead of lost.

const GRANTED_TX_KEY = 'mai_blood_lotus_granted_tx';

function loadGrantedTxIds() {
  try {
    const arr = JSON.parse(localStorage.getItem(GRANTED_TX_KEY) ?? '[]');
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function saveGrantedTxIds(set) {
  try { localStorage.setItem(GRANTED_TX_KEY, JSON.stringify([...set])); } catch {}
}

/** Catalog USD price in cents for analytics. '$4.99' → 499. */
function priceCents(price) {
  const usd = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  return Number.isFinite(usd) ? Math.round(usd * 100) : 0;
}

/**
 * Grant every Blood Lotus pack transaction in `customerInfo` that has not been
 * granted yet. Returns the total amount newly granted (0 if nothing new).
 */
function reconcileBloodLotusTransactions(customerInfo) {
  const txs = customerInfo?.nonSubscriptionTransactions ?? [];
  if (!txs.length) return 0;
  const seen = loadGrantedTxIds();
  let total = 0;
  const grantedThisCall = [];
  for (const tx of txs) {
    const txId = tx?.transactionIdentifier;
    const pkg  = BLOOD_LOTUS_PACKAGES.find(p => p.id === tx?.productIdentifier);
    if (!pkg || !txId || seen.has(txId)) continue;
    seen.add(txId);
    total += pkg.amount;
    grantedThisCall.push(pkg);
  }
  if (total > 0) {
    saveGrantedTxIds(seen);
    addBloodLotus(total);
    // Validated business events — one per newly granted transaction so
    // refunds/recoveries don't double-count revenue in GameAnalytics.
    for (const pkg of grantedThisCall) {
      import('../analytics').then(({ trackPurchase }) => {
        trackPurchase(pkg.id, priceCents(pkg.price), 'USD', 'shop');
      }).catch(() => {});
    }
  }
  return total;
}

let recoveryInFlight = null;

/**
 * Self-heal stuck purchases: sync device purchases to RevenueCat (validates and
 * CONSUMES them, unblocking "you already own this item" on rebuy), then grant
 * any paid-but-ungranted packs via the ledger. Single-flight so concurrent
 * callers (boot + shop open) can't double-grant. Returns { recovered }.
 */
export function recoverPendingBloodLotus() {
  if (recoveryInFlight) return recoveryInFlight;
  recoveryInFlight = (async () => {
    try {
      const { syncPurchases, getCustomerInfo } = await import('../iap/iapService');
      try { await syncPurchases(); } catch {} // best-effort; getCustomerInfo still worth trying
      const info = await getCustomerInfo();
      if (!info) return { recovered: 0 };
      return { recovered: reconcileBloodLotusTransactions(info) };
    } catch (err) {
      return { recovered: 0, error: err?.message };
    } finally {
      recoveryInFlight = null;
    }
  })();
  return recoveryInFlight;
}

export async function purchaseBloodLotus(packageId) {
  const { purchaseProduct } = await import('../iap/iapService');
  const pkg = BLOOD_LOTUS_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { ok: false, error: 'Unknown package' };
  try {
    const result = await purchaseProduct(packageId);
    if (result?.simulated) {
      // Browser/debug path: no store transaction exists, grant directly.
      // Sim purchases are NOT tracked as revenue (they aren't real money).
      addBloodLotus(pkg.amount);
      return { ok: true, amount: pkg.amount, simulated: true };
    }
    // Native: grant from the returned CustomerInfo via the ledger.
    // trackPurchase is emitted inside reconcileBloodLotusTransactions for
    // every newly-granted tx, so the recovery path and the buy-now path
    // both count exactly once.
    const granted = reconcileBloodLotusTransactions(result);
    if (granted === 0) {
      // Defensive: transaction missing from the returned info. A paying player
      // must never be left empty-handed, so grant directly. We DO record this
      // as revenue (they paid Google) but tag it so we can see how often the
      // fallback path fires.
      addBloodLotus(pkg.amount);
      import('../analytics').then(({ trackPurchase, trackShopEvent }) => {
        trackPurchase(pkg.id, priceCents(pkg.price), 'USD', 'fallback');
        trackShopEvent('fallback_grant', pkg.id);
      }).catch(() => {});
      return { ok: true, amount: pkg.amount };
    }
    return { ok: true, amount: granted };
  } catch (err) {
    if (err?.message?.includes('cancel')) {
      import('../analytics').then(({ trackShopEvent }) => trackShopEvent('cancel', packageId)).catch(() => {});
      return { ok: false, cancelled: true };
    }
    // Keep the last real purchase error on disk — it rides along in the
    // support-ticket diagnostics so we can see what the player actually hit.
    try {
      localStorage.setItem(LAST_IAP_ERROR_KEY, JSON.stringify({
        when: new Date().toISOString(),
        packageId,
        message: err?.message ?? String(err),
      }));
    } catch {}
    // The SDK can throw AFTER Google has charged (validation hiccup). Try to
    // recover immediately so the player still gets their Blood Lotus.
    try {
      const { recovered } = await recoverPendingBloodLotus();
      if (recovered > 0) {
        import('../analytics').then(({ trackShopEvent }) => trackShopEvent('recovered_after_error', packageId)).catch(() => {});
        return { ok: true, amount: recovered, recovered: true };
      }
    } catch {}
    import('../analytics').then(({ trackShopEvent, trackError }) => {
      trackShopEvent('fail', packageId);
      trackError(`iap:${packageId}:${err?.message ?? 'unknown'}`, 'warning');
    }).catch(() => {});
    return { ok: false, error: err?.message ?? 'Purchase failed' };
  }
}

// ── Purchase support diagnostics ──────────────────────────────────────────────

const LAST_IAP_ERROR_KEY = 'mai_last_iap_error';

/**
 * Plain-text block for the "report a purchase issue" email. Everything WE can
 * collect automatically lives here; the only thing the player must add by
 * hand is their Google Play order number (GPA.…), which only exists in their
 * Google receipt.
 */
export async function getPurchaseSupportDiagnostics() {
  let appUserId = 'unknown';
  let platform  = 'web';
  try {
    const { Capacitor } = await import('@capacitor/core');
    platform = Capacitor.getPlatform?.() ?? 'web';
  } catch {}
  try {
    const { getAppUserID } = await import('../iap/iapService');
    appUserId = (await getAppUserID()) ?? appUserId;
  } catch {}
  let lastError = 'none';
  try { lastError = localStorage.getItem(LAST_IAP_ERROR_KEY) ?? 'none'; } catch {}
  let ledger = '[]';
  try { ledger = localStorage.getItem(GRANTED_TX_KEY) ?? '[]'; } catch {}
  const version = (typeof __MAI_VERSION__ !== 'undefined' && __MAI_VERSION__) || 'dev';
  return [
    `Support ID: ${appUserId}`,
    `Platform: ${platform}`,
    `App version: ${version}`,
    `Blood Lotus balance: ${getBloodLotusBalance()}`,
    `Granted transactions: ${ledger}`,
    `Last purchase error: ${lastError}`,
    `Date: ${new Date().toISOString()}`,
  ].join('\n');
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
