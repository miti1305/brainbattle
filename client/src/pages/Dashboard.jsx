// Lists every feature grouped by owner, so the team can open each page during development.
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FEATURES, MEMBERS } from '../features';

const LEVEL_COLOR = { Hard: 'danger', Medium: 'warning', Easy: 'success' };

export default function Dashboard() {
  const { user } = useAuth();
  const canSee = (f) => !f.roles || f.roles.includes(user.role);

  return (
    <div className="container py-4">
      <h2 className="mb-1">Welcome, {user.username}</h2>
      <p className="text-muted">Pick a feature to open it.</p>
      {MEMBERS.map((m) => (
        <div key={m} className="mb-4">
          <h5 className="border-bottom pb-1">{m}</h5>
          <div className="row g-3">
            {FEATURES.filter((f) => f.owner === m && canSee(f)).map((f) => (
              <div className="col-md-6 col-lg-4" key={f.id}>
                <Link to={f.path} className="text-decoration-none">
                  <div className="card feature-card h-100 shadow-sm">
                    <div className="card-body">
                      <span className="badge bg-secondary me-2">{f.id}</span>
                      <span className={`badge bg-${LEVEL_COLOR[f.level]}`}>{f.level}</span>
                      <h6 className="mt-2 mb-0 text-dark">{f.name}</h6>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
