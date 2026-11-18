// SHARED component (F1 Battle, F4 Rooms, F7 Daily, F19 Practice).
// <Timer seconds={20} onExpire={handleTimeUp} resetKey={questionIndex} />
import { useEffect, useState } from 'react';

export default function Timer({ seconds, onExpire, resetKey, paused = false }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => setLeft(seconds), [seconds, resetKey]);

  useEffect(() => {
    if (paused) return undefined;
    if (left <= 0) {
      onExpire?.();
      return undefined;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, paused]);

  const pct = Math.max(0, (left / seconds) * 100);
  const color = pct > 50 ? 'bg-success' : pct > 20 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span>Time left</span>
        <strong>{left}s</strong>
      </div>
      <div className="progress" style={{ height: 8 }}>
        <div className={`progress-bar ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
