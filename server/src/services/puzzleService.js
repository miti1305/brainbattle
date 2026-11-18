// F6/F7 (Farin): puzzle attempts (create, move, hint, check) shared by Puzzles and Daily Challenge.
const Puzzle = require('../models/Puzzle');
const PuzzleAttempt = require('../models/PuzzleAttempt');
const DailyStreak = require('../models/DailyStreak');
const HttpError = require('../utils/httpError');
const gen = require('./puzzleGenerator');
const { emitEvent, EVENTS } = require('./eventBus');

// Local calendar date 'YYYY-MM-DD'.
function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}

async function createPuzzle(type, difficulty, isDaily = false) {
  const g = gen.generatePuzzle(type, difficulty);
  return Puzzle.create({
    type,
    difficulty,
    data: g.data,
    solution: g.solution,
    initialState: g.initialState,
    maxHints: gen.DIFFICULTY[difficulty].maxHints,
    isDaily,
  });
}

async function createAttempt(userId, puzzle, { isDaily = false, dailyDate } = {}) {
  return PuzzleAttempt.create({
    user: userId,
    puzzle: puzzle._id,
    type: puzzle.type,
    difficulty: puzzle.difficulty,
    state: JSON.parse(JSON.stringify(puzzle.initialState)),
    isDaily,
    dailyDate,
  });
}

async function loadOwned(attemptId, userId, { withSolution = false } = {}) {
  const attempt = await PuzzleAttempt.findById(attemptId);
  if (!attempt || String(attempt.user) !== String(userId)) throw new HttpError(404, 'Puzzle not found');
  const q = Puzzle.findById(attempt.puzzle);
  const puzzle = await (withSolution ? q.select('+solution') : q);
  if (!puzzle) throw new HttpError(404, 'Puzzle not found');
  return { attempt, puzzle };
}

function view(attempt, puzzle, extra = {}) {
  // Word search: cells of the words already found (needs the solution loaded).
  const foundCells = puzzle.type === 'wordsearch' && puzzle.solution
    ? puzzle.solution.placements.filter((p) => attempt.state.found.includes(p.word)).map((p) => ({ word: p.word, cells: p.cells }))
    : undefined;
  return {
    foundCells,
    attemptId: attempt._id,
    type: puzzle.type,
    difficulty: puzzle.difficulty,
    data: puzzle.data,
    state: attempt.state,
    hintsUsed: attempt.hintsUsed,
    maxHints: puzzle.maxHints,
    solved: attempt.solved,
    gaveUp: attempt.gaveUp,
    score: attempt.score,
    isDaily: attempt.isDaily,
    dailyDate: attempt.dailyDate,
    startedAt: attempt.startedAt,
    ...extra,
  };
}

function assertOpen(attempt) {
  if (attempt.solved || attempt.gaveUp) throw new HttpError(400, 'This puzzle is finished');
}

/** Sudoku/crossword: { row, col, value }. Word search: { cells: [[r,c],...] }. */
async function applyMove(attemptId, userId, move) {
  const { attempt, puzzle } = await loadOwned(attemptId, userId, { withSolution: true });
  assertOpen(attempt);
  const state = attempt.state;
  let result;

  if (puzzle.type === 'wordsearch') {
    const cells = Array.isArray(move.cells) ? move.cells.map(([r, c]) => [Number(r), Number(c)]) : [];
    const word = gen.wordSearchMatch(puzzle.solution.placements, cells);
    if (!word) {
      result = { valid: false, message: 'That is not one of the words' };
    } else if (state.found.includes(word)) {
      result = { valid: false, message: `${word} is already found` };
    } else {
      state.found.push(word);
      result = { valid: true, word, cells: puzzle.solution.placements.find((p) => p.word === word).cells };
    }
  } else {
    const r = Number(move.row);
    const c = Number(move.col);
    const grid = state.grid;
    if (!grid[r] || grid[r][c] === undefined || grid[r][c] === null) throw new HttpError(400, 'Invalid cell');

    if (puzzle.type === 'sudoku') {
      if (puzzle.data.givens[r][c]) return { valid: false, message: 'This number is part of the puzzle', state };
      const v = Number(move.value) || 0;
      if (v < 0 || v > 9) throw new HttpError(400, 'Use numbers 1-9');
      grid[r][c] = v;
      const conflicts = gen.sudokuConflicts(grid, r, c);
      result = { valid: conflicts.length === 0, conflicts, message: conflicts.length ? 'This number breaks a Sudoku rule' : undefined };
    } else {
      const v = String(move.value || '').toUpperCase().slice(0, 1);
      if (v && !/^[A-Z]$/.test(v)) return { valid: false, message: 'Letters only', state };
      grid[r][c] = v;
      result = { valid: true };
    }
  }

  attempt.markModified('state');
  await attempt.save(); // every move autosaves progress
  return { ...result, state: attempt.state };
}

// Saves the whole board at once (used on page leave / periodic autosave).
async function saveState(attemptId, userId, state) {
  const { attempt, puzzle } = await loadOwned(attemptId, userId);
  assertOpen(attempt);
  if (puzzle.type === 'wordsearch') return view(attempt, puzzle); // found words are managed by the server
  const grid = state && state.grid;
  const init = puzzle.initialState.grid;
  if (!Array.isArray(grid) || grid.length !== init.length || grid.some((row, r) => !Array.isArray(row) || row.length !== init[r].length)) {
    throw new HttpError(400, 'Board shape does not match');
  }
  const clean = grid.map((row, r) => row.map((v, c) => {
    if (init[r][c] === null) return null; // crossword block
    if (puzzle.type === 'sudoku') return puzzle.data.givens[r][c] || (Number(v) >= 1 && Number(v) <= 9 ? Number(v) : 0);
    const letter = String(v || '').toUpperCase().slice(0, 1);
    return /^[A-Z]$/.test(letter) ? letter : '';
  }));
  attempt.state = { grid: clean };
  attempt.markModified('state');
  await attempt.save();
  return view(attempt, puzzle);
}

async function useHint(attemptId, userId) {
  const { attempt, puzzle } = await loadOwned(attemptId, userId, { withSolution: true });
  assertOpen(attempt);
  if (attempt.hintsUsed >= puzzle.maxHints) throw new HttpError(400, 'No hints left');

  let hint;
  if (puzzle.type === 'wordsearch') {
    const missing = puzzle.solution.placements.find((p) => !attempt.state.found.includes(p.word));
    if (!missing) throw new HttpError(400, 'Nothing left to hint');
    hint = { word: missing.word, cell: missing.cells[0] }; // show where the word starts
  } else {
    const sol = puzzle.solution.grid;
    const grid = attempt.state.grid;
    const wrong = [];
    sol.forEach((row, r) => row.forEach((v, c) => {
      if (v !== null && String(grid[r][c] || '').toUpperCase() !== String(v)) wrong.push([r, c]);
    }));
    if (!wrong.length) throw new HttpError(400, 'Nothing left to hint');
    const [r, c] = wrong[Math.floor(Math.random() * wrong.length)];
    grid[r][c] = sol[r][c];
    hint = { row: r, col: c, value: sol[r][c] };
    attempt.markModified('state');
  }
  attempt.hintsUsed += 1;
  await attempt.save();
  return { hint, hintsUsed: attempt.hintsUsed, maxHints: puzzle.maxHints, state: attempt.state };
}

async function updateDailyStreak(userId, date) {
  const s = (await DailyStreak.findOne({ user: userId })) || new DailyStreak({ user: userId });
  if (s.lastDate === date) return s;
  s.current = s.lastDate === addDays(date, -1) ? s.current + 1 : 1;
  s.best = Math.max(s.best, s.current);
  s.lastDate = date;
  await s.save();
  return s;
}

async function checkSolution(attemptId, userId) {
  const { attempt, puzzle } = await loadOwned(attemptId, userId, { withSolution: true });
  if (attempt.solved) return { solved: true, score: attempt.score };
  assertOpen(attempt);

  if (!gen.isSolved(puzzle.type, puzzle.data, puzzle.solution, attempt.state)) {
    return { solved: false, message: 'Not solved yet. Keep going!' };
  }

  const seconds = (Date.now() - attempt.startedAt.getTime()) / 1000;
  attempt.solved = true;
  attempt.solvedAt = new Date();
  attempt.score = gen.scoreFor(puzzle.difficulty, attempt.hintsUsed, seconds);
  await attempt.save();

  let streak = null;
  if (attempt.isDaily) streak = await updateDailyStreak(userId, attempt.dailyDate);

  emitEvent(EVENTS.PUZZLE_SOLVED, {
    userId: String(userId),
    attemptId: String(attempt._id),
    puzzleType: puzzle.type,
    difficulty: puzzle.difficulty,
    isDaily: attempt.isDaily,
    score: attempt.score,
  });
  return { solved: true, score: attempt.score, streak: streak ? { current: streak.current, best: streak.best } : null };
}

async function giveUp(attemptId, userId) {
  const { attempt, puzzle } = await loadOwned(attemptId, userId, { withSolution: true });
  assertOpen(attempt);
  attempt.gaveUp = true;
  await attempt.save();
  return { solution: puzzle.solution };
}

module.exports = {
  localDate,
  addDays,
  createPuzzle,
  createAttempt,
  loadOwned,
  view,
  applyMove,
  saveState,
  useHint,
  checkSolution,
  giveUp,
  updateDailyStreak,
};
