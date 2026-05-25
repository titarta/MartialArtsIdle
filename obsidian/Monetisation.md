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

> Replace test Ad Unit IDs before store submission. Real IDs from https://admob.google.com

---

## Future (post-launch, after D7 retention verified)

- Reveal Fortune: re-roll law (ad)
- Combat Revival: revive after defeat (ad)
- Interstitial on breakthrough (max 1 per 5 min)
- Remove Ads IAP: one-time ~$2.99–$4.99; removes future interstitials, rewarded ads stay

---

## Related

- [[Game Vision]] · [[Roadmap]]
