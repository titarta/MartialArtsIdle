# Monetisation

## Philosophy

Ads are a **choice, not a tax**: voluntary, meaningful reward, never block gameplay.

## Current Implementation — Rewarded Ads Only

No interstitials at launch. Two placements:

| Placement | Trigger | Reward | Cooldown |
|---|---|---|---|
| Channel Heavenly Qi (Home) | Player taps button | 2× cultivation speed for 30 min | 30 min |
| Ancient Scroll of Time (Home, on return) | Auto popup after 5+ min away | Collect offline Qi ×2 | Once per session |

Ad network: **AdMob** (`@capacitor-community/admob`) — native Android/iOS only. No ads on browser/PWA/Steam.

> **Android live ad IDs are wired** (real App ID in the manifest + real rewarded unit in `src/rewards/providers/admob.js`). Dev builds (`dev:native`) use Google test ads; production builds use the real units. Add your device to `VITE_ADMOB_TEST_DEVICES` in `.env.local` to force test ads on your own phone even in a prod build, which avoids invalid-traffic / self-click bans. iOS still uses test IDs until an iOS AdMob app is created.
>
> **Best-revenue roadmap:** AdMob alone now. Once there is real traffic, enable AdMob mediation with bidding (add AppLovin MAX, Meta, Unity, Mintegral as bidding sources in the AdMob dashboard) for higher eCPM with no SDK swap. Consider a full AppLovin MAX integration only if ad revenue grows enough to justify the Capacitor native work.

---

## Blood Lotus IAP (premium currency)

Six consumable Blood Lotus packs ($0.99 → $99.99) sold via **RevenueCat** (`@revenuecat/purchases-capacitor`) on native Android/iOS. Code path is wired and live; going live needs the RevenueCat project + Play Console products + a signed testing build.

- Browser/Steam/Electron currently grant Blood Lotus **for free** (simulated purchase). This is intentional debug/demo behaviour for now.
- Full setup steps, product IDs, and gotchas: [[IAP-Setup]].

---

## Future (post-launch, after D7 retention verified)

- Reveal Fortune: re-roll law (ad)
- Combat Revival: revive after defeat (ad)
- Interstitial on breakthrough (max 1 per 5 min)
- Remove Ads IAP: one-time ~$2.99–$4.99; removes future interstitials, rewarded ads stay

---

## Related

- [[Game Vision]] · [[Roadmap]]
