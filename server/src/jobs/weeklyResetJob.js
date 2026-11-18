// F3 (Abrar): every Monday at 00:00, reset weekly leaderboard points.
const cron = require('node-cron');
const PlayerRating = require('../models/PlayerRating');

async function resetWeekly() {
  const res = await PlayerRating.updateMany({ weeklyPoints: { $gt: 0 } }, { $set: { weeklyPoints: 0, weeklyUpdatedAt: new Date() } });
  console.log(`Weekly leaderboard reset (${res.modifiedCount} players)`);
}

module.exports = function startWeeklyResetJob() {
  cron.schedule('0 0 * * 1', () => {
    resetWeekly().catch((err) => console.error('Weekly reset failed:', err.message));
  });
};

module.exports.resetWeekly = resetWeekly;
