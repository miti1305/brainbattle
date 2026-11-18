// F1 (Abrar): the real-time battle engine.
// Flow: createMatch -> players join (socket) -> startMatch -> askQuestion -> answers -> revealQuestion -> ... -> finishMatch
// Timers live in memory, so restarting the server in the middle of a match leaves that match unfinished.
const Match = require('../models/Match');
const User = require('../models/User');
const GameRoom = require('../models/GameRoom');
const HttpError = require('../utils/httpError');
const { pickQuestions } = require('./questionPicker');
const { getOrCreateRating, applyMatchResults } = require('./ratingService');
const { emitEvent, EVENTS } = require('./eventBus');

const START_DELAY_MS = 3000; // countdown before the first question
const REVEAL_MS = 3000; // how long the correct answer is shown
const GRACE_MS = 10000; // reconnect time before a disconnected player forfeits
const JOIN_TIMEOUT_MS = 60000; // a waiting match is cancelled if players don't join

const timers = new Map(); // matchId -> question/reveal timer
const graceTimers = new Map(); // `${matchId}:${userId}` -> forfeit timer

const io = () => require('../sockets').getIO();
const roomOf = (matchId) => `match:${matchId}`;
const sameId = (a, b) => String(a) === String(b);

function setTimer(matchId, fn, ms) {
  clearTimer(matchId);
  timers.set(String(matchId), setTimeout(fn, ms));
}

function clearTimer(matchId) {
  const t = timers.get(String(matchId));
  if (t) clearTimeout(t);
  timers.delete(String(matchId));
}

// What players are allowed to see (never the correct answer of the current question).
function publicState(match) {
  const m = match.toObject ? match.toObject() : match;
  const q = m.status === 'active' && m.currentIndex >= 0 ? m.questions[m.currentIndex] : null;
  return {
    _id: m._id,
    mode: m.mode,
    status: m.status,
    category: m.category,
    room: m.room,
    tournament: m.tournament,
    questionTime: m.questionTime,
    totalQuestions: m.questions.length,
    currentIndex: m.currentIndex,
    questionStartedAt: m.questionStartedAt,
    question: q ? { text: q.text, type: q.type, imageUrl: q.imageUrl, options: q.options } : null,
    players: m.players.map((p) => ({
      user: p.user,
      username: p.username,
      score: p.score,
      correctCount: p.correctCount,
      connected: p.connected,
      forfeited: p.forfeited,
      result: p.result,
      ratingBefore: p.ratingBefore,
      ratingAfter: p.ratingAfter,
      answeredCurrent: p.answers.some((a) => a.qIndex === m.currentIndex),
    })),
    serverTime: Date.now(),
  };
}

async function createMatch({ userIds, mode = 'casual', categoryId, difficulty, questionCount = 10, questionTime = 15, roomId, tournamentId, bracketIndex }) {
  if (!userIds || userIds.length < 2) throw new HttpError(400, 'A battle needs at least 2 players');
  const questions = await pickQuestions({ categoryId, difficulty: difficulty || undefined, count: questionCount });
  if (questions.length === 0) throw new HttpError(400, 'No published questions found for these settings');

  const users = await User.find({ _id: { $in: userIds } }).select('username');
  const players = [];
  for (const id of userIds) {
    const u = users.find((x) => sameId(x._id, id));
    const r = await getOrCreateRating(id);
    players.push({ user: id, username: u ? u.username : 'Player', ratingBefore: r.rating });
  }

  const match = await Match.create({
    mode,
    category: categoryId || undefined,
    questions,
    questionTime,
    players,
    room: roomId,
    tournament: tournamentId,
    bracketIndex,
  });

  // Cancel if not everyone joins in time.
  setTimer(match._id, () => cancelIfWaiting(match._id), JOIN_TIMEOUT_MS);
  return match;
}

async function cancelIfWaiting(matchId) {
  const match = await Match.findOneAndUpdate({ _id: matchId, status: 'waiting' }, { $set: { status: 'cancelled' } }, { new: true });
  clearTimer(matchId);
  if (!match) return;
  io().to(roomOf(matchId)).emit('battle:cancelled', { reason: 'Not all players joined in time' });
  if (match.room) await GameRoom.updateOne({ _id: match.room }, { $set: { status: 'open' }, $unset: { match: 1 } });
}

async function joinMatch(matchId, user, socket) {
  const match = await Match.findById(matchId);
  if (!match) throw new HttpError(404, 'Match not found');
  const player = match.players.find((p) => sameId(p.user, user._id));
  if (!player) throw new HttpError(403, 'You are not a player in this match');

  socket.join(roomOf(matchId));
  if (['finished', 'cancelled'].includes(match.status)) {
    socket.emit('battle:state', publicState(match));
    return;
  }

  // Reconnected in time: cancel the forfeit timer.
  const key = `${matchId}:${user._id}`;
  if (graceTimers.has(key)) {
    clearTimeout(graceTimers.get(key));
    graceTimers.delete(key);
  }

  const updated = await Match.findOneAndUpdate(
    { _id: matchId, 'players.user': user._id },
    { $set: { 'players.$.connected': true } },
    { new: true }
  );
  io().to(roomOf(matchId)).emit('battle:state', publicState(updated));

  if (updated.status === 'waiting' && updated.players.every((p) => p.connected)) {
    io().to(roomOf(matchId)).emit('battle:starting', { inMs: START_DELAY_MS });
    setTimer(matchId, () => startMatch(matchId), START_DELAY_MS);
  }
}

async function startMatch(matchId) {
  const match = await Match.findOneAndUpdate(
    { _id: matchId, status: 'waiting' },
    { $set: { status: 'active', startedAt: new Date() } },
    { new: true }
  );
  if (match) await askQuestion(matchId, 0);
}

async function askQuestion(matchId, index) {
  const match = await Match.findOneAndUpdate(
    { _id: matchId, status: 'active' },
    { $set: { currentIndex: index, questionStartedAt: new Date() } },
    { new: true }
  );
  if (!match) return;
  const q = match.questions[index];
  io().to(roomOf(matchId)).emit('battle:question', {
    index,
    total: match.questions.length,
    question: { text: q.text, type: q.type, imageUrl: q.imageUrl, options: q.options },
    timeLimit: match.questionTime,
    startedAt: match.questionStartedAt,
    serverTime: Date.now(),
  });
  setTimer(matchId, () => revealQuestion(matchId, index), match.questionTime * 1000 + 500);
}

async function revealQuestion(matchId, index) {
  // Only the first call for this question continues (timer and "everyone answered" can race).
  const match = await Match.findOneAndUpdate(
    { _id: matchId, status: 'active', currentIndex: index, revealedIndex: { $ne: index } },
    { $set: { revealedIndex: index } },
    { new: true }
  );
  if (!match) return;
  clearTimer(matchId);

  const q = match.questions[index];
  io().to(roomOf(matchId)).emit('battle:reveal', {
    index,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    players: publicState(match).players,
  });

  const isLast = index + 1 >= match.questions.length;
  setTimer(matchId, () => (isLast ? finishMatch(matchId) : askQuestion(matchId, index + 1)), REVEAL_MS);
}

async function submitAnswer(matchId, user, qIndex, choice) {
  const match = await Match.findById(matchId);
  if (!match || match.status !== 'active') throw new HttpError(400, 'Match is not running');
  if (match.currentIndex !== qIndex || match.revealedIndex === qIndex) throw new HttpError(400, 'This question is closed');

  const player = match.players.find((p) => sameId(p.user, user._id));
  if (!player || player.forfeited) throw new HttpError(403, 'You are not playing in this match');

  const limitMs = match.questionTime * 1000;
  const elapsed = Date.now() - new Date(match.questionStartedAt).getTime();
  if (elapsed > limitMs + 300) throw new HttpError(400, 'Too late, time is up');

  const q = match.questions[qIndex];
  const isCorrect = Number(choice) === q.correctIndex;
  // 100 points for a correct answer + up to 50 bonus points for speed.
  const points = isCorrect ? 100 + Math.round(50 * Math.max(0, 1 - elapsed / limitMs)) : 0;

  // Atomic update that only works if this player has not answered this question yet.
  const updated = await Match.findOneAndUpdate(
    {
      _id: matchId,
      status: 'active',
      currentIndex: qIndex,
      players: { $elemMatch: { user: user._id, 'answers.qIndex': { $ne: qIndex } } },
    },
    {
      $push: { 'players.$.answers': { qIndex, choice: Number(choice), isCorrect, timeMs: elapsed, points } },
      $inc: { 'players.$.score': points, 'players.$.correctCount': isCorrect ? 1 : 0 },
    },
    { new: true }
  );
  if (!updated) throw new HttpError(400, 'You already answered this question');

  io().to(roomOf(matchId)).emit('battle:answered', { userId: user._id, index: qIndex });

  const stillPlaying = updated.players.filter((p) => !p.forfeited);
  if (stillPlaying.every((p) => p.answers.some((a) => a.qIndex === qIndex))) {
    await revealQuestion(matchId, qIndex);
  }
  return { ok: true };
}

function decideResults(players) {
  const active = players.filter((p) => !p.forfeited);
  const top = active.length ? Math.max(...active.map((p) => p.score)) : 0;
  const topCount = active.filter((p) => p.score === top).length;
  for (const p of players) {
    if (p.forfeited) p.result = 'forfeit';
    else if (p.score === top) p.result = topCount > 1 ? 'draw' : 'win';
    else p.result = 'loss';
  }
}

async function finishMatch(matchId) {
  clearTimer(matchId);
  const match = await Match.findOneAndUpdate(
    { _id: matchId, status: { $in: ['active', 'waiting'] } },
    { $set: { status: 'finished', finishedAt: new Date() } },
    { new: true }
  );
  if (!match) return;

  decideResults(match.players);
  await applyMatchResults(match); // also writes ratingBefore/ratingAfter for ranked matches
  match.markModified('players');
  await match.save();

  io().to(roomOf(matchId)).emit('battle:finished', publicState(match));

  if (match.room) {
    const room = await GameRoom.findOneAndUpdate(
      { _id: match.room },
      { $set: { status: 'open', expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) }, $unset: { match: 1 } },
      { new: true }
    );
    if (room) io().to(`room:${room.code}`).emit('lobby:update', room);
  }

  emitEvent(EVENTS.MATCH_FINISHED, {
    matchId: String(match._id),
    mode: match.mode,
    categoryId: match.category ? String(match.category) : null,
    tournamentId: match.tournament ? String(match.tournament) : null,
    bracketIndex: match.bracketIndex,
    players: match.players.map((p) => ({
      userId: String(p.user),
      username: p.username,
      score: p.score,
      result: p.result,
      correctCount: p.correctCount,
      total: match.questions.length,
    })),
  });
}

async function forfeit(matchId, userId) {
  const match = await Match.findOneAndUpdate(
    { _id: matchId, status: { $in: ['waiting', 'active'] }, 'players.user': userId },
    { $set: { 'players.$.forfeited': true, 'players.$.connected': false } },
    { new: true }
  );
  if (!match) return;
  io().to(roomOf(matchId)).emit('battle:playerLeft', { userId });

  const remaining = match.players.filter((p) => !p.forfeited);
  if (remaining.length <= 1) {
    if (match.status === 'waiting') {
      await Match.updateOne({ _id: matchId }, { $set: { status: 'active' } });
    }
    await finishMatch(matchId);
  } else if (match.status === 'active' && match.currentIndex >= 0 && remaining.every((p) => p.answers.some((a) => a.qIndex === match.currentIndex))) {
    await revealQuestion(matchId, match.currentIndex);
  }
}

// Called when a socket disconnects: give the player GRACE_MS to come back.
async function handleDisconnect(user) {
  const matches = await Match.find({ status: { $in: ['waiting', 'active'] }, 'players.user': user._id });
  for (const match of matches) {
    await Match.updateOne({ _id: match._id, 'players.user': user._id }, { $set: { 'players.$.connected': false } });
    if (match.status !== 'active') continue;
    const key = `${match._id}:${user._id}`;
    if (graceTimers.has(key)) clearTimeout(graceTimers.get(key));
    graceTimers.set(
      key,
      setTimeout(async () => {
        graceTimers.delete(key);
        const fresh = await Match.findById(match._id);
        const p = fresh && fresh.players.find((x) => sameId(x.user, user._id));
        if (p && !p.connected) await forfeit(match._id, user._id);
      }, GRACE_MS)
    );
  }
}

module.exports = {
  createMatch,
  joinMatch,
  submitAnswer,
  forfeit,
  handleDisconnect,
  publicState,
  decideResults,
};
