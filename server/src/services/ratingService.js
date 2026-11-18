// F3 (Abrar): reading and updating PlayerRating documents.
const PlayerRating = require('../models/PlayerRating');
const { calculateRatingChanges, tierFor } = require('./eloService');

async function getOrCreateRating(userId) {
  let rating = await PlayerRating.findOne({ user: userId });
  if (!rating) {
    try {
      rating = await PlayerRating.create({ user: userId });
    } catch (err) {
      if (err.code !== 11000) throw err;
      rating = await PlayerRating.findOne({ user: userId }); // created at the same moment by another request
    }
  }
  return rating;
}

/**
 * Applies the results of a finished match.
 * @param {object} match  finished Match document (players already have `result`)
 * @returns {Object<string, number>} userId -> rating change (only for ranked matches)
 */
async function applyMatchResults(match) {
  const ranked = match.mode === 'ranked';
  const ratings = await Promise.all(match.players.map((p) => getOrCreateRating(p.user)));

  const changes = ranked
    ? calculateRatingChanges(
        match.players.map((p, i) => ({
          id: String(p.user),
          rating: ratings[i].rating,
          matchScore: p.forfeited ? -1 : p.score,
        }))
      )
    : {};

  const now = new Date();
  await Promise.all(
    match.players.map((p, i) => {
      const r = ratings[i];
      r.gamesPlayed += 1;
      if (p.result === 'win') r.wins += 1;
      else if (p.result === 'draw') r.draws += 1;
      else r.losses += 1;

      if (ranked) {
        const delta = changes[String(p.user)] || 0;
        p.ratingBefore = r.rating;
        r.rating = Math.max(100, r.rating + delta);
        p.ratingAfter = r.rating;
        r.tier = tierFor(r.rating);
        r.peakRating = Math.max(r.peakRating, r.rating);
        r.ratedAt = now;
        r.weeklyPoints += Math.max(0, p.score);
        r.weeklyUpdatedAt = now;
      }
      return r.save();
    })
  );

  return changes;
}

module.exports = { getOrCreateRating, applyMatchResults };
