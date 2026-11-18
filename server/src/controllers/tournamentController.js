// CONTROLLER (F11 Mim): create tournaments, register, generate brackets, play and advance.
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { generateSingleElimination, generateRoundRobin, roundRobinStandings } = require('../services/bracketService');
const { applyResult, announceReady } = require('../services/tournamentService');
const battleService = require('../services/battleService'); // F1 (Abrar)

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const io = () => require('../sockets').getIO();

async function load(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Tournament not found');
  const t = await Tournament.findById(id).populate('category', 'name').populate('organizer', 'username').populate('champion', 'username');
  if (!t) throw new HttpError(404, 'Tournament not found');
  return t;
}

function view(t) {
  const names = new Map(t.participants.map((p) => [String(p.user), p.username]));
  const name = (id) => (id ? names.get(String(id)) || 'Player' : null);
  const obj = t.toObject();
  obj.matches = obj.matches.map((m, index) => ({
    ...m,
    index,
    playerAName: name(m.playerA),
    playerBName: name(m.playerB),
    winnerName: name(m.winner),
    deadline: m.readyAt ? new Date(new Date(m.readyAt).getTime() + t.matchDeadlineHours * 3600 * 1000) : null,
  }));
  if (t.format === 'roundrobin' && t.matches.length) {
    obj.standings = roundRobinStandings(obj.matches, t.participants.map((p) => p.user)).map((s) => ({ ...s, username: name(s.userId) }));
  }
  return obj;
}

// GET /api/tournaments?status=registration
exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : { status: { $ne: 'cancelled' } };
  const items = await Tournament.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .select('name format status regDeadline maxPlayers participants organizer category champion')
    .populate('organizer', 'username')
    .populate('category', 'name')
    .populate('champion', 'username');
  res.json({ items });
});

// POST /api/tournaments
exports.create = asyncHandler(async (req, res) => {
  const { name, description, format, category, maxPlayers, regDeadline, matchDeadlineHours } = req.body;
  if (!name) throw new HttpError(400, 'Name is required');
  const deadline = new Date(regDeadline);
  if (Number.isNaN(deadline.getTime()) || deadline <= new Date()) throw new HttpError(400, 'Registration deadline must be in the future');
  const t = await Tournament.create({
    name,
    description,
    format: format === 'roundrobin' ? 'roundrobin' : 'single',
    category: mongoose.isValidObjectId(category) ? category : undefined,
    maxPlayers: Number(maxPlayers) || 8,
    regDeadline: deadline,
    matchDeadlineHours: Number(matchDeadlineHours) || 24,
    organizer: req.user._id,
  });
  res.status(201).json({ tournament: view(await load(t._id)) });
});

// GET /api/tournaments/:id
exports.get = asyncHandler(async (req, res) => {
  res.json({ tournament: view(await load(req.params.id)) });
});

// POST /api/tournaments/:id/register
exports.register = asyncHandler(async (req, res) => {
  const t = await load(req.params.id);
  if (t.status !== 'registration') throw new HttpError(400, 'Registration is closed');
  if (new Date() > t.regDeadline) throw new HttpError(400, 'The registration deadline has passed');
  if (t.participants.some((p) => sameId(p.user, req.user._id))) throw new HttpError(409, 'You are already registered');
  if (t.participants.length >= t.maxPlayers) throw new HttpError(400, 'Tournament is full');
  t.participants.push({ user: req.user._id, username: req.user.username });
  await t.save();
  res.json({ tournament: view(t) });
});

// POST /api/tournaments/:id/unregister
exports.unregister = asyncHandler(async (req, res) => {
  const t = await load(req.params.id);
  if (t.status !== 'registration') throw new HttpError(400, 'You can only leave before the tournament starts');
  t.participants = t.participants.filter((p) => !sameId(p.user, req.user._id));
  await t.save();
  res.json({ tournament: view(t) });
});

// POST /api/tournaments/:id/start  (organizer)
exports.start = asyncHandler(async (req, res) => {
  const t = await load(req.params.id);
  if (!sameId(t.organizer._id, req.user._id)) throw new HttpError(403, 'Only the organizer can start the tournament');
  if (t.status !== 'registration') throw new HttpError(400, 'Tournament already started');
  if (t.participants.length < 2) throw new HttpError(400, 'At least 2 players must register');

  const ids = t.participants.map((p) => String(p.user));
  t.matches = t.format === 'roundrobin' ? generateRoundRobin(ids) : generateSingleElimination(ids);
  t.status = 'ongoing';
  announceReady(t, t.matches.map((m, i) => (m.status === 'ready' ? i : -1)).filter((i) => i >= 0));
  await t.save();
  res.json({ tournament: view(await load(t._id)) });
});

// POST /api/tournaments/:id/matches/:index/play  - creates (or reopens) the F1 battle for this bracket match
exports.play = asyncHandler(async (req, res) => {
  const t = await load(req.params.id);
  const index = Number(req.params.index);
  const bm = t.matches[index];
  if (!bm || t.status !== 'ongoing') throw new HttpError(404, 'Match not available');
  if (!sameId(bm.playerA, req.user._id) && !sameId(bm.playerB, req.user._id)) throw new HttpError(403, 'This is not your match');
  if (bm.status === 'done') throw new HttpError(400, 'This match is finished');
  if (bm.status === 'pending') throw new HttpError(400, 'Wait until your opponent is known');

  if (bm.match) {
    const existing = await Match.findById(bm.match).select('status');
    if (existing && ['waiting', 'active'].includes(existing.status)) return res.json({ matchId: bm.match });
  }

  const match = await battleService.createMatch({
    userIds: [bm.playerA, bm.playerB],
    mode: 'tournament',
    categoryId: t.category ? t.category._id : undefined,
    questionCount: 10,
    questionTime: 15,
    tournamentId: t._id,
    bracketIndex: index,
  });
  bm.match = match._id;
  bm.status = 'live';
  t.markModified('matches');
  await t.save();

  const opponent = sameId(bm.playerA, req.user._id) ? bm.playerB : bm.playerA;
  io().to(`user:${opponent}`).emit('tournament:matchStarted', { tournamentId: String(t._id), matchId: String(match._id), from: req.user.username });
  res.json({ matchId: match._id });
});

// POST /api/tournaments/:id/matches/:index/walkover  { winnerId }
// Organizer can decide any time. A player can claim the win after the match deadline (no-show).
exports.walkover = asyncHandler(async (req, res) => {
  const t = await load(req.params.id);
  const index = Number(req.params.index);
  const bm = t.matches[index];
  if (!bm || t.status !== 'ongoing' || bm.status === 'done' || bm.status === 'pending') throw new HttpError(400, 'Match not available');

  const isOrganizer = sameId(t.organizer._id, req.user._id);
  const isPlayer = sameId(bm.playerA, req.user._id) || sameId(bm.playerB, req.user._id);
  let winnerId = req.body.winnerId;

  if (!isOrganizer) {
    if (!isPlayer) throw new HttpError(403, 'Not allowed');
    const deadline = new Date(new Date(bm.readyAt || t.updatedAt).getTime() + t.matchDeadlineHours * 3600 * 1000);
    if (new Date() < deadline) throw new HttpError(400, `You can claim a no-show win after ${deadline.toLocaleString()}`);
    if (bm.match) {
      const m = await Match.findById(bm.match).select('status');
      if (m && ['waiting', 'active'].includes(m.status)) throw new HttpError(400, 'The match is being played');
    }
    winnerId = req.user._id;
  }

  await applyResult(t, index, { winnerId });
  res.json({ tournament: view(await load(t._id)) });
});

// POST /api/tournaments/:id/cancel  (organizer)
exports.cancel = asyncHandler(async (req, res) => {
  const t = await load(req.params.id);
  if (!sameId(t.organizer._id, req.user._id)) throw new HttpError(403, 'Only the organizer can cancel');
  if (t.status === 'finished') throw new HttpError(400, 'Tournament already finished');
  t.status = 'cancelled';
  await t.save();
  res.json({ ok: true });
});
