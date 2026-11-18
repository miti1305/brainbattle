// F2 (Abrar): every 5 seconds, pair queued players by rating.
const cron = require('node-cron');
const { runMatchmaking } = require('../services/matchmakingService');

module.exports = function startMatchmakingJob() {
  cron.schedule('*/5 * * * * *', () => {
    runMatchmaking().catch((err) => console.error('Matchmaking job failed:', err.message));
  });
};
