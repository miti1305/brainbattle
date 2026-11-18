import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="container py-5 text-center">
      <h1 className="display-5 fw-bold">BrainBattle</h1>
      <p className="lead text-muted">Social puzzles, quizzes and live competitions.</p>
      {user ? (
        <Link className="btn btn-primary btn-lg" to="/dashboard">Go to dashboard</Link>
      ) : (
        <div className="d-flex gap-2 justify-content-center">
          <Link className="btn btn-primary btn-lg" to="/register">Create account</Link>
          <Link className="btn btn-outline-secondary btn-lg" to="/login">Log in</Link>
        </div>
      )}
    </div>
  );
}
