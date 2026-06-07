/**
 * AdMob provider — native iOS / Android via @capacitor-community/admob.
 * Only imported in native production builds.
 *
 * TODO before store submission:
 *   1. Replace test ad unit IDs below with real ones from https://admob.google.com
 *   2. Add real AdMob App IDs to capacitor.config.json
 *      Android App ID: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
 *      iOS App ID:     ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
 */

import { Platform } from '../../platform';

// Google's universal TEST ad unit IDs. These always serve a test ad.
const TEST_UNIT_IDS = {
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios:     'ca-app-pub-3940256099942544/1712485313',
  },
};

// Real (production) ad unit IDs. iOS stays on the test unit until an iOS
// AdMob app exists. Dev builds (dev:native) use the test units above so we
// never risk self-clicks on real ads during development.
const LIVE_UNIT_IDS = {
  rewarded: {
    android: 'ca-app-pub-2334336722369393/9241068954',
    ios:     'ca-app-pub-3940256099942544/1712485313', // TODO: real iOS unit when an iOS AdMob app is created
  },
};

// Real ads ONLY when the build explicitly opts in via VITE_ADMOB_LIVE=1, which
// is set by the `release:android:live` / `release:android:apk:live` scripts for
// the public store release. EVERY other build (dev, internal/closed testing)
// shows TEST ads, so neither you nor any tester ever generates real ad traffic
// and you never have to register a single device.
// Compared against the literal '1' so the bundler can statically fold this and
// strip the unused ad IDs: test builds contain zero real-ad references, live
// builds (VITE_ADMOB_LIVE=1, set by the release:*:live scripts) contain only
// the real ones.
const USE_LIVE_ADS = import.meta.env.VITE_ADMOB_LIVE === '1';
const UNIT_IDS = USE_LIVE_ADS ? LIVE_UNIT_IDS : TEST_UNIT_IDS;

let _AdMob = null;
let _RewardAdPluginEvents = null;

async function sdk() {
  if (_AdMob) return { AdMob: _AdMob, RewardAdPluginEvents: _RewardAdPluginEvents };
  const mod = await import('@capacitor-community/admob');
  _AdMob = mod.AdMob;
  _RewardAdPluginEvents = mod.RewardAdPluginEvents;
  return { AdMob: _AdMob, RewardAdPluginEvents: _RewardAdPluginEvents };
}

function unitId() {
  return Platform.isAndroid
    ? UNIT_IDS.rewarded.android
    : UNIT_IDS.rewarded.ios;
}

// Comma-separated AdMob test-device IDs (from env). Listed devices always get
// test ads even in a production build, so you can safely test the rewarded
// flow on your own phone without an invalid-traffic ban. Find your device id
// in logcat after the first ad request (AdMob logs a testingDevices line).
const TEST_DEVICES = (import.meta.env.VITE_ADMOB_TEST_DEVICES ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

export async function init() {
  const { AdMob } = await sdk();
  await AdMob.initialize({
    requestTrackingAuthorization: true,
    testingDevices: TEST_DEVICES,
    initializeForTesting: !USE_LIVE_ADS,
  });
}

export async function loadRewarded() {
  try {
    const { AdMob } = await sdk();
    await AdMob.prepareRewardVideoAd({ adId: unitId() });
    return true;
  } catch {
    return false;
  }
}

export function showRewarded() {
  return new Promise(async (resolve) => {
    try {
      const { AdMob, RewardAdPluginEvents } = await sdk();
      let rewarded = false;

      const onReward   = await AdMob.addListener(RewardAdPluginEvents.Rewarded,  () => { rewarded = true; });
      const onDismiss  = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        onReward.remove();
        onDismiss.remove();
        resolve({ rewarded });
      });

      await AdMob.showRewardVideoAd();
    } catch {
      resolve({ rewarded: false });
    }
  });
}
