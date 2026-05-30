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

// Google test IDs — always return a test ad, safe to ship during development
const UNIT_IDS = {
  rewarded: {
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios:     'ca-app-pub-3940256099942544/1712485313',
  },
};

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

export async function init() {
  const { AdMob } = await sdk();
  await AdMob.initialize({ requestTrackingAuthorization: true });
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
