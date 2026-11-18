// F11: Tournament Management (Owner: Mim, Hard)
// /tournaments      -> list + create
// /tournaments/:id  -> registration, bracket, play matches
import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  cancelTournament, createTournament, getTournament, listTournaments, playBracketMatch,
  registerTournament, startTournament, unregisterTournament, walkover,
} from '../../api/tournamentApi';
import { getCategories } from '../../api/categoryApi';
import { getErrorMessage } from '../../api/client';
import { getSocket } from '../../socket/socket';
import { useAuth } from '../../context/AuthContext';

export default function Tournaments() {
  return (
    <Routes>
      <Route index element={<TournamentList />} />
      <Route path=":id" element={<TournamentDetail />} />
    </Routes>
  );
}

const STATUS_COLOR = { registration: 'info', ongoing: 'primary', finished: 'success', cancelled: 'secondary' };

function TournamentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', format: 'single', category: '', maxPlayers: 8, regDeadline: '', matchDeadlineHours: 24 });

  useEffect(() => {
    listTournaments().then(setItems).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const t = await createTournament({ ...form, regDeadline: new Date(form.regDeadline).toISOString() });
      navigate(`/tournaments/${t._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Tournaments</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : 'Create tournament'}</button>
      </div>
      {showForm && (
        <form className="card card-body mb-4" onSubmit={create}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row g-2">
            <div className="col-md-6"><input className="form-control" placeholder="Name" required value={form.name} onChange={set('name')} /></div>
            <div className="col-md-6">
              <select className="form-select" value={form.format} onChange={set('format')}>
                <option value="single">Single elimination</option>
                <option value="roundrobin">Round robin</option>
              </select>
            </div>
            <div className="col-12"><textarea className="form-control" placeholder="Description" value={form.description} onChange={set('description')} /></div>
            <div className="col-md-4">
              <label className="form-label small">Category</label>
              <select className="form-select" value={form.category} onChange={set('category')}>
                <option value="">Mixed</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Max players</label>
              <input type="number" min={2} max={32} className="form-control" value={form.maxPlayers} onChange={set('maxPlayers')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Registration closes</label>
              <input type="datetime-local" required className="form-control" value={form.regDeadline} onChange={set('regDeadline')} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Hours to play each match</label>
              <input type="number" min={1} max={168} className="form-control" value={form.matchDeadlineHours} onChange={set('matchDeadlineHours')} />
            </div>
          </div>
          <button className="btn btn-success mt-3">Create</button>
        </form>
      )}
      <div className="row g-3">
        {items.length === 0 && <p className="text-muted">No tournaments yet.</p>}
        {items.map((t) => (
          <div key={t._id} className="col-md-6 col-lg-4">
            <Link to={`/tournaments/${t._id}`} className="text-decoration-none text-dark">
              <div className="card h-100 feature-card shadow-sm">
                <div className="card-body">
                  <span className={`badge bg-${STATUS_COLOR[t.status]} mb-2`}>{t.status}</span>
                  <h5>{t.name}</h5>
                  <p className="small text-muted mb-1">
                    {t.format === 'single' ? 'Single elimination' : 'Round robin'} · {t.category ? t.category.name : 'Mixed'}
                  </p>
                  <p className="small mb-0">{t.participants.length}/{t.maxPlayers} players · by {t.organizer?.username}</p>
                  {t.champion && <p className="small mb-0 mt-1">🏆 {t.champion.username}</p>}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [t, setT] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => getTournament(id).then(setT).catch((err) => setError(getErrorMessage(err))), [id]);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onStarted = (d) => {
      if (d.tournamentId === id) setNotice(d);
    };
    socket.on('tournament:matchStarted', onStarted);
    return () => socket.off('tournament:matchStarted', onStarted);
  }, [id, load]);

  const run = (fn) => async () => {
    setError('');
    try {
      const res = await fn();
      if (res && res.matchId) navigate(`/battle/${res.matchId}`);
      else await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!t) return <div className="container py-5 text-center">{error || 'Loading...'}</div>;

  const me = String(user._id);
  const isOrganizer = String(t.organizer._id) === me;
  const registered = t.participants.some((p) => String(p.user) === me);
  const rounds = [...new Set(t.matches.map((m) => m.round))].sort((a, b) => a - b);
  const roundName = (r) => {
    if (t.format === 'roundrobin') return `Round ${r}`;
    const last = rounds[rounds.length - 1];
    if (r === last) return 'Final';
    if (r === last - 1) return 'Semi-finals';
    return `Round ${r}`;
  };

  return (
    <div className="container py-4">
      <Link to="/tournaments">← All tournaments</Link>
      <div className="d-flex justify-content-between align-items-start mt-2">
        <div>
          <h2 className="mb-0">{t.name}</h2>
          <p className="text-muted mb-1">
            {t.format === 'single' ? 'Single elimination' : 'Round robin'} · {t.category ? t.category.name : 'Mixed'} · organised by {t.organizer.username}
          </p>
          <span className={`badge bg-${STATUS_COLOR[t.status]}`}>{t.status}</span>
        </div>
        {t.champion && <div className="alert alert-success mb-0">🏆 Champion: <strong>{t.champion.username}</strong></div>}
      </div>
      {t.description && <p className="mt-3">{t.description}</p>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {notice && (
        <div className="alert alert-info mt-3">
          {notice.from} started your tournament match. <Link to={`/battle/${notice.matchId}`}>Join now</Link>
        </div>
      )}

      {t.status === 'registration' && (
        <div className="card card-body my-3">
          <p className="mb-2">Registration closes {new Date(t.regDeadline).toLocaleString()} · {t.participants.length}/{t.maxPlayers} players</p>
          <div className="d-flex gap-2 flex-wrap">
            {!registered && <button className="btn btn-success" onClick={run(() => registerTournament(id))}>Register</button>}
            {registered && <button className="btn btn-outline-secondary" onClick={run(() => unregisterTournament(id))}>Leave</button>}
            {isOrganizer && <button className="btn btn-primary" onClick={run(() => startTournament(id))}>Close registration &amp; generate bracket</button>}
            {isOrganizer && <button className="btn btn-outline-danger" onClick={run(() => cancelTournament(id))}>Cancel tournament</button>}
          </div>
        </div>
      )}

      <h5 className="mt-4">Players</h5>
      <p>{t.participants.map((p) => p.username).join(', ') || 'Nobody yet'}</p>

      {t.standings && (
        <>
          <h5>Standings</h5>
          <table className="table table-sm" style={{ maxWidth: 520 }}>
            <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
            <tbody>
              {t.standings.map((s, i) => (
                <tr key={s.userId}><td>{i + 1}</td><td>{s.username}</td><td>{s.played}</td><td>{s.wins}</td><td>{s.draws}</td><td>{s.losses}</td><td><strong>{s.points}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {t.matches.length > 0 && (
        <>
          <h5 className="mt-3">{t.format === 'single' ? 'Bracket' : 'Matches'}</h5>
          <div className="d-flex gap-3 overflow-auto pb-2">
            {rounds.map((r) => (
              <div key={r} style={{ minWidth: 240 }}>
                <h6 className="text-muted">{roundName(r)}</h6>
                {t.matches.filter((m) => m.round === r).map((m) => {
                  const mine = String(m.playerA) === me || String(m.playerB) === me;
                  const deadlinePassed = m.deadline && new Date(m.deadline) < new Date();
                  return (
                    <div key={m.index} className={`card mb-2 ${mine ? 'border-primary' : ''}`}>
                      <div className="card-body p-2 small">
                        {[['playerA', 'playerAName', 'scoreA'], ['playerB', 'playerBName', 'scoreB']].map(([idKey, nameKey, scoreKey]) => (
                          <div key={idKey} className={`d-flex justify-content-between ${m.winner && String(m.winner) === String(m[idKey]) ? 'fw-bold text-success' : ''}`}>
                            <span>{m[nameKey] || (m.isBye && idKey === 'playerB' ? 'bye' : 'TBD')}</span>
                            <span>{m[scoreKey] ?? ''}</span>
                          </div>
                        ))}
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="badge bg-light text-dark">{m.isBye ? 'bye' : m.isDraw ? 'draw' : m.status}</span>
                          {t.status === 'ongoing' && mine && ['ready', 'live'].includes(m.status) && (
                            <button className="btn btn-sm btn-primary py-0" onClick={run(() => playBracketMatch(id, m.index))}>
                              {m.status === 'live' ? 'Rejoin' : 'Play'}
                            </button>
                          )}
                        </div>
                        {t.status === 'ongoing' && ['ready', 'live'].includes(m.status) && (
                          <div className="mt-1">
                            {isOrganizer && (
                              <div className="d-flex gap-1">
                                <button className="btn btn-sm btn-outline-secondary py-0" onClick={run(() => walkover(id, m.index, m.playerA))}>{m.playerAName} wins</button>
                                <button className="btn btn-sm btn-outline-secondary py-0" onClick={run(() => walkover(id, m.index, m.playerB))}>{m.playerBName} wins</button>
                              </div>
                            )}
                            {!isOrganizer && mine && deadlinePassed && (
                              <button className="btn btn-sm btn-outline-warning py-0" onClick={run(() => walkover(id, m.index))}>Claim no-show win</button>
                            )}
                            {m.deadline && <div className="text-muted">Play by {new Date(m.deadline).toLocaleString()}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
