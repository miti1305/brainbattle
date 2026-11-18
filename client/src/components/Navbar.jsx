import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { getSocket } from '../socket/socket';

const MAIN_LINKS = [
  ['/practice', 'Practice'],
  ['/ranked', 'Ranked'],
  ['/puzzles', 'Puzzles'],
  ['/daily', 'Daily'],
  ['/tournaments', 'Tournaments'],
  ['/leaderboards', 'Leaderboards'],
  ['/friends', 'Friends'],
  ['/feed', 'Feed'],
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Unread notification count (F20). Fails silently until F20 is merged.
  useEffect(() => {
    if (!user) return undefined;
    const load = () => api.get('/notifications/unread-count').then((r) => setUnread(r.data.count || 0)).catch(() => {});
    load();
    const socket = getSocket();
    const onNew = () => setUnread((n) => n + 1);
    socket.on('notification:new', onNew);
    window.addEventListener('notifications:changed', load);
    return () => {
      socket.off('notification:new', onNew);
      window.removeEventListener('notifications:changed', load);
    };
  }, [user]);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">BrainBattle</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          {user && (
            <ul className="navbar-nav me-auto">
              {MAIN_LINKS.map(([to, label]) => (
                <li className="nav-item" key={to}>
                  <NavLink className="nav-link" to={to}>{label}</NavLink>
                </li>
              ))}
              {['moderator', 'admin'].includes(user.role) && (
                <li className="nav-item"><NavLink className="nav-link" to="/moderation">Moderation</NavLink></li>
              )}
              {user.role === 'admin' && (
                <li className="nav-item"><NavLink className="nav-link" to="/admin">Admin</NavLink></li>
              )}
            </ul>
          )}
          <div className="ms-auto d-flex gap-2 align-items-center">
            {user ? (
              <>
                <NavLink className="btn btn-sm btn-outline-light position-relative" to="/notifications">
                  Notifications
                  {unread > 0 && <span className="badge rounded-pill bg-danger ms-1">{unread}</span>}
                </NavLink>
                <span className="text-light small">{user.username} ({user.role})</span>
                <button className="btn btn-sm btn-warning" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
              </>
            ) : (
              <>
                <NavLink className="btn btn-sm btn-outline-light" to="/login">Log in</NavLink>
                <NavLink className="btn btn-sm btn-warning" to="/register">Sign up</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
