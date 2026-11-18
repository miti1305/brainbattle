// F6: Interactive Puzzle Engine (Owner: Farin, Hard)
// /puzzles             -> start a new puzzle + my recent puzzles
// /puzzles/:attemptId  -> play
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { listMyPuzzles, newPuzzle } from '../../api/puzzleApi';
import { getErrorMessage } from '../../api/client';
import PuzzleBoard from '../../components/Puzzles/PuzzleBoard';

export default function Puzzles() {
  return (
    <Routes>
      <Route index element={<PuzzleHome />} />
      <Route path=":attemptId" element={<PuzzlePlay />} />
    </Routes>
  );
}

const TYPES = [
  ['sudoku', 'Sudoku', 'Fill the 9×9 grid so every row, column and box has 1-9.'],
  ['crossword', 'Crossword', 'Fill in the words from the clues.'],
  ['wordsearch', 'Word Search', 'Find all the hidden words in the grid.'],
];

function PuzzleHome() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState('medium');
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMyPuzzles().then(setAttempts).catch(() => {});
  }, []);

  const start = async (type) => {
    setError('');
    setBusy(true);
    try {
      const a = await newPuzzle(type, difficulty);
      navigate(`/puzzles/${a.attemptId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-4">
      <h2>Puzzles</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="btn-group mb-3">
        {['easy', 'medium', 'hard'].map((d) => (
          <button key={d} className={`btn btn-${difficulty === d ? 'primary' : 'outline-primary'} text-capitalize`} onClick={() => setDifficulty(d)}>{d}</button>
        ))}
      </div>
      <div className="row g-3 mb-4">
        {TYPES.map(([type, name, desc]) => (
          <div key={type} className="col-md-4">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h5>{name}</h5>
                <p className="text-muted small flex-grow-1">{desc}</p>
                <button className="btn btn-success" disabled={busy} onClick={() => start(type)}>New {difficulty} {name}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h5>My recent puzzles</h5>
      <table className="table table-sm">
        <thead><tr><th>Type</th><th>Difficulty</th><th>Status</th><th>Score</th><th>Hints</th><th /></tr></thead>
        <tbody>
          {attempts.length === 0 && <tr><td colSpan={6} className="text-muted">None yet.</td></tr>}
          {attempts.map((a) => (
            <tr key={a._id}>
              <td className="text-capitalize">{a.type}</td>
              <td className="text-capitalize">{a.difficulty}</td>
              <td>{a.solved ? '✅ solved' : a.gaveUp ? 'gave up' : 'in progress'}</td>
              <td>{a.solved ? a.score : '-'}</td>
              <td>{a.hintsUsed}</td>
              <td><Link to={`/puzzles/${a._id}`}>{a.solved || a.gaveUp ? 'View' : 'Continue'}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PuzzlePlay() {
  const { attemptId } = useParams();
  return (
    <div className="container py-4">
      <Link to="/puzzles">← Puzzles</Link>
      <div className="mt-3">
        <PuzzleBoard attemptId={attemptId} />
      </div>
    </div>
  );
}
