// CONTROLLER (F13 Mim): clans with owner/admin/member roles, clan leaderboard and challenges.
const mongoose = require('mongoose');
const Clan = require('../models/Clan');
const Match = require('../models/Match'); // F1 (Abrar)
const PlayerRating = require('../models/PlayerRating'); // F3 (Abrar)
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const sameId = (a, b) => String(a) === String(b);
const roleOf = (clan, userId) => (clan.members.find((m) => sameId(m.user, userId)) || {}).role;

async function load(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Clan not found');
  const clan = await Clan.findById(id);
  if (!clan) throw new HttpError(404, 'Clan not found');
  return clan;
}

// Members ranked by points from finished matches; clan score = sum of member points.
async function leaderboard(clan) {
  const ids = clan.members.map((m) => m.user);
  const [points, ratings] = await Promise.all([
    Match.aggregate([
      { $match: { status: 'finished', 'players.user': { $in: ids } } },
      { $unwind: '$players' },
      { $match: { 'players.user': { $in: ids } } },
      { $group: { _id: '$players.user', points: { $sum: '$players.score' }, wins: { $sum: { $cond: [{ $eq: ['$players.result', 'win'] }, 1, 0] } } } },
    ]),
    PlayerRating.find({ user: { $in: ids } }).select('user rating tier'),
  ]);
  const rows = clan.members.map((m) => {
    const p = points.find((x) => sameId(x._id, m.user)) || {};
    const r = ratings.find((x) => sameId(x.user, m.user)) || {};
    return { userId: m.user, username: m.username, role: m.role, joinedAt: m.joinedAt, points: p.points || 0, wins: p.wins || 0, rating: r.rating || 1200, tier: r.tier || 'Silver' };
  });
  rows.sort((a, b) => b.points - a.points);
  return { rows, score: rows.reduce((s, r) => s + r.points, 0) };
}

// GET /api/clans?q=name
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.name = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const clans = await Clan.find(filter).sort({ createdAt: -1 }).limit(50).select('name description members memberCap');
  res.json({ clans: clans.map((c) => ({ _id: c._id, name: c.name, description: c.description, memberCount: c.members.length, memberCap: c.memberCap })) });
});

// GET /api/clans/mine
exports.mine = asyncHandler(async (req, res) => {
  const clan = await Clan.findOne({ 'members.user': req.user._id }).select('_id name');
  res.json({ clan });
});

// POST /api/clans  { name, description, memberCap }
exports.create = asyncHandler(async (req, res) => {
  if (await Clan.exists({ 'members.user': req.user._id })) throw new HttpError(400, 'Leave your current clan first');
  const clan = await Clan.create({
    name: req.body.name,
    description: req.body.description,
    memberCap: Number(req.body.memberCap) || 20,
    owner: req.user._id,
    members: [{ user: req.user._id, username: req.user.username, role: 'owner' }],
  });
  res.status(201).json({ clan });
});

// GET /api/clans/:id
exports.get = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  const board = await leaderboard(clan);
  res.json({ clan, leaderboard: board.rows, score: board.score, myRole: roleOf(clan, req.user._id) || null });
});

// POST /api/clans/:id/join
exports.join = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  if (await Clan.exists({ 'members.user': req.user._id })) throw new HttpError(400, 'You are already in a clan');
  if (clan.members.length >= clan.memberCap) throw new HttpError(400, 'This clan is full');
  clan.members.push({ user: req.user._id, username: req.user.username, role: 'member' });
  await clan.save();
  res.json({ clan });
});

// POST /api/clans/:id/leave  - if the owner leaves, ownership moves to the oldest admin, else oldest member
exports.leave = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  const role = roleOf(clan, req.user._id);
  if (!role) throw new HttpError(400, 'You are not in this clan');
  clan.members = clan.members.filter((m) => !sameId(m.user, req.user._id));

  if (clan.members.length === 0) {
    await clan.deleteOne();
    return res.json({ ok: true, deleted: true });
  }
  if (role === 'owner') {
    const byAge = [...clan.members].sort((a, b) => a.joinedAt - b.joinedAt);
    const next = byAge.find((m) => m.role === 'admin') || byAge[0];
    next.role = 'owner';
    clan.owner = next.user;
  }
  await clan.save();
  return res.json({ ok: true });
});

// PATCH /api/clans/:id/members/:userId  { role: 'admin' | 'member' }  (owner only)
exports.setRole = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  if (roleOf(clan, req.user._id) !== 'owner') throw new HttpError(403, 'Only the owner can change roles');
  if (!['admin', 'member'].includes(req.body.role)) throw new HttpError(400, 'Role must be admin or member');
  const member = clan.members.find((m) => sameId(m.user, req.params.userId));
  if (!member || member.role === 'owner') throw new HttpError(400, 'Cannot change this member');
  member.role = req.body.role;
  await clan.save();
  res.json({ clan });
});

// DELETE /api/clans/:id/members/:userId  - owner removes anyone, admin removes members
exports.removeMember = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  const myRole = roleOf(clan, req.user._id);
  const target = clan.members.find((m) => sameId(m.user, req.params.userId));
  if (!target) throw new HttpError(404, 'Member not found');
  const allowed = (myRole === 'owner' && target.role !== 'owner') || (myRole === 'admin' && target.role === 'member');
  if (!allowed) throw new HttpError(403, 'You cannot remove this member');
  clan.members = clan.members.filter((m) => !sameId(m.user, req.params.userId));
  await clan.save();
  res.json({ clan });
});

// POST /api/clans/:id/transfer  { userId }  (owner only)
exports.transfer = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  if (roleOf(clan, req.user._id) !== 'owner') throw new HttpError(403, 'Only the owner can transfer ownership');
  const target = clan.members.find((m) => sameId(m.user, req.body.userId));
  if (!target || sameId(target.user, req.user._id)) throw new HttpError(400, 'Choose another member');
  clan.members.find((m) => sameId(m.user, req.user._id)).role = 'admin';
  target.role = 'owner';
  clan.owner = target.user;
  await clan.save();
  res.json({ clan });
});

// POST /api/clans/:id/challenges  { title, description, endsAt }  (owner/admin)
exports.addChallenge = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  if (!['owner', 'admin'].includes(roleOf(clan, req.user._id))) throw new HttpError(403, 'Only owners and admins can post challenges');
  if (!req.body.title) throw new HttpError(400, 'Title is required');
  clan.challenges.unshift({
    title: req.body.title,
    description: req.body.description,
    endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
    createdBy: req.user._id,
  });
  await clan.save();
  res.status(201).json({ clan });
});

// DELETE /api/clans/:id/challenges/:challengeId  (owner/admin)
exports.removeChallenge = asyncHandler(async (req, res) => {
  const clan = await load(req.params.id);
  if (!['owner', 'admin'].includes(roleOf(clan, req.user._id))) throw new HttpError(403, 'Not allowed');
  clan.challenges = clan.challenges.filter((c) => !sameId(c._id, req.params.challengeId));
  await clan.save();
  res.json({ clan });
});
