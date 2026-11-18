// CONTROLLER (F6 Farin): Interactive Puzzle Engine.
const PuzzleAttempt = require('../models/PuzzleAttempt');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const ps = require('../services/puzzleService');

const TYPES = ['sudoku', 'wordsearch', 'crossword'];
const LEVELS = ['easy', 'medium', 'hard'];

// GET /api/puzzles  - my recent (non-daily) attempts
exports.listMine = asyncHandler(async (req, res) => {
  const attempts = await PuzzleAttempt.find({ user: req.user._id, isDaily: false })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('type difficulty solved gaveUp score hintsUsed startedAt solvedAt updatedAt');
  res.json({ attempts });
});

// POST /api/puzzles  { type, difficulty }  - generate a new puzzle and start it
exports.startNew = asyncHandler(async (req, res) => {
  const { type, difficulty = 'medium' } = req.body;
  if (!TYPES.includes(type)) throw new HttpError(400, `Type must be one of ${TYPES.join(', ')}`);
  if (!LEVELS.includes(difficulty)) throw new HttpError(400, 'Difficulty must be easy, medium or hard');
  const puzzle = await ps.createPuzzle(type, difficulty);
  const attempt = await ps.createAttempt(req.user._id, puzzle);
  res.status(201).json({ attempt: ps.view(attempt, puzzle) });
});

// GET /api/puzzles/attempts/:id
exports.getAttempt = asyncHandler(async (req, res) => {
  const { attempt, puzzle } = await ps.loadOwned(req.params.id, req.user._id, { withSolution: true });
  const finished = attempt.gaveUp || attempt.solved;
  res.json({ attempt: ps.view(attempt, puzzle, finished && attempt.gaveUp ? { solution: puzzle.solution } : {}) });
});

// PUT /api/puzzles/attempts/:id/state  { state }  - autosave
exports.saveState = asyncHandler(async (req, res) => {
  res.json({ attempt: await ps.saveState(req.params.id, req.user._id, req.body.state) });
});

// POST /api/puzzles/attempts/:id/move
exports.move = asyncHandler(async (req, res) => {
  res.json(await ps.applyMove(req.params.id, req.user._id, req.body));
});

// POST /api/puzzles/attempts/:id/hint
exports.hint = asyncHandler(async (req, res) => {
  res.json(await ps.useHint(req.params.id, req.user._id));
});

// POST /api/puzzles/attempts/:id/check
exports.check = asyncHandler(async (req, res) => {
  res.json(await ps.checkSolution(req.params.id, req.user._id));
});

// POST /api/puzzles/attempts/:id/give-up
exports.giveUp = asyncHandler(async (req, res) => {
  res.json(await ps.giveUp(req.params.id, req.user._id));
});
