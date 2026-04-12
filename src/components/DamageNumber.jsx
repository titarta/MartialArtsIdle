import { getDigitSheet, DW, DH } from '../sprites/digitGen';

const SUFFIXES = [
  [1_000_000_000_000_000, 'Q'],
  [1_000_000_000_000,     'T'],
  [1_000_000_000,         'B'],
  [1_000_000,             'M'],
  [1_000,                 'K'],
];

// n >= 10 → no decimal ("42M"), n < 10 → one decimal ("1.2M")
function abbreviate(value) {
  for (const [threshold, suffix] of SUFFIXES) {
    if (value >= threshold) {
      const n = value / threshold;
      return (n >= 10 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, '')) + suffix;
    }
  }
  return null;
}

// Scale range: 2.0 (tiny hits) → 4.0 (massive hits), log-based
function getScale(dmg) {
  return Math.min(4.0, 2.0 + Math.log10(Math.max(1, dmg)) * 0.4);
}

/**
 * DamageNumber — renders a single damage value as pixel-art digit sprites,
 * or abbreviated suffix text (K/M/B/T/Q) for values ≥ 10,000.
 *
 * Props:
 *   value  — integer damage value
 *   color  — 'gold' (player deals damage) | 'red' (player takes damage)
 *   style  — positioning styles (left, top) applied to the wrapper div
 */
export default function DamageNumber({ value, color = 'gold', style }) {
  const scale  = getScale(value);
  const abbrev = value >= 10_000 ? abbreviate(value) : null;

  if (abbrev) {
    return (
      <div
        className={`damage-number damage-number-${color}`}
        style={{
          ...style,
          fontSize:    DH * scale,
          fontFamily:  'monospace',
          fontWeight:  'bold',
          lineHeight:  1,
        }}
      >
        {abbrev}
      </div>
    );
  }

  // Raw pixel art digit sprites for values < 10,000
  const sheet  = getDigitSheet();
  const digits = String(value).split('').map(Number);
  const slotW  = DW * scale;
  const slotH  = DH * scale;

  return (
    <div className={`damage-number damage-number-${color}`} style={style}>
      {digits.map((d, i) => (
        <div
          key={i}
          style={{
            display:            'inline-block',
            width:              slotW,
            height:             slotH,
            backgroundImage:    `url(${sheet})`,
            backgroundPosition: `-${d * slotW}px 0px`,
            backgroundSize:     `${DW * 10 * scale}px ${slotH}px`,
            backgroundRepeat:   'no-repeat',
            imageRendering:     'pixelated',
          }}
        />
      ))}
    </div>
  );
}
