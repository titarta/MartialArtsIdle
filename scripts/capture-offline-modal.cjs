/* eslint-disable */
/**
 * One-off Electron capture script for the offline-earnings modal.
 * Run via `npx electron scripts/capture-offline-modal.cjs`.
 *
 * Loads the dev server (assumed http://localhost:5173) twice:
 *   - lastSeen = 4h ago  → impl-long.png  (with duration chip)
 *   - lastSeen = 10m ago → impl-short.png (without duration chip)
 *
 * Mobile viewport: 390 × 844.
 *
 * Output: _design/offline-earnings-pass/impl-long.png and impl-short.png
 */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const DEV_URL = 'http://localhost:5173/';
const OUT_DIR = path.join(__dirname, '..', '_design', 'offline-earnings-pass');
const VW = 390;
const VH = 844;

async function captureOne(awayMs, outFileName) {
  const win = new BrowserWindow({
    width: VW,
    height: VH,
    show: false,
    webPreferences: {
      offscreen: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.webContents.setVisualZoomLevelLimits(1, 1);

  // Load a blank about:blank first to acquire localStorage scope at the
  // dev-server origin. We need to access localStorage BEFORE loading the
  // React app so the auto-save / tutorial flow sees a primed save.
  await win.loadURL(DEV_URL);
  // Wait for first paint, then nuke + seed everything in one step.
  await new Promise((r) => setTimeout(r, 1500));
  await win.webContents.executeJavaScript(`
    (function() {
      localStorage.clear();
      // Pre-mark tutorial as seen so the modal isn't gated.
      localStorage.setItem('mai_tutorial_seen', JSON.stringify({ all: true }));
      localStorage.setItem('mai_seen_features', JSON.stringify({}));
      localStorage.setItem('mai_seen_worlds', JSON.stringify({}));
      // Complete-enough save — realmIndex mid-game, lastSeen far enough
      // back to trigger the offline-earnings event.
      var save = {
        realmIndex: 8,
        qi: 5000,
        qiEarnedThisRealm: 0,
        lastSeen: Date.now() - ${awayMs},
        focusMult: 1,
      };
      localStorage.setItem('mai_save', JSON.stringify(save));
      // Producer rate snapshot makes offline qi a meaningful number.
      localStorage.setItem('mai_producers_rate_snapshot', JSON.stringify({ rate: 80 }));
    })();
  `);
  // Reload — now the app boots with a pre-seeded save + lastSeen in the past.
  await win.loadURL(DEV_URL);
  await new Promise((r) => setTimeout(r, 3000));
  // Confirm modal is up
  const present = await win.webContents.executeJavaScript(
    "!!document.querySelector('.offline-stage')",
  );
  if (!present) {
    console.error(`[${outFileName}] modal not present — aborting.`);
    win.close();
    return false;
  }
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT_DIR, outFileName), image.toPNG());
  console.log(`[${outFileName}] wrote ${path.join(OUT_DIR, outFileName)}`);
  win.close();
  return true;
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  try {
    await captureOne(4 * 60 * 60 * 1000, 'impl-long.png');
    await captureOne(10 * 60 * 1000, 'impl-short.png');
  } catch (e) {
    console.error(e);
  }
  app.quit();
});
