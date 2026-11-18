// F11 (Mim): saves bracket results and sends notifications.
const Tournament = require('../models/Tournament');
const { recordResult } = require('./bracketService');
const { emitEvent, EVENTS } = require('./eventBus');

function announceReady(t, indexes) {
  const now = new Date();
  for (const i of indexes) {
    const m = t.matches[i];
    m.readyAt = now;
    emitEvent(EVENTS.TOURNAMENT_MATCH_READY, {
      tournamentId: String(t._id),
      tournamentName: t.name,
      bracketIndex: i,
      userIds: [String(m.playerA), String(m.playerB)],
    });
  }
}

/** Applies a result to a tournament document and saves it. */
async function applyResult(t, index, result) {
  const plain = t.matches.map((m) => m.toObject());
  const { newlyReady, championId } = recordResult(t.format, plain, index, result, t.participants.map((p) => p.user));
  t.matches = plain;
  announceReady(t, newlyReady);
  if (championId) {
    t.champion = championId;
    t.status = 'finished';
  }
  t.markModified('matches');
  await t.save();
  if (championId) emitEvent(EVENTS.TOURNAMENT_FINISHED, { tournamentId: String(t._id), name: t.name, championId });
  return t;
}

/** Called by the listener when an F1 battle that belongs to a tournament finishes. */
async function handleMatchFinished({ matchId, tournamentId, bracketIndex, players }) {
  const t = await Tournament.findById(tournamentId);
  if (!t || t.status !== 'ongoing') return;
  const bm = t.matches[bracketIndex];
  if (!bm || String(bm.match) !== String(matchId) || bm.status === 'done') return;

  const a = players.find((p) => String(p.userId) === String(bm.playerA));
  const b = players.find((p) => String(p.userId) === String(bm.playerB));
  const winner = players.find((p) => p.result === 'win');
  const draw = !winner;

  if (draw && t.format === 'single') {
    // Knockout matches need a winner: open the match for a replay.
    bm.status = 'ready';
    bm.match = null;
    t.markModified('matches');
    await t.save();
    announceReady(t, [bracketIndex]);
    await t.save();
    return;
  }

  await applyResult(t, bracketIndex, {
    winnerId: winner ? winner.userId : null,
    isDraw: draw,
    scoreA: a ? a.score : undefined,
    scoreB: b ? b.score : undefined,
  });
}

module.exports = { applyResult, announceReady, handleMatchFinished };
