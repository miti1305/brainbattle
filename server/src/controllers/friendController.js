// CONTROLLER (F12 Mim): friend requests, friends list with online status, blocking, suggestions, challenges.
const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const GameRoom = require('../models/GameRoom'); // F4 (Abrar)
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const presence = require('../services/presence');
const { emitEvent, EVENTS } = require('../services/eventBus');

const sameId = (a, b) => String(a) === String(b);
const other = (f, me) => (sameId(f.requester._id || f.requester, me) ? f.recipient : f.requester);

async function acceptedIds(userId) {
  const links = await Friendship.find({ status: 'accepted', $or: [{ requester: userId }, { recipient: userId }] });
  return links.map((f) => String(other(f, userId)));
}

// GET /api/friends
exports.listFriends = asyncHandler(async (req, res) => {
  const links = await Friendship.find({ status: 'accepted', $or: [{ requester: req.user._id }, { recipient: req.user._id }] })
    .populate('requester', 'username avatarUrl')
    .populate('recipient', 'username avatarUrl');
  const friends = links
    .map((f) => {
      const u = other(f, req.user._id);
      return { userId: u._id, username: u.username, online: presence.isOnline(u._id), since: f.updatedAt };
    })
    .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
  res.json({ friends });
});

// GET /api/friends/requests
exports.listRequests = asyncHandler(async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    Friendship.find({ recipient: req.user._id, status: 'pending' }).populate('requester', 'username'),
    Friendship.find({ requester: req.user._id, status: 'pending' }).populate('recipient', 'username'),
  ]);
  res.json({
    incoming: incoming.map((f) => ({ _id: f._id, userId: f.requester._id, username: f.requester.username, createdAt: f.createdAt })),
    outgoing: outgoing.map((f) => ({ _id: f._id, userId: f.recipient._id, username: f.recipient.username, createdAt: f.createdAt })),
  });
});

// POST /api/friends/requests  { username }
exports.sendRequest = asyncHandler(async (req, res) => {
  const target = await User.findOne({ username: String(req.body.username || '').trim() });
  if (!target) throw new HttpError(404, 'No user with that username');
  if (sameId(target._id, req.user._id)) throw new HttpError(400, 'You cannot add yourself');

  const pairKey = Friendship.keyFor(req.user._id, target._id);
  const existing = await Friendship.findOne({ pairKey });
  if (existing) {
    if (existing.status === 'blocked') throw new HttpError(403, 'You cannot send a request to this user');
    if (existing.status === 'accepted') throw new HttpError(409, 'You are already friends');
    throw new HttpError(409, 'A friend request already exists between you');
  }

  const f = await Friendship.create({ requester: req.user._id, recipient: target._id, pairKey });
  emitEvent(EVENTS.FRIEND_REQUEST_SENT, { fromId: String(req.user._id), fromUsername: req.user.username, toId: String(target._id) });
  res.status(201).json({ request: f });
});

async function myRequest(req, role) {
  const f = await Friendship.findById(req.params.id);
  if (!f || f.status !== 'pending') throw new HttpError(404, 'Request not found');
  if (role === 'recipient' && !sameId(f.recipient, req.user._id)) throw new HttpError(403, 'Not your request');
  if (role === 'either' && !sameId(f.recipient, req.user._id) && !sameId(f.requester, req.user._id)) throw new HttpError(403, 'Not your request');
  return f;
}

// POST /api/friends/requests/:id/accept
exports.acceptRequest = asyncHandler(async (req, res) => {
  const f = await myRequest(req, 'recipient');
  f.status = 'accepted';
  await f.save();
  emitEvent(EVENTS.FRIEND_REQUEST_ACCEPTED, { fromId: String(req.user._id), fromUsername: req.user.username, toId: String(f.requester) });
  res.json({ ok: true });
});

// POST /api/friends/requests/:id/decline  (recipient declines or requester cancels)
exports.declineRequest = asyncHandler(async (req, res) => {
  const f = await myRequest(req, 'either');
  await f.deleteOne();
  res.json({ ok: true });
});

// DELETE /api/friends/:userId  (unfriend)
exports.removeFriend = asyncHandler(async (req, res) => {
  await Friendship.deleteOne({ pairKey: Friendship.keyFor(req.user._id, req.params.userId), status: 'accepted' });
  res.json({ ok: true });
});

// POST /api/friends/block  { userId }
exports.block = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.isValidObjectId(userId) || sameId(userId, req.user._id)) throw new HttpError(400, 'Invalid user');
  const pairKey = Friendship.keyFor(req.user._id, userId);
  await Friendship.findOneAndUpdate(
    { pairKey },
    { requester: req.user._id, recipient: userId, status: 'blocked', blockedBy: req.user._id, pairKey },
    { upsert: true, new: true }
  );
  res.json({ ok: true });
});

// POST /api/friends/unblock  { userId }
exports.unblock = asyncHandler(async (req, res) => {
  await Friendship.deleteOne({ pairKey: Friendship.keyFor(req.user._id, req.body.userId), status: 'blocked', blockedBy: req.user._id });
  res.json({ ok: true });
});

// GET /api/friends/blocked
exports.listBlocked = asyncHandler(async (req, res) => {
  const links = await Friendship.find({ status: 'blocked', blockedBy: req.user._id }).populate('recipient', 'username');
  res.json({ blocked: links.map((f) => ({ userId: f.recipient._id, username: f.recipient.username })) });
});

// GET /api/friends/search?q=ab
exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ users: [] });
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const users = await User.find({ username: { $regex: escaped, $options: 'i' }, _id: { $ne: req.user._id } }).select('username').limit(10);
  return res.json({ users: users.map((u) => ({ userId: u._id, username: u.username })) });
});

// GET /api/friends/suggestions  - friends of friends, then other recent players
exports.suggestions = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const myLinks = await Friendship.find({ $or: [{ requester: me }, { recipient: me }] });
  const exclude = new Set([me, ...myLinks.map((f) => String(other(f, me)))]);
  const friends = myLinks.filter((f) => f.status === 'accepted').map((f) => String(other(f, me)));

  const counts = new Map();
  if (friends.length) {
    const theirLinks = await Friendship.find({ status: 'accepted', $or: [{ requester: { $in: friends } }, { recipient: { $in: friends } }] });
    for (const f of theirLinks) {
      for (const id of [String(f.requester), String(f.recipient)]) {
        if (!exclude.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
  }

  let ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, 10);
  if (ids.length < 10) {
    const recent = await User.find({ _id: { $nin: [...exclude, ...ids] } }).sort({ createdAt: -1 }).limit(10 - ids.length).select('_id');
    ids = ids.concat(recent.map((u) => String(u._id)));
  }
  const users = await User.find({ _id: { $in: ids } }).select('username');
  res.json({
    suggestions: ids
      .map((id) => users.find((u) => String(u._id) === id))
      .filter(Boolean)
      .map((u) => ({ userId: u._id, username: u.username, mutualFriends: counts.get(String(u._id)) || 0 })),
  });
});

// POST /api/friends/challenge  { userId }  - opens a private room (F4) and invites the friend
exports.challenge = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const friends = await acceptedIds(req.user._id);
  if (!friends.includes(String(userId))) throw new HttpError(403, 'You can only challenge friends');

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  } while (await GameRoom.exists({ code }));

  await GameRoom.create({ code, host: req.user._id, maxPlayers: 2, players: [{ user: req.user._id, username: req.user.username }] });
  emitEvent(EVENTS.FRIEND_CHALLENGE, { fromId: String(req.user._id), fromUsername: req.user.username, toId: String(userId), roomCode: code });
  require('../sockets').getIO().to(`user:${userId}`).emit('friend:challenge', { from: req.user.username, roomCode: code });
  res.json({ roomCode: code });
});
