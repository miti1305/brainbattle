// F1 (Abrar): live scores of all players.
export default function Scoreboard({ players, meId, showAnswered = false }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ul className="list-group">
      {sorted.map((p) => (
        <li key={p.user} className={`list-group-item d-flex justify-content-between align-items-center ${String(p.user) === String(meId) ? 'list-group-item-primary' : ''}`}>
          <span>
            {p.username}
            {p.forfeited && <span className="badge bg-danger ms-2">left</span>}
            {!p.forfeited && !p.connected && <span className="badge bg-secondary ms-2">offline</span>}
            {showAnswered && p.answeredCurrent && <span className="badge bg-info ms-2">answered</span>}
            {p.result && <span className={`badge ms-2 bg-${p.result === 'win' ? 'success' : p.result === 'draw' ? 'warning' : 'secondary'}`}>{p.result}</span>}
          </span>
          <strong>{p.score}</strong>
        </li>
      ))}
    </ul>
  );
}
