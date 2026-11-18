// Unit tests for Abrar's pure logic (F2, F3, F1). Run: npm test
const { calculateRatingChanges, tierFor, expectedScore } = require('../src/services/eloService');
const { allowedRange, findPairs } = require('../src/services/matchmakingService');
const { decideResults } = require('../src/services/battleService');

describe('F3 Elo rating', () => {
  test('1200 player beats 1400 player: +24 / -24', () => {
    const c = calculateRatingChanges([
      { id: 'a', rating: 1200, matchScore: 900 },
      { id: 'b', rating: 1400, matchScore: 500 },
    ]);
    expect(c.a).toBe(24);
    expect(c.b).toBe(-24);
  });

  test('draw between equal players changes nothing', () => {
    const c = calculateRatingChanges([
      { id: 'a', rating: 1200, matchScore: 300 },
      { id: 'b', rating: 1200, matchScore: 300 },
    ]);
    expect(c.a).toBe(0);
    expect(c.b).toBe(0);
  });

  test('expected score is 0.5 for equal ratings', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  test('tiers', () => {
    expect(tierFor(1000)).toBe('Bronze');
    expect(tierFor(1200)).toBe('Silver');
    expect(tierFor(1350)).toBe('Gold');
    expect(tierFor(1600)).toBe('Platinum');
    expect(tierFor(1800)).toBe('Diamond');
  });
});

describe('F2 Matchmaking', () => {
  const now = Date.now();
  test('range widens while waiting', () => {
    expect(allowedRange(now, now)).toBe(100);
    expect(allowedRange(now - 30000, now)).toBe(250);
  });

  test('close ratings are paired, far ratings wait', () => {
    const entries = [
      { _id: 1, user: 'u1', rating: 1200, joinedAt: now },
      { _id: 2, user: 'u2', rating: 1250, joinedAt: now },
      { _id: 3, user: 'u3', rating: 1800, joinedAt: now },
    ];
    const pairs = findPairs(entries, now);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].map((e) => e.user).sort()).toEqual(['u1', 'u2']);
  });

  test('far ratings are paired after a long wait', () => {
    const old = now - 60000; // 60 s -> range 400
    const pairs = findPairs([
      { user: 'a', rating: 1200, joinedAt: old },
      { user: 'b', rating: 1550, joinedAt: old },
    ], now);
    expect(pairs).toHaveLength(1);
  });
});

describe('F1 Battle results', () => {
  test('highest score wins, forfeit is marked', () => {
    const players = [{ score: 300 }, { score: 500 }, { score: 900, forfeited: true }];
    decideResults(players);
    expect(players.map((p) => p.result)).toEqual(['loss', 'win', 'forfeit']);
  });

  test('equal top scores are a draw', () => {
    const players = [{ score: 400 }, { score: 400 }];
    decideResults(players);
    expect(players.map((p) => p.result)).toEqual(['draw', 'draw']);
  });
});
