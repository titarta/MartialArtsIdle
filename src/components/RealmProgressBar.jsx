/**
 * Vertical progress bar showing cultivation progress.
 * Current realm at bottom, next realm at top.
 */

function formatQi(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function RealmProgressBar({ progress, currentRealm, nextRealm, qi, cost, boosting }) {
  const percent = Math.min(progress * 100, 100);

  return (
    <div className="realm-bar">
      <div className="realm-label realm-next">{nextRealm}</div>
      <div className="realm-track">
        <div
          className={`realm-fill ${boosting ? 'realm-fill-boosted' : ''}`}
          style={{ height: `${percent}%` }}
        />
        <div className="realm-qi-label">
          {formatQi(qi)} / {formatQi(cost)}
        </div>
      </div>
      <div className="realm-label realm-current">{currentRealm}</div>
    </div>
  );
}

export default RealmProgressBar;
