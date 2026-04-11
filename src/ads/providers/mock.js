/**
 * DEV-only mock ad provider.
 * Shows a fullscreen overlay with a 5-second countdown.
 * "Skip" button dismisses without rewarding — lets you test both paths.
 * Automatically stripped in production builds (only imported when import.meta.env.DEV).
 */

export async function init() {
  // Nothing to initialise
}

export async function loadRewarded() {
  return true; // Always "loaded" in dev
}

export function showRewarded() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.92);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: monospace;
    `;
    overlay.innerHTML = `
      <div style="text-align:center; padding:32px; max-width:320px;">
        <div style="font-size:0.7rem; letter-spacing:0.12em; color:#666; margin-bottom:16px; text-transform:uppercase;">
          ⚙ Dev — Simulated Ad
        </div>
        <div id="__ad_mock_cd" style="font-size:4rem; font-weight:bold; color:#f5c842; line-height:1;">5</div>
        <div style="font-size:0.85rem; color:#aaa; margin-top:8px;">Watching ad…</div>
        <button id="__ad_mock_skip" style="
          margin-top:28px; padding:10px 22px;
          background:transparent; border:1px solid #444;
          color:#666; border-radius:6px; cursor:pointer;
          font-size:0.8rem; font-family:monospace;
        ">Skip (no reward)</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const cdEl   = overlay.querySelector('#__ad_mock_cd');
    const skipEl = overlay.querySelector('#__ad_mock_skip');
    let seconds  = 5;

    const interval = setInterval(() => {
      seconds -= 1;
      cdEl.textContent = seconds;
      if (seconds <= 0) {
        finish(true);
      }
    }, 1000);

    function finish(rewarded) {
      clearInterval(interval);
      document.body.removeChild(overlay);
      resolve({ rewarded });
    }

    skipEl.addEventListener('click', () => finish(false));
  });
}
