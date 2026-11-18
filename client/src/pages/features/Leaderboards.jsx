// F3: Ranked Rating & Leaderboards (Owner: Abrar, Medium)
import { useEffect, useState } from 'react';
import { getLeaderboard } from '../../api/leaderboardApi';
import { getCategories } from '../../api/categoryApi';
import { getErrorMessage } from '../../api/client';

const TABS = [
  ['global', 'Global'],
  ['weekly', 'This week'],
  ['category', 'By category'],
  ['friends', 'Friends'],
];

export default function Leaderboards() {
  const [type, setType] = useState('global');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories()
      .then((cs) => {
        setCategories(cs);
        if (cs[0]) setCategory(cs[0]._id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (type === 'category' && !category) return;
    setError('');
    getLeaderboard(type, type === 'category' ? category : undefined)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, [type, category]);

  const valueLabel = type === 'weekly' ? 'Weekly points' : type === 'category' ? 'Points' : 'Rating';

  return (
    <div className="container py-4">
      <h2>Leaderboards</h2>
      <ul className="nav nav-tabs mb-3">
        {TABS.map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button className={`nav-link ${type === key ? 'active' : ''}`} onClick={() => setType(key)}>{label}</button>
          </li>
        ))}
      </ul>
      {type === 'category' && (
        <select className="form-select mb-3" style={{ maxWidth: 300 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {data && (
        <>
          {data.me && (
            <div className="alert alert-primary py-2">
              Your rank: <strong>#{data.me.rank}</strong> · {valueLabel}: <strong>{data.me.value}</strong>
            </div>
          )}
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                {type !== 'category' && <th>Tier</th>}
                <th>Wins</th>
                <th className="text-end">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 && (
                <tr><td colSpan={5} className="text-muted">No players yet.</td></tr>
              )}
              {data.entries.map((e) => (
                <tr key={e.userId} className={data.me && String(data.me.userId) === String(e.userId) ? 'table-primary' : ''}>
                  <td>{e.rank}</td>
                  <td>{e.username}</td>
                  {type !== 'category' && <td><span className="badge bg-dark">{e.tier}</span></td>}
                  <td>{e.wins}</td>
                  <td className="text-end fw-bold">{e.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
