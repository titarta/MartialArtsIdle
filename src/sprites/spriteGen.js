/**
 * spriteGen.js — generates pixel-art martial artist sprite sheets at runtime
 * using the Canvas API. Results are cached as data URLs.
 *
 * Each frame is 32×40 px (displayed at 3× → 96×120 CSS px).
 * Sheet layout: all frames in a single horizontal strip.
 */

const FW = 32;   // frame width  (native px)
const FH = 40;   // frame height (native px)

// ── Palettes ─────────────────────────────────────────────────────────────────

const PLAYER = {
  hair: '#110a04',
  skin: '#d49060',
  gi:   '#2c4a8c',   // blue gi
  giL:  '#4266b5',   // gi highlight (lapel centre)
  giD:  '#16284a',   // gi shadow (lapels)
  belt: '#c8a020',
  pant: '#16284a',
  foot: '#161616',
};

const ENEMY = {
  hair: '#110a04',
  skin: '#d49060',
  gi:   '#8c2c2c',   // red gi
  giL:  '#b54444',
  giD:  '#481010',
  belt: '#c8a020',
  pant: '#481010',
  foot: '#161616',
};

// ── Low-level rect helper ─────────────────────────────────────────────────────

function r(ctx, col, x, y, w, h) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, h);
}

// ── Character drawing ────────────────────────────────────────────────────────
//
// All characters face RIGHT. The enemy is flipped via CSS scaleX(-1).
// xo / yo are frame-level offsets used for body-lean and breathing.
// pose: 'guard' | 'windup' | 'strike'

function drawChar(ctx, P, xo, yo, pose) {
  // ── Head ────────────────────────────────────────────────────────────────
  r(ctx, P.hair, 12+xo,  0+yo,  8, 2);   // hair top
  r(ctx, P.hair, 11+xo,  1+yo, 10, 2);   // hair wider
  r(ctx, P.skin, 11+xo,  2+yo, 10, 8);   // face
  // eyes (2×2 each)
  r(ctx, P.hair, 13+xo,  5+yo,  2, 2);
  r(ctx, P.hair, 17+xo,  5+yo,  2, 2);

  // ── Neck ────────────────────────────────────────────────────────────────
  r(ctx, P.skin, 14+xo, 10+yo,  4, 2);

  // ── Gi upper body ───────────────────────────────────────────────────────
  r(ctx, P.gi,  10+xo, 12+yo, 12, 10);   // torso
  r(ctx, P.giL, 14+xo, 12+yo,  4,  5);   // centre crease highlight
  r(ctx, P.giD, 10+xo, 12+yo,  2, 10);   // left lapel (dark)
  r(ctx, P.giD, 20+xo, 12+yo,  2, 10);   // right lapel

  // ── Belt ────────────────────────────────────────────────────────────────
  r(ctx, P.belt, 10+xo, 22+yo, 12, 2);

  // ── Pants / hips ────────────────────────────────────────────────────────
  r(ctx, P.pant, 10+xo, 24+yo, 12, 6);

  // ── Legs (gap between them) ──────────────────────────────────────────────
  r(ctx, P.pant, 10+xo, 30+yo,  5, 8);   // left leg
  r(ctx, P.pant, 17+xo, 30+yo,  5, 8);   // right leg

  // ── Feet ────────────────────────────────────────────────────────────────
  r(ctx, P.foot,  8+xo, 38+yo,  8, 2);   // left foot (wider than leg)
  r(ctx, P.foot, 16+xo, 38+yo,  8, 2);   // right foot

  // ── Arms (depend on pose) ────────────────────────────────────────────────
  switch (pose) {
    case 'guard':
      // Lead (left) arm forward — extended toward left edge
      r(ctx, P.gi,    4+xo, 15+yo, 6, 6);
      r(ctx, P.skin,  2+xo, 16+yo, 4, 5);   // left fist
      // Power (right) arm in high guard
      r(ctx, P.gi,   22+xo, 13+yo, 6, 6);
      r(ctx, P.skin, 24+xo, 12+yo, 5, 5);   // right fist up
      break;

    case 'windup':
      // Lead arm still forward (jab guard)
      r(ctx, P.gi,    3+xo, 14+yo, 7, 6);
      r(ctx, P.skin,  1+xo, 15+yo, 4, 5);
      // Power arm cocked high — fist near ear, elbow back
      r(ctx, P.gi,   21+xo,  9+yo, 5, 7);
      r(ctx, P.skin, 22+xo,  6+yo, 5, 5);   // fist up near head
      break;

    case 'strike':
      // Power arm FULLY extended right (toward enemy)
      r(ctx, P.gi,   22+xo, 14+yo, 8, 5);
      r(ctx, P.skin, 27+xo, 13+yo, 5, 5);   // fist at far right
      // Lead arm pulls back
      r(ctx, P.gi,   10+xo, 15+yo, 5, 5);
      r(ctx, P.skin,  8+xo, 15+yo, 4, 4);
      break;

    default: break;
  }
}

// ── Sheet factory ─────────────────────────────────────────────────────────────

function makeSheet(frameCount, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width  = FW * frameCount;
  canvas.height = FH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let f = 0; f < frameCount; f++) {
    ctx.save();
    ctx.translate(f * FW, 0);
    ctx.clearRect(0, 0, FW, FH);
    drawFn(ctx, f);
    ctx.restore();
  }
  return canvas.toDataURL();
}

// ── Public API ────────────────────────────────────────────────────────────────

let _cache = null;

export function getSprites() {
  if (_cache) return _cache;

  // Idle: 4 frames — guard stance with subtle breathing (y shifts on odd frames)
  const makeIdle = (pal) => makeSheet(4, (ctx, f) => {
    const yo = (f === 1 || f === 3) ? -1 : 0;
    drawChar(ctx, pal, 0, yo, 'guard');
  });

  // Attack: 4 frames — wind-up → lunge → full strike → snap back
  const makeAttack = (pal) => makeSheet(4, (ctx, f) => {
    if (f === 0)      drawChar(ctx, pal, -1,  0, 'windup');  // cock arm back
    else if (f === 1) drawChar(ctx, pal,  1, -1, 'windup');  // lean forward
    else if (f === 2) drawChar(ctx, pal,  2,  0, 'strike');  // fist extended
    else              drawChar(ctx, pal,  0,  0, 'guard');   // snap back
  });

  _cache = {
    playerIdle:   makeIdle(PLAYER),
    playerAttack: makeAttack(PLAYER),
    enemyIdle:    makeIdle(ENEMY),
    enemyAttack:  makeAttack(ENEMY),
  };
  return _cache;
}

export { FW, FH };
