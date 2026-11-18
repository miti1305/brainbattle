// F6 (Farin): plays one puzzle attempt (sudoku, crossword or word search). Used by F6 and F7 pages.
// <PuzzleBoard attemptId={id} onSolved={(result) => ...} />
import { useCallback, useEffect, useState } from 'react';
import { checkPuzzle, getAttempt, giveUp, makeMove, requestHint } from '../../api/puzzleApi';
import { getErrorMessage } from '../../api/client';

const key = (r, c) => `${r},${c}`;

function lineCells(a, b) {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  const straight = a[0] === b[0] || a[1] === b[1] || Math.abs(b[0] - a[0]) === Math.abs(b[1] - a[1]);
  if (!straight) return null;
  return Array.from({ length: len + 1 }, (_, i) => [a[0] + dr * i, a[1] + dc * i]);
}

export default function PuzzleBoard({ attemptId, onSolved }) {
  const [att, setAtt] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }
  const [conflicts, setConflicts] = useState(new Set());
  const [start, setStart] = useState(null); // word search first click
  const [found, setFound] = useState([]); // [{ word, cells }]
  const [hintCell, setHintCell] = useState(null);
  const [solution, setSolution] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const load = useCallback(async () => {
    try {
      const a = await getAttempt(attemptId);
      setAtt(a);
      setFound(a.foundCells || []);
      if (a.solution) setSolution(a.solution);
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const finished = att && (att.solved || att.gaveUp);

  useEffect(() => {
    if (!att || finished) return undefined;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(att.startedAt).getTime()) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [att, finished]);

  const setCell = async (r, c, value) => {
    // Optimistic update so typing feels instant; the server saves and validates.
    setAtt((a) => {
      const grid = a.state.grid.map((row) => [...row]);
      grid[r][c] = a.type === 'sudoku' ? Number(value) || 0 : value.toUpperCase();
      return { ...a, state: { ...a.state, grid } };
    });
    try {
      const res = await makeMove(attemptId, { row: r, col: c, value });
      setAtt((a) => ({ ...a, state: res.state }));
      const next = new Set(conflicts);
      next.delete(key(r, c));
      (res.conflicts || []).forEach(([rr, cc]) => next.add(key(rr, cc)));
      if (res.conflicts && res.conflicts.length) next.add(key(r, c));
      setConflicts(next);
      setMessage(res.valid ? null : { type: 'warning', text: res.message || 'Invalid move' });
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const clickLetter = async (r, c) => {
    if (finished) return;
    if (!start) {
      setStart([r, c]);
      return;
    }
    const cells = lineCells(start, [r, c]);
    setStart(null);
    if (!cells || cells.length < 2) {
      setMessage({ type: 'warning', text: 'Select the first and last letter of a word in a straight line' });
      return;
    }
    try {
      const res = await makeMove(attemptId, { cells });
      setAtt((a) => ({ ...a, state: res.state }));
      if (res.valid) {
        setFound((f) => [...f, { word: res.word, cells: res.cells }]);
        setMessage({ type: 'success', text: `Found ${res.word}!` });
      } else {
        setMessage({ type: 'warning', text: res.message });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const hint = async () => {
    try {
      const res = await requestHint(attemptId);
      setAtt((a) => ({ ...a, state: res.state, hintsUsed: res.hintsUsed }));
      if (res.hint.word) {
        setHintCell(key(res.hint.cell[0], res.hint.cell[1]));
        setMessage({ type: 'info', text: `${res.hint.word} starts at the highlighted letter` });
      } else {
        setHintCell(key(res.hint.row, res.hint.col));
        setMessage({ type: 'info', text: 'One cell has been filled in for you' });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const check = async () => {
    try {
      const res = await checkPuzzle(attemptId);
      if (res.solved) {
        setAtt((a) => ({ ...a, solved: true, score: res.score }));
        setMessage({ type: 'success', text: `Solved! Score: ${res.score}${res.streak ? ` · Daily streak: ${res.streak.current} 🔥` : ''}` });
        onSolved?.(res);
      } else {
        setMessage({ type: 'warning', text: res.message });
      }
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  const surrender = async () => {
    if (!window.confirm('Give up and see the solution?')) return;
    try {
      const res = await giveUp(attemptId);
      setSolution(res.solution);
      setAtt((a) => ({ ...a, gaveUp: true }));
    } catch (err) {
      setMessage({ type: 'danger', text: getErrorMessage(err) });
    }
  };

  if (!att) return <div className="text-center py-4">{message ? message.text : 'Loading puzzle...'}</div>;

  const foundKeys = new Set(found.flatMap((f) => f.cells.map(([r, c]) => key(r, c))));
  const solvedKeys = solution && solution.placements ? new Set(solution.placements.flatMap((p) => p.cells.map(([r, c]) => key(r, c)))) : new Set();
  const shownGrid = solution && solution.grid ? solution.grid : att.state.grid;

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <span className="badge bg-dark text-capitalize">{att.type}</span>
        <span className="badge bg-secondary text-capitalize">{att.difficulty}</span>
        {!finished && <span className="small text-muted">⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>}
        {att.solved && <span className="badge bg-success">Solved · {att.score} pts</span>}
        {att.gaveUp && <span className="badge bg-danger">Gave up</span>}
        <div className="ms-auto d-flex gap-2">
          {!finished && (
            <>
              <button className="btn btn-sm btn-outline-info" onClick={hint} disabled={att.hintsUsed >= att.maxHints}>
                Hint ({att.maxHints - att.hintsUsed} left)
              </button>
              <button className="btn btn-sm btn-success" onClick={check}>Check</button>
              <button className="btn btn-sm btn-outline-danger" onClick={surrender}>Give up</button>
            </>
          )}
        </div>
      </div>
      {message && <div className={`alert alert-${message.type} py-2`}>{message.text}</div>}

      {att.type === 'sudoku' && (
        <table className="mx-auto" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {shownGrid.map((row, r) => (
              <tr key={r}>
                {row.map((v, c) => {
                  const given = att.data.givens[r][c] !== 0;
                  const bad = conflicts.has(key(r, c));
                  return (
                    <td key={c} style={{
                      border: '1px solid #adb5bd',
                      borderTop: r % 3 === 0 ? '2px solid #212529' : undefined,
                      borderLeft: c % 3 === 0 ? '2px solid #212529' : undefined,
                      borderBottom: r === 8 ? '2px solid #212529' : undefined,
                      borderRight: c === 8 ? '2px solid #212529' : undefined,
                      padding: 0,
                    }}>
                      <input
                        value={v || ''}
                        readOnly={given || finished}
                        maxLength={1}
                        inputMode="numeric"
                        onChange={(e) => {
                          const d = e.target.value.replace(/[^1-9]/g, '');
                          setCell(r, c, d);
                        }}
                        style={{
                          width: 38,
                          height: 38,
                          textAlign: 'center',
                          border: 'none',
                          fontWeight: given ? 700 : 400,
                          color: given ? '#212529' : '#0d6efd',
                          background: bad ? '#f8d7da' : hintCell === key(r, c) ? '#cff4fc' : given ? '#f1f3f5' : 'white',
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {att.type === 'crossword' && (
        <div className="row g-4">
          <div className="col-md-6">
            <table className="mx-auto" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {att.data.layout.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={{ border: cell ? '1px solid #495057' : 'none', background: cell ? 'white' : 'transparent', width: 36, height: 36, padding: 0, position: 'relative' }}>
                        {cell && (
                          <>
                            {cell.number && <span style={{ position: 'absolute', top: 0, left: 2, fontSize: 9 }}>{cell.number}</span>}
                            <input
                              value={shownGrid[r][c] || ''}
                              readOnly={finished}
                              maxLength={1}
                              onChange={(e) => setCell(r, c, e.target.value.replace(/[^a-zA-Z]/g, ''))}
                              style={{ width: 34, height: 34, textAlign: 'center', border: 'none', textTransform: 'uppercase', fontWeight: 600, background: hintCell === key(r, c) ? '#cff4fc' : 'transparent' }}
                            />
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="col-md-6 small">
            {['across', 'down'].map((dir) => (
              <div key={dir} className="mb-3">
                <h6 className="text-capitalize">{dir}</h6>
                {att.data.clues[dir].map((cl) => <div key={`${dir}${cl.number}`}><strong>{cl.number}.</strong> {cl.clue} ({cl.length})</div>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {att.type === 'wordsearch' && (
        <div className="row g-4">
          <div className="col-md-8">
            <table className="mx-auto user-select-none" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {att.data.grid.map((row, r) => (
                  <tr key={r}>
                    {row.map((ch, c) => {
                      const k = key(r, c);
                      let bg = 'white';
                      if (foundKeys.has(k)) bg = '#d1e7dd';
                      else if (solvedKeys.has(k)) bg = '#fff3cd';
                      if (start && start[0] === r && start[1] === c) bg = '#9ec5fe';
                      if (hintCell === k) bg = '#cff4fc';
                      return (
                        <td key={c} onClick={() => clickLetter(r, c)}
                          style={{ width: 32, height: 32, textAlign: 'center', border: '1px solid #dee2e6', cursor: finished ? 'default' : 'pointer', background: bg, fontWeight: 600 }}>
                          {ch}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!finished && <p className="small text-muted text-center mt-2">Click the first letter, then the last letter of a word.</p>}
          </div>
          <div className="col-md-4">
            <h6>Words ({att.state.found.length}/{att.data.words.length})</h6>
            <ul className="list-unstyled">
              {att.data.words.map((wd) => (
                <li key={wd} className={att.state.found.includes(wd) ? 'text-success text-decoration-line-through' : ''}>{wd}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
