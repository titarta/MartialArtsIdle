# Blood Lotus IAP Setup

How real-money Blood Lotus purchases are wired, and the store/account steps to make them live. Android first, iOS later.

## How it works (code path)

Modal → grant, all already in the repo:

`BloodLotusShopModal` → `purchaseBloodLotus(packageId)` (`src/systems/bloodLotus.js`) → `purchaseProduct()` (`src/iap/iapService.js`) → RevenueCat (`@revenuecat/purchases-capacitor`).

Two paths, chosen automatically by platform:

- **Native (Android / iOS):** real billing through RevenueCat + the store. This is the only path where money moves.
- **Non-native (browser deployment, Electron/Steam):** `purchaseProduct()` returns a simulated success, so the buy button grants the Blood Lotus **for free**. This is intentional for debug/demo right now. When Steam/web monetisation is wanted later, wire a real processor there (Steam microtransactions / Stripe / Paddle) and remove the simulated branch.

`initIAP()` is called once at app boot (`src/App.jsx`, next to `initAds()` / `initAnalytics()`). It no-ops on non-native platforms and on an empty API key, so nothing breaks before the store is configured.

The 6 packs (IDs, prices, grant amounts) live in `BLOOD_LOTUS_PACKAGES` in `src/systems/bloodLotus.js`. The store product IDs must match these strings **exactly**:

| Product ID | Price | Grants |
|---|---|---|
| `blood_lotus_1` | $0.99 | 300 BL |
| `blood_lotus_2` | $4.99 | 1,750 BL |
| `blood_lotus_3` | $14.99 | 5,500 BL |
| `blood_lotus_4` | $29.99 | 11,700 BL |
| `blood_lotus_5` | $49.99 | 21,000 BL |
| `blood_lotus_6` | $99.99 | 45,500 BL |

> The IDs are deliberately index-based (`blood_lotus_1` … `blood_lotus_6`) and carry no amount or price, so you can retune amounts and prices freely without the ID ever lying. The grant amount lives in `bloodLotus.js`; the price lives in Play Console. Players only ever see the label + amount. Play Console product IDs are permanent once created, so keep this naming.

---

## Android setup (do this to go live)

### 1. RevenueCat project
1. Create a RevenueCat account and a new project.
2. Add an app → **Google Play**. App package name: `com.martialartsidle.app`.
3. Copy the **Android public SDK key** (starts with `goog_`).
4. Paste it into `.env.local` → `VITE_RC_ANDROID_KEY=goog_…`. (It's a public client key, safe to ship in the bundle.)

### 2. Create the products (Google Play Console)

> Sequencing: Google Play only lets you create in-app products **after** a build containing the Play Billing library (the RevenueCat SDK adds it) has been uploaded to a track. So do step 4 (build + upload to Internal testing) first, then come back here.
1. The app must already exist in Play Console under `com.martialartsidle.app`.
2. Monetise → Products → **In-app products** → create 6 products with the exact IDs and prices from the table above.
3. Product type: **consumable** (Blood Lotus is spent and re-bought). RevenueCat auto-consumes them so they can be purchased repeatedly.
4. **Activate** each product.

### 3. Link RevenueCat ↔ Play (purchase verification)
RevenueCat needs a Google service account to verify purchases against Play:
1. Follow RevenueCat's guided "Google Play Store" connection flow.
2. It walks you through: create a service account in Google Cloud, enable the **Google Play Android Developer API**, grant that account access in Play Console (Users & permissions, with view financial data / manage orders), download the JSON credentials, and upload them to RevenueCat.
3. Reference: RevenueCat docs → "Google Play Store" setup. (The Play/Cloud UIs shift, so follow the live guide for exact clicks.)

### 4. Build, upload, test
1. Make sure release **signing** is configured in `android/` (keystore). IAP only works on a build signed with the key Play knows.
2. `npm run release:android` → signed `.aab` (or `release:android:apk` for an APK).
3. Upload to an **Internal testing** track in Play Console (IAP does not work on a sideloaded/debug build; the purchase dialog only appears for builds Google recognises).
4. Play Console → Setup → **License testing** → add tester Google accounts (their purchases are free / auto-refunded).
5. Install via the internal-testing link on a device signed in as a tester, open the shop, buy a pack → Blood Lotus should be granted.

### Gotchas
- New products can take a few hours to propagate before they're purchasable.
- The app must be published to at least an internal/closed track for IAP to function.
- `applicationId` and the signing key must match what Play has.
- If products don't load on device: check the `goog_` key is set, the build is `--mode native`, and the IDs in Play match `bloodLotus.js` exactly.

---

## iOS setup (later, needs a Mac)

`ios/` isn't scaffolded yet (requires macOS + Xcode). When ready:
1. Add an **iOS app** in the same RevenueCat project → copy the **`appl_`** public SDK key → `.env.local` → `VITE_RC_IOS_KEY=`.
2. App Store Connect → create the same 6 **consumable** IAPs with matching product IDs.
3. App Store Connect → generate an **App-Specific Shared Secret** → add it to RevenueCat (so it can validate receipts).
4. Test with StoreKit configuration in Xcode, then a Sandbox tester account.

The code path is already platform-agnostic; iOS needs only the key + store products, no code changes.

---

## Notes / known tradeoffs

- **Grant is client-trusted.** RevenueCat verifies the *transaction* with the store (the money is real), but the Blood Lotus is granted locally in `localStorage` with no server-side receipt check. Fine for an offline-first single-player game; revisit if cloud save or leaderboards are ever added.
- **"Restore Purchases" is a no-op for this catalog.** Consumables aren't restorable by design. Keep the button (stores like to see one); it only becomes meaningful if a non-consumable like *Remove Ads* is added (see `Monetisation.md`).

## Related
- [[Monetisation]]
- `src/iap/iapService.js` · `src/systems/bloodLotus.js` · `src/components/BloodLotusShopModal.jsx`
