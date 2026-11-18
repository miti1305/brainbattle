// CONTROLLER (F1 Abrar): REST part of battles (the live part is in sockets/battleSocket.js).
const Match = require('../models/Match');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const battleService = require('../services/battleService');

// GET /api/battles/active  - my waiting or running matches
exports.listActive = asyncHandler(async (req, res) => {
  const matches = await Match.find({ 'players.user': req.user._id, status: { $in: ['waiting', 'active'] } })
    .select('mode status players.username players.user createdAt')
    .sort({ createdAt: -1 });
  res.json({ matches });
});

// GET /api/battles/:id  - current state (players only)
exports.getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findById(req.params.id);
  if (!match) throw new HttpError(404, 'Match not found');
  if (!match.players.some((p) => String(p.user) === String(req.user._id))) throw new HttpError(403, 'Not your match');
  res.json({ match: battleService.publicState(match) });
});

// POST /api/battles/:id/leave  - forfeit
exports.leaveMatch = asyncHandler(async (req, res) => {
  await battleService.forfeit(req.params.id, req.user._id);
  res.json({ ok: true });
});
