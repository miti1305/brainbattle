// F12: Friends & Social Connections (Owner: Mim, Medium)
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  acceptRequest, blockUser, challengeFriend, declineRequest, getBlocked, getFriends, getRequests,
  getSuggestions, removeFriend, searchUsers, sendRequest, unblockUser,
} from '../../api/friendApi';
import { getErrorMessage } from '../../api/client';
import { getSocket } from '../../socket/socket';

const TABS = ['friends', 'requests', 'add', 'blocked'];

export default function Friends() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [blocked, setBlocked] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState(null); // { type, text }
  const [challenge, setChallenge] = useState(null);

  const load = useCallback(() => {
    getFriends().then(setFriends).catch(() => {});
    getRequests().then(setRequests).catch(() => {});
    getBlocked().then(setBlocked).catch(() => {});
    getSuggestions().then(setSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onChallenge = (c) => setChallenge(c);
    socket.on('friend:challenge', onChallenge);
    const t = setInterval(() => getFriends().then(setFriends).catch(() => {}), 15000); // refresh online status
    return () => {
      socket.off('friend:challenge', onChallenge);
      clearInterval(t);
    };
  }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(() => searchUsers(query).then(setResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [query]);

  const run = (fn, success) => async () => {
    try {
      await fn();
      if (success) setMessage({ type: 'success', text: success });
      load();
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const challengeUser = async (userId) => {
    try {
      const { roomCode } = await challengeFriend(userId);
      navigate(`/rooms/${roomCode}`);
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <h2>Friends</h2>
      {challenge && (
        <div className="alert alert-info">
          <strong>{challenge.from}</strong> challenged you! <Link to={`/rooms/${challenge.roomCode}`}>Join room {challenge.roomCode}</Link>
        </div>
      )}
      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t}>
            <button className={`nav-link text-capitalize ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
              {t === 'requests' && requests.incoming.length > 0 && <span className="badge bg-danger ms-1">{requests.incoming.length}</span>}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'friends' && (
        <ul className="list-group">
          {friends.length === 0 && <li className="list-group-item text-muted">No friends yet. Add some from the "add" tab.</li>}
          {friends.map((f) => (
            <li key={f.userId} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                <span className={`d-inline-block rounded-circle me-2 bg-${f.online ? 'success' : 'secondary'}`} style={{ width: 10, height: 10 }} />
                {f.username} <small className="text-muted">{f.online ? 'online' : 'offline'}</small>
              </span>
              <span className="d-flex gap-1">
                <button className="btn btn-sm btn-primary" onClick={() => challengeUser(f.userId)}>Challenge</button>
                <Link className="btn btn-sm btn-outline-secondary" to={`/analytics/${f.userId}`}>Stats</Link>
                <button className="btn btn-sm btn-outline-danger" onClick={run(() => removeFriend(f.userId), 'Friend removed')}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'requests' && (
        <>
          <h6>Incoming</h6>
          <ul className="list-group mb-3">
            {requests.incoming.length === 0 && <li className="list-group-item text-muted">No requests.</li>}
            {requests.incoming.map((r) => (
              <li key={r._id} className="list-group-item d-flex justify-content-between">
                {r.username}
                <span className="d-flex gap-1">
                  <button className="btn btn-sm btn-success" onClick={run(() => acceptRequest(r._id), `You and ${r.username} are now friends`)}>Accept</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={run(() => declineRequest(r._id))}>Decline</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={run(() => blockUser(r.userId), 'User blocked')}>Block</button>
                </span>
              </li>
            ))}
          </ul>
          <h6>Sent</h6>
          <ul className="list-group">
            {requests.outgoing.length === 0 && <li className="list-group-item text-muted">No pending requests.</li>}
            {requests.outgoing.map((r) => (
              <li key={r._id} className="list-group-item d-flex justify-content-between">
                {r.username}
                <button className="btn btn-sm btn-outline-secondary" onClick={run(() => declineRequest(r._id))}>Cancel</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'add' && (
        <>
          <input className="form-control mb-2" placeholder="Search by username" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="list-group mb-4">
            {results.map((u) => (
              <li key={u.userId} className="list-group-item d-flex justify-content-between">
                {u.username}
                <button className="btn btn-sm btn-primary" onClick={run(() => sendRequest(u.username), 'Request sent')}>Add friend</button>
              </li>
            ))}
          </ul>
          <h6>Suggestions</h6>
          <ul className="list-group">
            {suggestions.map((s) => (
              <li key={s.userId} className="list-group-item d-flex justify-content-between">
                <span>{s.username} {s.mutualFriends > 0 && <small className="text-muted">· {s.mutualFriends} mutual</small>}</span>
                <button className="btn btn-sm btn-outline-primary" onClick={run(() => sendRequest(s.username), 'Request sent')}>Add</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'blocked' && (
        <ul className="list-group">
          {blocked.length === 0 && <li className="list-group-item text-muted">You have not blocked anyone.</li>}
          {blocked.map((b) => (
            <li key={b.userId} className="list-group-item d-flex justify-content-between">
              {b.username}
              <button className="btn btn-sm btn-outline-secondary" onClick={run(() => unblockUser(b.userId), 'Unblocked')}>Unblock</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
