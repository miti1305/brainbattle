// F2: Skill-Based Matchmaking (Owner: Abrar, Medium)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueueStatus, joinQueue, leaveQueue } from '../../api/matchmakingApi';
import { getMyRating } from '../../api/leaderboardApi';
import { getCategories } from '../../api/categoryApi';
import { getErrorMessage } from '../../api/client';
import { getSocket } from '../../socket/socket';

export default function RankedQueue() {
  const navigate = useNavigate();
  const [rating, setRating] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [waited, setWaited] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getMyRating().then(setRating).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
    getQueueStatus()
      .then((s) => {
        if (s.inQueue) {
          setInQueue(true);
          setWaited(s.waitedSeconds);
        }
      })
      .catch(() => {});

    const socket = getSocket();
    const onFound = ({ matchId }) => navigate(`/battle/${matchId}`);
    const onTimeout = ({ message: m }) => {
      setInQueue(false);
      setMessage(m);
    };
    const onError = ({ message: m }) => {
      setInQueue(false);
      setMessage(m);
    };
    socket.on('matchmaking:found', onFound);
    socket.on('matchmaking:timeout', onTimeout);
    socket.on('matchmaking:error', onError);
    return () => {
      socket.off('matchmaking:found', onFound);
      socket.off('matchmaking:timeout', onTimeout);
      socket.off('matchmaking:error', onError);
    };
  }, [navigate]);

  useEffect(() => {
    if (!inQueue) return undefined;
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, [inQueue]);

  const join = async () => {
    setMessage('');
    try {
      const res = await joinQueue(categoryId || undefined);
      if (res.status === 'in_match') return navigate(`/battle/${res.matchId}`);
      setInQueue(true);
      setWaited(0);
    } catch (err) {
      setMessage(getErrorMessage(err));
    }
    return undefined;
  };

  const leave = async () => {
    await leaveQueue().catch(() => {});
    setInQueue(false);
  };

  // Same rule as the server: 100 + 50 every 10 s, max 600.
  const range = Math.min(600, 100 + 50 * Math.floor(waited / 10));

  return (
    <div className="container py-4" style={{ maxWidth: 560 }}>
      <h2>Ranked Battle</h2>
      {rating && (
        <div className="card card-body mb-3">
          <div className="d-flex justify-content-between">
            <span>Your rating</span>
            <strong>{rating.rating} <span className="badge bg-dark">{rating.tier}</span></strong>
          </div>
          <small className="text-muted">{rating.wins} wins · {rating.losses} losses · {rating.draws} draws</small>
        </div>
      )}
      {message && <div className="alert alert-warning">{message}</div>}

      {!inQueue ? (
        <>
          <label className="form-label">Category</label>
          <select className="form-select mb-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Any category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary w-100" onClick={join}>Find opponent</button>
        </>
      ) : (
        <div className="card card-body text-center">
          <div className="spinner-border mx-auto mb-3" />
          <h5>Searching for an opponent...</h5>
          <p className="mb-1">Waiting {waited}s</p>
          <p className="text-muted small">Looking for players within ±{range} rating</p>
          <button className="btn btn-outline-danger" onClick={leave}>Cancel</button>
        </div>
      )}
    </div>
  );
}
