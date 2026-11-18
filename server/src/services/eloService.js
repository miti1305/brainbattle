// F3 (Abrar): Elo rating maths. Pure functions (no database), easy to unit test.
const K = 32;
const DEFAULT_RATING = 1200;

const TIERS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 1100 },
  { name: 'Gold', min: 1300 },
  { name: 'Platinum', min: 1500 },
  { name: 'Diamond', min: 1700 },
];

function tierFor(rating) {
  let tier = TIERS[0].name;
  for (const t of TIERS) if (rating >= t.min) tier = t.name;
  return tier;
}

// Probability that a player rated `a` beats a player rated `b`.
function expectedScore(a, b) {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/**
 * Rating change for every player. Works for 2-4 players by comparing each pair
 * (higher match score = win of that pair) and averaging.
 * @param {Array<{id: string, rating: number, matchScore: number}>} players
 * @returns {Object<string, number>} id -> rating change (rounded)
 */
function calculateRatingChanges(players) {
  const changes = {};
  const n = players.length;
  for (const p of players) {
    if (n < 2) {
      changes[p.id] = 0;
      continue;
    }
    let sum = 0;
    for (const q of players) {
      if (q === p) continue;
      let actual = 0.5;
      if (p.matchScore > q.matchScore) actual = 1;
      else if (p.matchScore < q.matchScore) actual = 0;
      sum += K * (actual - expectedScore(p.rating, q.rating));
    }
    changes[p.id] = Math.round(sum / (n - 1));
  }
  return changes;
}

module.exports = { K, DEFAULT_RATING, TIERS, tierFor, expectedScore, calculateRatingChanges };
