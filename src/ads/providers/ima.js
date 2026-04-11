/**
 * Google IMA SDK provider — browser PWA and Steam (Electron/Tauri).
 * Loads the IMA HTML5 SDK on demand and runs rewarded video ads.
 *
 * TODO before launch:
 *   Replace VAST_TAG_URL with your real Ad Manager rewarded ad tag.
 *   Get yours at: https://admanager.google.com
 *   Format: https://pubads.g.doubleclick.net/gampad/ads?...
 */

// Google sample rewarded VAST tag — works without an account, for testing only
const VAST_TAG_URL =
  'https://pubads.g.doubleclick.net/gampad/ads' +
  '?iu=/21775744923/external/rewarded_html5_example' +
  '&sz=0x0&cust_params=sample_ct%3Drewarded&ciu_szs=728x90' +
  '&gdfp_req=1&output=vast&unviewed_position_start=1' +
  '&env=vp&impl=s&correlator=';

const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';

let _scriptLoaded  = false;
let _adsLoader     = null;
let _adsManager    = null;
let _adContainer   = null; // persistent fullscreen overlay
let _videoEl       = null;
let _displayContainer = null;
let _adReady       = false;

// ── DOM setup ────────────────────────────────────────────────────────────────

function ensureContainer() {
  if (_adContainer) return;

  _adContainer = document.createElement('div');
  _adContainer.style.cssText = `
    display: none;
    position: fixed; inset: 0; z-index: 9999;
    background: #000;
  `;

  _videoEl = document.createElement('video');
  _videoEl.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
  _videoEl.setAttribute('playsinline', '');
  _videoEl.muted = false;

  const displayDiv = document.createElement('div');
  displayDiv.style.cssText = 'position: absolute; inset: 0;';

  _adContainer.appendChild(_videoEl);
  _adContainer.appendChild(displayDiv);
  document.body.appendChild(_adContainer);

  _displayContainer = new window.google.ima.AdDisplayContainer(displayDiv, _videoEl);
}

function showContainer()  { _adContainer.style.display = 'block'; }
function hideContainer()  { _adContainer.style.display = 'none'; }

// ── SDK loader ───────────────────────────────────────────────────────────────

function loadIMAScript() {
  if (_scriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s   = document.createElement('script');
    s.src     = IMA_SDK_URL;
    s.onload  = () => { _scriptLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('IMA SDK failed to load'));
    document.head.appendChild(s);
  });
}

// ── Provider interface ───────────────────────────────────────────────────────

export async function init() {
  try {
    await loadIMAScript();
    ensureContainer();
  } catch (e) {
    console.warn('[ads/ima] init failed:', e);
  }
}

export function loadRewarded() {
  return new Promise((resolve) => {
    if (!window.google?.ima) { resolve(false); return; }

    try {
      ensureContainer();

      // Destroy previous loader if any
      if (_adsLoader) { _adsLoader.contentComplete(); }
      _adsLoader = new window.google.ima.AdsLoader(_displayContainer);

      _adsLoader.addEventListener(
        window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (e) => {
          _adsManager = e.getAdsManager(_videoEl);
          _adReady    = true;
          resolve(true);
        }
      );

      _adsLoader.addEventListener(
        window.google.ima.AdErrorEvent.Type.AD_ERROR,
        () => { _adReady = false; resolve(false); }
      );

      const req = new window.google.ima.AdsRequest();
      req.adTagUrl = VAST_TAG_URL;
      req.linearAdSlotWidth  = window.innerWidth;
      req.linearAdSlotHeight = window.innerHeight;
      _adsLoader.requestAds(req);
    } catch {
      resolve(false);
    }
  });
}

export function showRewarded() {
  return new Promise((resolve) => {
    if (!_adReady || !_adsManager) { resolve({ rewarded: false }); return; }

    try {
      showContainer();
      let rewarded = false;

      // Must call initialize() inside a user-gesture handler (button click chain)
      _displayContainer.initialize();

      _adsManager.addEventListener(window.google.ima.AdEvent.Type.COMPLETE, () => {
        rewarded = true;
      });

      _adsManager.addEventListener(window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
        finish();
      });

      _adsManager.addEventListener(window.google.ima.AdEvent.Type.SKIPPED, () => {
        finish();
      });

      _adsManager.addEventListener(window.google.ima.AdErrorEvent.Type.AD_ERROR, () => {
        finish();
      });

      function finish() {
        hideContainer();
        try { _adsManager.destroy(); } catch {}
        _adsManager = null;
        _adReady    = false;
        resolve({ rewarded });
      }

      _adsManager.init(
        window.innerWidth,
        window.innerHeight,
        window.google.ima.ViewMode.FULLSCREEN
      );
      _adsManager.start();
    } catch {
      hideContainer();
      resolve({ rewarded: false });
    }
  });
}
