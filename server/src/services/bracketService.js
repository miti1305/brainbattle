// F11 (Mim): bracket generation and advancement. Pure functions (no database), unit tested.
// A bracket is a flat array of matches: { round, slot, playerA, playerB, winner, status, isBye, isDraw }

function shuffle(list, rand = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const nextPowerOfTwo = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));
const eq = (a, b) => a != null && b != null && String(a) === String(b);
const findIndex = (bracket, round, slot) => bracket.findIndex((m) => m.round === round && m.slot === slot);

/**
 * Single elimination with byes. Every player gets at most one bye, and byes never meet each other.
 * @param {string[]} playerIds
 */
function generateSingleElimination(playerIds, rand = Math.random) {
  if (playerIds.length < 2) throw new Error('At least 2 players are needed');
  const players = shuffle(playerIds, rand);
  const size = nextPowerOfTwo(players.length);
  const rounds = Math.log2(size);
  const half = size / 2;
  const bracket = [];

  for (let r = 1; r <= rounds; r += 1) {
    const count = size / 2 ** r;
    for (let s = 0; s < count; s += 1) {
      bracket.push({ round: r, slot: s, playerA: null, playerB: null, winner: null, status: 'pending', isBye: false, isDraw: false });
    }
  }

  for (let s = 0; s < half; s += 1) {
    const m = bracket[findIndex(bracket, 1, s)];
    m.playerA = players[s];
    m.playerB = players[s + half] !== undefined ? players[s + half] : null;
    if (m.playerB === null) {
      m.isBye = true;
      m.winner = m.playerA;
      m.status = 'done';
    } else {
      m.status = 'ready';
    }
  }

  // Byes move their player into round 2 straight away.
  for (const m of bracket.filter((x) => x.round === 1 && x.isBye)) placeWinner(bracket, m);
  return bracket;
}

// Puts the winner of `m` into the next round and marks that match ready if both players are known.
function placeWinner(bracket, m) {
  const next = bracket[findIndex(bracket, m.round + 1, Math.floor(m.slot / 2))];
  if (!next) return null;
  if (m.slot % 2 === 0) next.playerA = m.winner;
  else next.playerB = m.winner;
  if (next.playerA && next.playerB && next.status === 'pending') next.status = 'ready';
  return next;
}

/** Round robin: everyone plays everyone once (circle method). */
function generateRoundRobin(playerIds, rand = Math.random) {
  if (playerIds.length < 2) throw new Error('At least 2 players are needed');
  const players = shuffle(playerIds, rand);
  if (players.length % 2 === 1) players.push(null); // null = rest this round
  const n = players.length;
  const bracket = [];
  let list = [...players];
  for (let r = 1; r < n; r += 1) {
    for (let i = 0; i < n / 2; i += 1) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== null && b !== null) {
        bracket.push({ round: r, slot: i, playerA: a, playerB: b, winner: null, status: 'ready', isBye: false, isDraw: false });
      }
    }
    list = [list[0], list[n - 1], ...list.slice(1, n - 1)]; // rotate all but the first
  }
  return bracket;
}

/** Points: win 3, draw 1. Sorted by points, then wins. */
function roundRobinStandings(bracket, playerIds) {
  const table = new Map(playerIds.map((id) => [String(id), { userId: String(id), played: 0, wins: 0, draws: 0, losses: 0, points: 0 }]));
  for (const m of bracket) {
    if (m.status !== 'done') continue;
    const a = table.get(String(m.playerA));
    const b = table.get(String(m.playerB));
    if (!a || !b) continue;
    a.played += 1;
    b.played += 1;
    if (m.isDraw) {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    } else {
      const winA = eq(m.winner, m.playerA);
      (winA ? a : b).wins += 1;
      (winA ? b : a).losses += 1;
      (winA ? a : b).points += 3;
    }
  }
  return [...table.values()].sort((x, y) => y.points - x.points || y.wins - x.wins);
}

/**
 * Records a result. For single elimination a draw is not allowed (players must replay).
 * @returns {{ newlyReady: number[], championId: string|null }}
 */
function recordResult(format, bracket, index, { winnerId = null, isDraw = false, scoreA, scoreB } = {}, playerIds = []) {
  const m = bracket[index];
  if (!m || m.status === 'done') throw new Error('This bracket match is already finished');
  if (!isDraw && !eq(winnerId, m.playerA) && !eq(winnerId, m.playerB)) throw new Error('Winner must be one of the two players');
  if (isDraw && format === 'single') throw new Error('Single elimination matches cannot end in a draw');

  m.status = 'done';
  m.isDraw = isDraw;
  m.winner = isDraw ? null : winnerId;
  if (scoreA !== undefined) m.scoreA = scoreA;
  if (scoreB !== undefined) m.scoreB = scoreB;

  const newlyReady = [];
  let championId = null;

  if (format === 'single') {
    const next = placeWinner(bracket, m);
    if (next && next.status === 'ready') newlyReady.push(bracket.indexOf(next));
    const lastRound = Math.max(...bracket.map((x) => x.round));
    if (m.round === lastRound) championId = String(m.winner);
  } else if (bracket.every((x) => x.status === 'done')) {
    championId = roundRobinStandings(bracket, playerIds)[0].userId;
  }

  return { newlyReady, championId };
}

module.exports = { shuffle, nextPowerOfTwo, generateSingleElimination, generateRoundRobin, roundRobinStandings, recordResult };
