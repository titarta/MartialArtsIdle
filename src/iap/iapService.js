// SKU IDs must match exactly what you create in Google Play Console / App Store Connect:
//   blood_lotus_1, blood_lotus_2, blood_lotus_3, blood_lotus_4, blood_lotus_5, blood_lotus_6

import { Purchases, LOG_LEVEL, PRODUCT_CATEGORY } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const RC_ANDROID_KEY = import.meta.env.VITE_RC_ANDROID_KEY ?? '';
const RC_IOS_KEY     = import.meta.env.VITE_RC_IOS_KEY ?? '';

let initialised = false;

export async function initIAP(userId) {
  if (!Capacitor.isNativePlatform()) return;
  if (initialised) return;

  const apiKey = Capacitor.getPlatform() === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) { console.warn('IAP: no RevenueCat API key set'); return; }

  await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
  await Purchases.configure({ apiKey });

  if (userId) await Purchases.logIn({ appUserID: userId });

  initialised = true;
}

export async function getProducts(productIds) {
  if (!Capacitor.isNativePlatform()) return [];
  // Blood Lotus packs are one-time products. getProducts defaults to SUBSCRIPTION
  // on Android, which returns [] for them, so we must query NON_SUBSCRIPTION.
  const { products } = await Purchases.getProducts({ productIdentifiers: productIds, type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
  return products;
}

export async function purchaseProduct(productId) {
  if (!Capacitor.isNativePlatform()) {
    // Non-native targets (browser deployment, Electron/Steam): no real billing
    // is wired. We INTENTIONALLY simulate success so the shop fully works for
    // debug / demo. The caller then grants the Blood Lotus for free. Real
    // money only ever flows through the native Android/iOS path below
    // (RevenueCat). Do NOT gate this behind DEV: the deployed web build is
    // meant to allow free unlocks for now.
    console.warn('IAP: non-native platform, simulating free purchase of', productId);
    return { simulated: true, productId };
  }

  // Guarantee RevenueCat is configured before any store call. initIAP() is
  // idempotent (no-ops once configured), so this covers the case where the
  // boot-time init has not finished yet or the user tapped Buy very early.
  // Without it, an early tap surfaces RevenueCat's "Purchases must be
  // configured before calling" error.
  await initIAP();

  // One-time products MUST be queried as NON_SUBSCRIPTION; the default is
  // SUBSCRIPTION on Android, which returns [] and throws "product not found".
  const { products } = await Purchases.getProducts({ productIdentifiers: [productId], type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
  if (!products.length) throw new Error(`Product not found: ${productId}`);

  const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] });
  return customerInfo;
}

export async function restorePurchases() {
  if (!Capacitor.isNativePlatform()) return null;
  const { customerInfo } = await Purchases.restorePurchases();
  return customerInfo;
}
