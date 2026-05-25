// scripts/capture-sparks.mjs — drive a headless Edge via CDP to capture the
// SparksTab "Karmic Charms" implementation screenshots used by the design
// pass at _design/sparks-design-pass/impl-{tab,detail}.png.
//
// Assumes:
//   • Vite dev server is running at http://localhost:5173
//   • A headless Edge has been launched with --remote-debugging-port=9223
//     pointing at that URL
//
// Run: node scripts/capture-sparks.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const CDP_PORT = 9223;
const VIEWPORT = { width: 390, height: 844 };
const OUT_DIR = path.resolve('_design/sparks-design-pass');

async function pickAppTarget() {
  const res = await fetch(`http://localhost:${CDP_PORT}/json`);
  const targets = await res.json();
  const target = targets.find(t => t.url?.startsWith('http://localhost:5173'));
  if (!target) throw new Error('No localhost:5173 target found');
  return target;
}

function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    ws.addEventListener('open', () => {
      const send = (method, params = {}) => {
        const id = nextId++;
        return new Promise((res, rej) => {
          pending.set(id, { res, rej });
          ws.send(JSON.stringify({ id, method, params }));
        });
      };
      const close = () => ws.close();
      resolve({ send, close });
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      }
    });
    ws.addEventListener('error', reject);
  });
}

async function main() {
  const target = await pickAppTarget();
  const client = await cdpClient(target.webSocketDebuggerUrl);
  const { send, close } = client;

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 2,
    mobile: true,
  });

  // Reload so the changes are fresh, wait for app, then navigate to Sparks
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  // Dismiss any tutorial / overlay sitting on top of the navigation. Scans
  // for known dismiss-button text and, as a fallback, clicks any visible
  // .modal-close or .tutorial-close. Up to 12 iterations because a chain of
  // tutorials/overlays may fire (daily gift → layout update → etc).
  for (let i = 0; i < 12; i++) {
    const dismissed = await send('Runtime.evaluate', {
      expression: `
        (() => {
          // First — try to nuke obvious overlays via their close buttons.
          const closes = [...document.querySelectorAll('.modal-close, .tutorial-close, [aria-label="Close"]')]
            .filter(b => b.offsetParent !== null);
          if (closes.length) { closes[0].click(); return 'closeBtn'; }

          const labels = [/Got It/i, /Continue/i, /^OK$/i, /Dismiss/i, /^Close$/i, /Collect/i, /Skip/i, /Maybe Later/i, /Claim/i];
          const buttons = [...document.querySelectorAll('button')];
          for (const b of buttons) {
            const t = (b.textContent || '').trim();
            if (!t) continue;
            if (labels.some(l => l.test(t))) { b.click(); return 'matched:' + t; }
          }
          return null;
        })()
      `,
      returnByValue: true,
    });
    if (!dismissed?.result?.value) break;
    await new Promise(r => setTimeout(r, 350));
  }

  // Click Cultivation, then Sparks
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const cult = [...document.querySelectorAll('button')].find(b => /Cultivation/i.test(b.textContent || '') && b.classList.contains('nav-btn'));
        if (cult) cult.click();
      })()
    `,
  });
  await new Promise(r => setTimeout(r, 400));
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const tab = [...document.querySelectorAll('button')].find(b => /Sparks/i.test(b.textContent || '') && b.getAttribute('data-tab') === 'sparks');
        if (tab) tab.click();
      })()
    `,
  });
  await new Promise(r => setTimeout(r, 400));

  // Grant a richer set of sparks via the gd debug bridge so the grid is full.
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        if (!window.gd?.giveQiSpark) return false;
        gd.clearQiSparks?.();
        gd.giveQiSpark('legendary_f1_storm_tiger');
        gd.giveQiSpark('legendary_f2_pearl_dragon');
        gd.giveQiSpark('legendary_f3_rainbow_phoenix');
        gd.giveQiSpark('legendary_a3_pearl_pendant');
        gd.giveQiSpark('legendary_e2_phoenix_reborn');
        gd.giveQiSpark('sharper_focus');
        gd.giveQiSpark('sharper_focus');
        gd.giveQiSpark('heavens_bond');
        gd.giveQiSpark('heavens_bond');
        gd.giveQiSpark('heavens_bond');
        return true;
      })()
    `,
  });
  await new Promise(r => setTimeout(r, 500));

  // ── Tab screenshot ────────────────────────────────────────────────────
  await send('Runtime.evaluate', {
    expression: `(() => { const r = document.querySelector('.charm-root'); if (r) r.scrollTop = 0; })()`,
  });
  await new Promise(r => setTimeout(r, 300));

  let res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(OUT_DIR, 'impl-tab.png'), Buffer.from(res.data, 'base64'));
  console.log('wrote impl-tab.png');

  // ── Detail modal screenshot — open Phoenix Reborn ─────────────────────
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const charm = [...document.querySelectorAll('.charm')].find(c => /Phoenix Reborn/i.test(c.textContent || ''));
        if (charm) charm.click();
      })()
    `,
  });
  await new Promise(r => setTimeout(r, 500));

  res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(OUT_DIR, 'impl-detail.png'), Buffer.from(res.data, 'base64'));
  console.log('wrote impl-detail.png');

  close();
}

main().catch(err => { console.error(err); process.exit(1); });
