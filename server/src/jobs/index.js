// Scheduled jobs (node-cron). Each job file exports a start function.
const startMatchmakingJob = require('./matchmakingJob');
const startDailyResetJob = require('./dailyResetJob');
const startWeeklyResetJob = require('./weeklyResetJob');
const startStreakJob = require('./streakJob');

function startJobs() {
  if (process.env.NODE_ENV === 'test') return;
  startMatchmakingJob(); // F2 (Abrar)
  startWeeklyResetJob(); // F3 (Abrar)
  startDailyResetJob(); // F7 (Farin)
  startStreakJob(); // F17 (Moontaha)
}

module.exports = { startJobs };
