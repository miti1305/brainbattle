// CONTROLLER (F2 Abrar): join / leave / check the ranked queue.
const mongoose = require('mongoose');
const Match = require('../models/Match');
const MatchQueueEntry = require('../models/MatchQueueEntry');
const asyncHandler = require('../utils/asyncHandler');
const { getOrCreateRating } = require('../services/ratingService');
const { allowedRange, runMatchmaking } = require('../services/matchmakingService');

// POST /api/matchmaking/join  { categoryId? }
exports.join = asyncHandler(async (req, res) => {
  const running = await Match.findOne({ 'players.user': req.user._id, mode: 'ranked', status: { $in: ['waiting', 'active'] } });
  if (running) return res.json({ status: 'in_match', matchId: running._id });

  const rating = await getOrCreateRating(req.user._id);
  const { categoryId } = req.body;
  await MatchQueueEntry.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      rating: rating.rating,
      category: categoryId && mongoose.isValidObjectId(categoryId) ? categoryId : undefined,
      joinedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  runMatchmaking().catch(() => {}); // try to pair straight away
  res.json({ status: 'queued', rating: rating.rating, tier: rating.tier });
});

// POST /api/matchmaking/leave
exports.leave = asyncHandler(async (req, res) => {
  await MatchQueueEntry.deleteOne({ user: req.user._id });
  res.json({ status: 'left' });
});

// GET /api/matchmaking/status
exports.status = asyncHandler(async (req, res) => {
  const entry = await MatchQueueEntry.findOne({ user: req.user._id });
  if (!entry) return res.json({ inQueue: false });
  const now = Date.now();
  res.json({
    inQueue: true,
    joinedAt: entry.joinedAt,
    waitedSeconds: Math.floor((now - entry.joinedAt.getTime()) / 1000),
    allowedRange: allowedRange(entry.joinedAt, now),
  });
});
