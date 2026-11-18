// CONTROLLER (F3 Abrar): global, weekly, per-category and friends leaderboards + my rating.
const mongoose = require('mongoose');
const PlayerRating = require('../models/PlayerRating');
const Match = require('../models/Match');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { getOrCreateRating } = require('../services/ratingService');

// Friend ids come from F12 (Mim). Before F12 is merged, the friends board only shows you.
async function friendIds(userId) {
  const Friendship = mongoose.models.Friendship;
  if (!Friendship) return [userId];
  const links = await Friendship.find({ status: 'accepted', $or: [{ requester: userId }, { recipient: userId }] });
  return [userId, ...links.map((f) => (String(f.requester) === String(userId) ? f.recipient : f.requester))];
}

const ratingEntry = (r, rank, value) => ({
  rank,
  userId: r.user._id,
  username: r.user.username,
  rating: r.rating,
  tier: r.tier,
  wins: r.wins,
  gamesPlayed: r.gamesPlayed,
  value,
});

// GET /api/leaderboards?type=global|weekly|category|friends&category=<id>&limit=50
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const type = req.query.type || 'global';
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const me = String(req.user._id);

  if (type === 'category') {
    const { category } = req.query;
    if (!mongoose.isValidObjectId(category)) throw new HttpError(400, 'Choose a category');
    const rows = await Match.aggregate([
      { $match: { status: 'finished', category: new mongoose.Types.ObjectId(category), mode: { $ne: 'casual' } } },
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players.user',
          username: { $last: '$players.username' },
          points: { $sum: '$players.score' },
          wins: { $sum: { $cond: [{ $eq: ['$players.result', 'win'] }, 1, 0] } },
          lastAt: { $max: '$finishedAt' },
        },
      },
      { $sort: { points: -1, lastAt: 1 } },
    ]);
    const entries = rows.map((r, i) => ({ rank: i + 1, userId: r._id, username: r.username, wins: r.wins, value: r.points }));
    const mine = entries.find((e) => String(e.userId) === me);
    return res.json({ type, entries: entries.slice(0, limit), me: mine || null });
  }

  let filter = { gamesPlayed: { $gt: 0 } };
  let sort = { rating: -1, ratedAt: 1 };
  let valueOf = (r) => r.rating;
  if (type === 'weekly') {
    filter = { weeklyPoints: { $gt: 0 } };
    sort = { weeklyPoints: -1, weeklyUpdatedAt: 1 };
    valueOf = (r) => r.weeklyPoints;
  } else if (type === 'friends') {
    filter = { user: { $in: await friendIds(req.user._id) } };
  } else if (type !== 'global') {
    throw new HttpError(400, 'Unknown leaderboard type');
  }

  const all = await PlayerRating.find(filter).sort(sort).populate('user', 'username');
  const entries = all.filter((r) => r.user).map((r, i) => ratingEntry(r, i + 1, valueOf(r)));
  const mine = entries.find((e) => String(e.userId) === me);
  res.json({ type, entries: entries.slice(0, limit), me: mine || null });
});

// GET /api/leaderboards/me  - my rating card
exports.getMyRating = asyncHandler(async (req, res) => {
  const r = await getOrCreateRating(req.user._id);
  res.json({ rating: r });
});
