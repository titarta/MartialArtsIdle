# Monetisation

## Philosophy

Ads should feel like a **choice, not a tax**. Every ad placement must:
- Be voluntary (player initiates)
- Offer a meaningful, thematic reward
- Never block gameplay or progress
- Disappear gracefully when offline or unavailable

## Current Implementation — Rewarded Ads Only

No interstitial ads at launch. Earn player trust first, evaluate interstitials later once retention metrics are available.

### Placement 1 — Channel Heavenly Qi (Home Screen)

| Property | Value |
|---|---|
| Trigger | Player taps the button below the cultivation stage |
| Reward | 2× cultivation speed for 30 minutes |
| Cooldown | 30 minutes after watching |
| Visibility | Hidden when offline, when boost is already active, or when no ad is loaded |
| Thematic framing | "A heavenly benefactor offers to nourish your foundation" |

### Placement 2 — Ancient Scroll of Time (Home Screen, on return)

| Property | Value |
|---|---|
| Trigger | Automatic popup when player returns after 5+ minutes away |
| Reward | Collect offline Qi earnings ×2 instead of ×1 |
| Cooldown | Once per session (dismissed after first collection) |
| Visibility | Only shown if offline earnings exist; ad button hidden if no ad loaded |
| Thematic framing | "While you were away, the heavens continued to nourish your foundation" |

## Ad Network

**AdMob** (`@capacitor-community/admob`) — native only (Android + iOS via Capacitor).

No ads on browser/PWA or Steam builds. The platform layer (`src/platform/index.js`) gates all ad calls.

### Ad Unit IDs

> Replace test IDs before store submission. Real IDs obtained from https://admob.google.com

| Platform | Type | ID |
|---|---|---|
| Android | Rewarded | `ca-app-pub-3940256099942544/5224354917` ← TEST |
| iOS | Rewarded | `ca-app-pub-3940256099942544/1712485313` ← TEST |

Also update AdMob App IDs in `capacitor.config.json` before release.

## Future Placements (post-launch)

Only add after verifying retention > D7 target.

| Idea | Screen | Reward | Notes |
|---|---|---|---|
| Reveal Fortune | Build | Re-roll cultivation law | Requires law system to be fully dynamic |
| Combat Revival | Combat | Revive once after defeat | Only if combat has meaningful stakes |
| Interstitial on breakthrough | Home | None | After D7 retention data — max 1 per 5 min |

## Remove Ads IAP (planned)

- Removes any future interstitial ads
- Rewarded ads remain (players want them)
- One-time purchase, suggested price: $2.99–$4.99

## Related

- [[Game Vision]]
- [[Roadmap]]
