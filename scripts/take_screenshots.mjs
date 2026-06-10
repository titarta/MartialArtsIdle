/**
 * take_screenshots.mjs - App-store screenshots at 1080x1920 (9:16 portrait).
 *
 *   $env:SHOT_URL='http://localhost:5180/'; node scripts/take_screenshots.mjs
 *
 * Drives the running dev app via the in-game debug bridge (window.gd) and
 * localStorage seeds, hides toasts, and captures a varied feature set to
 * app-store-screenshots/.
 */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const URL = process.env.SHOT_URL || 'http://localhost:5180/';
const OUT = path.resolve('app-store-screenshots');
const TUTORIAL_IDS = [
  'welcome', 'hold_to_focus', 'producers_tab', 'producers_hint',
  'first_producer', 'first_layer_bt', 'first_major_gate',
  'first_spark_offer', 'first_saint',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), type: 'png' });
  console.log('  shot:', name);
}
async function safe(label, fn) {
  try { await fn(); } catch (e) { console.log('  SKIP', label, '-', e.message); }
}
async function click(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) { el.click(); return true; }
    return false;
  }, sel);
}
async function navHome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.modal-close').forEach((b) => { try { b.click(); } catch {} });
    document.querySelectorAll('[aria-label="Back"],[aria-label="Voltar"],.screen-back,.back-button,.header-back')
      .forEach((b) => { try { b.click(); } catch {} });
    const n = document.querySelectorAll('.nav-btn')[0]; if (n) n.click();
  });
  await sleep(700);
}
async function setRealm(page, n) { await page.evaluate((r) => window.gd?.setRealm?.(r), n); await sleep(1200); }

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  // iPhone 13: 390x844 CSS at 3x = 1170x2532 physical pixels (tall phone portrait).
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate((ids) => {
    try { localStorage.setItem('mai_tutorial_seen', JSON.stringify(ids)); } catch {}
    try { localStorage.setItem('mai_blood_lotus', '8888'); } catch {}
    try {
      const t = new Date().toISOString().slice(0, 10);
      localStorage.setItem('mai_daily_bonus', JSON.stringify({ lastCollected: t, streak: 7 }));
      localStorage.setItem('mai_consecutive_days', '7');
    } catch {}
  }, TUTORIAL_IDS);
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2800);

  // Hide all toasts/banners so realm jumps don't clutter the shots.
  await page.addStyleTag({ content: '.toast-stack{display:none!important}' });

  // Base advanced state: realm 46 (T10 Dao Source) also unlocks reincarnation.
  await page.evaluate(() => {
    try { window.gd?.setRealm?.(46); } catch {}
    try { window.gd?.setCrystalLevel?.(80); } catch {}
    try { window.gd?.giveAllSparks?.(); } catch {}
    try { window.gd?.fillQi?.(); } catch {}
  });
  await sleep(2500);

  // Hero home @ T10
  await safe('home-t10', async () => { await navHome(page); await shot(page, '01-home-t10'); });

  // Crystal detail modal
  await safe('crystal', async () => {
    await navHome(page);
    if (await click(page, '.home-qi-crystal-chip')) await shot(page, '02-crystal');
    await page.keyboard.press('Escape'); await sleep(400);
  });

  // Sect: producers / upgrades / sparks
  await safe('sect', async () => {
    await page.evaluate(() => document.querySelectorAll('.nav-btn')[1]?.click()); await sleep(900);
    await click(page, 'button[data-tab="producers"]'); await sleep(500);
    await shot(page, '03-sect-producers');
    if (await click(page, 'button[data-tab="upgrades"]')) { await sleep(600); await shot(page, '04-sect-upgrades'); }
    if (await click(page, 'button[data-tab="sparks"]')) { await sleep(600); await shot(page, '05-sect-sparks'); }
  });

  // Journey
  await safe('journey', async () => {
    await page.evaluate(() => document.querySelectorAll('.nav-btn')[2]?.click()); await sleep(900);
    await shot(page, '06-journey');
  });

  // Top-up shop (IAP)
  await safe('topup', async () => {
    await navHome(page);
    if (await click(page, '.home-hud-blood-lotus')) { await sleep(1000); await shot(page, '07-shop-topup'); }
    await page.keyboard.press('Escape'); await sleep(400);
  });

  // Codex modal
  await safe('codex', async () => {
    await navHome(page);
    if (await click(page, '.home-hud-progress')) { await sleep(900); await shot(page, '08-codex'); }
    await page.keyboard.press('Escape'); await sleep(400);
  });

  // Realm variety (46 already unlocked everything, so lower realms add no toasts)
  await safe('home-t5', async () => { await navHome(page); await setRealm(page, 26); await shot(page, '09-home-t5-saint'); });
  await safe('home-t1', async () => { await setRealm(page, 10); await navHome(page); await shot(page, '10-home-t1'); });
  await safe('home-t0', async () => { await setRealm(page, 0); await navHome(page); await shot(page, '11-home-t0-start'); });

  // Screen-based features last (back to high realm first for unlocks)
  await setRealm(page, 46);
  await safe('bazaar', async () => {
    await navHome(page);
    if (await click(page, '.home-hud-lotus-shop')) { await sleep(900); await shot(page, '12-spirit-bazaar'); }
  });
  await safe('settings', async () => {
    await navHome(page);
    if (await click(page, '.home-hud-settings')) { await sleep(900); await shot(page, '13-settings'); }
  });
  await safe('reinc', async () => {
    await navHome(page);
    if (await click(page, '.home-hud-reinc')) { await sleep(900); await shot(page, '14-reincarnation'); }
    // Cancel the rite ("Hold the wheel") so we return to a normal, navigable screen.
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /hold the wheel/i.test(b.textContent || ''))?.click());
    await page.keyboard.press('Escape'); await sleep(700);
  });

  // Minigames: disciple (Sect Merge), herb garden (Spirit Garden), furnace
  // (Pill Refinement). DEV enables the .pdm-mg-enter button even on run 1.
  await safe('minigames', async () => {
    const games = [[0, '15-minigame-roster'], [1, '16-minigame-garden'], [2, '17-minigame-pills']];
    for (const [idx, name] of games) {
      await setRealm(page, 46);
      await page.evaluate(() => document.querySelectorAll('.nav-btn')[1]?.click()); await sleep(800);
      await click(page, 'button[data-tab="producers"]'); await sleep(500);
      const opened = await page.evaluate((i) => {
        const b = document.querySelectorAll('.pp-frame-btn')[i];
        if (b) { b.click(); return true; }
        return false;
      }, idx);
      if (!opened) { console.log('  no plaque', idx); continue; }
      await sleep(800);
      if (!(await click(page, '.pdm-mg-enter'))) { console.log('  no mg-enter', idx); await page.keyboard.press('Escape'); await sleep(300); continue; }
      await sleep(1700);
      await shot(page, name);
      await page.evaluate(() => document.querySelectorAll('.modal-close,[aria-label="Close"]').forEach((b) => { try { b.click(); } catch {} }));
      await page.keyboard.press('Escape'); await sleep(600);
    }
  });

  await browser.close();
  console.log('Done ->', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
