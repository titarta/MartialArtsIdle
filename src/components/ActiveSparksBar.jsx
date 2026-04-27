import { useState, useEffect } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY } from '../data/qiSparks';

/**
 * ActiveSparksBar — small chip per currently-active Qi Spark, shown in the
 * home screen's top-left chip stack so the player always sees what they
 * picked. Updates once per second to tick the countdown for timed sparks.
 */
function ActiveSparksBar({ activeSparks }) {
  // Force a re-render every second so countdowns track real time.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activeSparks || activeSparks.length === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSparks?.length]);

  if (!activeSparks || activeSparks.length === 0) return null;

  return (
    <div className="active-sparks-bar">
      {activeSparks.map((s) => {
        const card = QI_SPARK_BY_ID[s.sparkId];
        if (!card) return null;
        const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;

        let suffix = '';
        if (s.expiresAt) {
          const remainingMs = Math.max(0, s.expiresAt - Date.now());
          suffix = `${Math.ceil(remainingMs / 1000)}s`;
        } else if (s.breakthroughsRemaining != null) {
          suffix = `${s.breakthroughsRemaining}×`;
        } else if (card.kind === 'next_breakthrough_flag') {
          suffix = 'next';
        }

        return (
          <div
            key={s.instanceId}
            className="active-spark-chip"
            style={{ '--rarity-color': rarity.color }}
            title={card.description}
          >
            <span className="active-spark-dot" style={{ background: rarity.color }} />
            <span className="active-spark-name">{card.name}</span>
            {suffix && <span className="active-spark-suffix">{suffix}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default ActiveSparksBar;
