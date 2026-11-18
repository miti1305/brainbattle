// F13: Clans / Study Groups (Owner: Mim, Medium)
// /clans      -> my clan, browse, create
// /clans/:id  -> members leaderboard, roles, challenges
import { useCallback, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  addChallenge, createClan, getClan, getMyClan, joinClan, leaveClan, listClans,
  removeChallenge, removeMember, setMemberRole, transferOwnership,
} from '../../api/clanApi';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function Clans() {
  return (
    <Routes>
      <Route index element={<ClanList />} />
      <Route path=":id" element={<ClanDetail />} />
    </Routes>
  );
}

function ClanList() {
  const navigate = useNavigate();
  const [clans, setClans] = useState([]);
  const [mine, setMine] = useState(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', description: '', memberCap: 20 });
  const [error, setError] = useState('');

  useEffect(() => {
    getMyClan().then(setMine).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(() => listClans(q).then(setClans).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const clan = await createClan(form);
      navigate(`/clans/${clan._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container py-4">
      <h2>Clans &amp; Study Groups</h2>
      {mine ? (
        <div className="alert alert-primary">Your clan: <Link to={`/clans/${mine._id}`}>{mine.name}</Link></div>
      ) : (
        <form className="card card-body mb-4" onSubmit={create}>
          <h5>Create a clan</h5>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row g-2">
            <div className="col-md-4"><input className="form-control" placeholder="Clan name" required minLength={3} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-md-6"><input className="form-control" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="col-md-2"><input type="number" min={2} max={50} className="form-control" title="Member cap" value={form.memberCap} onChange={(e) => setForm({ ...form, memberCap: e.target.value })} /></div>
          </div>
          <button className="btn btn-success mt-2">Create</button>
        </form>
      )}
      <input className="form-control mb-3" placeholder="Search clans" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list-group">
        {clans.map((c) => (
          <Link key={c._id} to={`/clans/${c._id}`} className="list-group-item list-group-item-action d-flex justify-content-between">
            <span><strong>{c.name}</strong> <small className="text-muted">{c.description}</small></span>
            <span className="badge bg-secondary">{c.memberCount}/{c.memberCap}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ClanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState({ title: '', description: '', endsAt: '' });

  const load = useCallback(() => getClan(id).then(setData).catch((err) => setError(getErrorMessage(err))), [id]);
  useEffect(() => {
    load();
  }, [load]);

  const run = (fn) => async () => {
    setError('');
    try {
      const res = await fn();
      if (res && res.deleted) return navigate('/clans');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
    return undefined;
  };

  if (!data) return <div className="container py-5 text-center">{error || 'Loading...'}</div>;
  const { clan, leaderboard, score, myRole } = data;
  const me = String(user._id);
  const canManage = myRole === 'owner' || myRole === 'admin';

  return (
    <div className="container py-4">
      <Link to="/clans">← All clans</Link>
      <div className="d-flex justify-content-between align-items-start mt-2">
        <div>
          <h2 className="mb-0">{clan.name}</h2>
          <p className="text-muted">{clan.description}</p>
        </div>
        <div className="text-end">
          <div className="fs-4 fw-bold">{score}</div>
          <small className="text-muted">clan score</small>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="mb-3">
        {!myRole && <button className="btn btn-success" onClick={run(() => joinClan(id))}>Join ({clan.members.length}/{clan.memberCap})</button>}
        {myRole && <button className="btn btn-outline-secondary" onClick={run(() => window.confirm('Leave this clan?') && leaveClan(id))}>Leave clan</button>}
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <h5>Members</h5>
          <table className="table align-middle">
            <thead><tr><th>#</th><th>Member</th><th>Role</th><th>Rating</th><th>Points</th><th /></tr></thead>
            <tbody>
              {leaderboard.map((m, i) => (
                <tr key={m.userId}>
                  <td>{i + 1}</td>
                  <td>{m.username}</td>
                  <td><span className="badge bg-secondary">{m.role}</span></td>
                  <td>{m.rating} <small className="text-muted">{m.tier}</small></td>
                  <td>{m.points}</td>
                  <td className="text-end">
                    {String(m.userId) !== me && myRole === 'owner' && (
                      <span className="d-inline-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary py-0" onClick={run(() => setMemberRole(id, m.userId, m.role === 'admin' ? 'member' : 'admin'))}>
                          {m.role === 'admin' ? 'Make member' : 'Make admin'}
                        </button>
                        <button className="btn btn-sm btn-outline-warning py-0" onClick={run(() => window.confirm(`Make ${m.username} the owner?`) && transferOwnership(id, m.userId))}>Make owner</button>
                      </span>
                    )}
                    {String(m.userId) !== me && ((myRole === 'owner' && m.role !== 'owner') || (myRole === 'admin' && m.role === 'member')) && (
                      <button className="btn btn-sm btn-outline-danger py-0 ms-1" onClick={run(() => removeMember(id, m.userId))}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-lg-5">
          <h5>Group challenges</h5>
          {canManage && (
            <form
              className="card card-body mb-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await addChallenge(id, challenge);
                  setChallenge({ title: '', description: '', endsAt: '' });
                })();
              }}
            >
              <input className="form-control mb-2" placeholder="Title (e.g. Everyone solves 3 hard puzzles)" required value={challenge.title} onChange={(e) => setChallenge({ ...challenge, title: e.target.value })} />
              <textarea className="form-control mb-2" placeholder="Details" value={challenge.description} onChange={(e) => setChallenge({ ...challenge, description: e.target.value })} />
              <input type="date" className="form-control mb-2" value={challenge.endsAt} onChange={(e) => setChallenge({ ...challenge, endsAt: e.target.value })} />
              <button className="btn btn-primary btn-sm">Post challenge</button>
            </form>
          )}
          {clan.challenges.length === 0 && <p className="text-muted">No challenges yet.</p>}
          {clan.challenges.map((c) => (
            <div key={c._id} className="card mb-2">
              <div className="card-body py-2">
                <div className="d-flex justify-content-between">
                  <strong>{c.title}</strong>
                  {canManage && <button className="btn btn-sm btn-link text-danger p-0" onClick={run(() => removeChallenge(id, c._id))}>Delete</button>}
                </div>
                {c.description && <div className="small">{c.description}</div>}
                {c.endsAt && <small className="text-muted">Ends {new Date(c.endsAt).toLocaleDateString()}</small>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
