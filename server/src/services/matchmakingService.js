// F2 (Abrar): skill-based matchmaking. The allowed rating gap grows the longer a player waits.
const mongoose = require('mongoose');
const MatchQueueEntry = require('../models/MatchQueueEntry');
const battleService = require('./battleService');

const BASE_RANGE = 100; // rating difference allowed immediately
const DEFAULT_STEP = 50; // extra difference allowed every STEP_SECONDS
const STEP_SECONDS = 10;
const MAX_RANGE = 600;
const TIMEOUT_SECONDS = 120; // leave the queue automatically after 2 minutes

function allowedRange(joinedAt, now, step = DEFAULT_STEP) {
  const waited = Math.max(0, (now - new Date(joinedAt).getTime()) / 1000);
  return Math.min(MAX_RANGE, BASE_RANGE + step * Math.floor(waited / STEP_SECONDS));
}

const sameCategory = (a, b) => !a.category || !b.category || String(a.category) === String(b.category);

/**
 * Pure pairing logic (unit tested). Oldest players are matched first.
 * @returns {Array<[entry, entry]>}
 */
function findPairs(entries, now, step = DEFAULT_STEP) {
  const sorted = [...entries].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
  const used = new Set();
  const pairs = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    if (used.has(i)) continue;
    let best = -1;
    let bestDiff = Infinity;
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      if (used.has(j) || !sameCategory(a, b)) continue;
      const diff = Math.abs(a.rating - b.rating);
      if (diff <= allowedRange(a.joinedAt, now, step) && diff <= allowedRange(b.joinedAt, now, step) && diff < bestDiff) {
        best = j;
        bestDiff = diff;
      }
    }
    if (best >= 0) {
      used.add(i);
      used.add(best);
      pairs.push([a, sorted[best]]);
    }
  }
  return pairs;
}

// Admins can change the step in F16 settings (Moontaha). Falls back to the default before F16 exists.
async function currentStep() {
  const Settings = mongoose.models.SystemSettings;
  if (!Settings) return DEFAULT_STEP;
  const s = await Settings.findOne().lean();
  return (s && s.matchmakingRangeStep) || DEFAULT_STEP;
}

let running = false;

async function runMatchmaking() {
  if (running) return;
  running = true;
  const io = require('../sockets').getIO();
  try {
    const now = Date.now();

    const expired = await MatchQueueEntry.find({ joinedAt: { $lt: new Date(now - TIMEOUT_SECONDS * 1000) } });
    for (const e of expired) {
      await MatchQueueEntry.deleteOne({ _id: e._id });
      io.to(`user:${e.user}`).emit('matchmaking:timeout', { message: 'No opponent found. Try again.' });
    }

    const entries = await MatchQueueEntry.find().lean();
    const pairs = findPairs(entries, now, await currentStep());
    for (const [a, b] of pairs) {
      const removed = await MatchQueueEntry.deleteMany({ _id: { $in: [a._id, b._id] } });
      if (removed.deletedCount !== 2) continue; // someone left the queue meanwhile
      try {
        const match = await battleService.createMatch({
          userIds: [a.user, b.user],
          mode: 'ranked',
          categoryId: a.category || b.category,
          questionCount: 10,
          questionTime: 15,
        });
        for (const e of [a, b]) io.to(`user:${e.user}`).emit('matchmaking:found', { matchId: String(match._id) });
      } catch (err) {
        for (const e of [a, b]) io.to(`user:${e.user}`).emit('matchmaking:error', { message: err.message });
      }
    }
  } finally {
    running = false;
  }
}

module.exports = { BASE_RANGE, DEFAULT_STEP, STEP_SECONDS, MAX_RANGE, TIMEOUT_SECONDS, allowedRange, findPairs, runMatchmaking };
