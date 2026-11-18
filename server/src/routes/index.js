// All API routes. Every feature route file is already registered here so members
// do NOT need to edit this file (this avoids merge conflicts).
const router = require('express').Router();

// Supporting (not counted as features)
router.use('/auth', require('./authRoutes'));
router.use('/categories', require('./categoryRoutes'));

// Features F1-F20 ('/admin/content' must stay above '/admin')
router.use('/admin/content', require('./adminContentRoutes')); // F10 Farin
router.use('/battles', require('./battleRoutes')); // F1 Abrar
router.use('/matchmaking', require('./matchmakingRoutes')); // F2 Abrar
router.use('/leaderboards', require('./leaderboardRoutes')); // F3 Abrar
router.use('/rooms', require('./roomRoutes')); // F4 Abrar
router.use('/matches', require('./matchHistoryRoutes')); // F5 Abrar
router.use('/puzzles', require('./puzzleRoutes')); // F6 Farin
router.use('/daily', require('./dailyChallengeRoutes')); // F7 Farin
router.use('/quizzes', require('./quizRoutes')); // F8 Farin
router.use('/recommendations', require('./recommendationRoutes')); // F9 Farin
router.use('/tournaments', require('./tournamentRoutes')); // F11 Mim
router.use('/friends', require('./friendRoutes')); // F12 Mim
router.use('/clans', require('./clanRoutes')); // F13 Mim
router.use('/feed', require('./feedRoutes')); // F14 Mim
router.use('/analytics', require('./analyticsRoutes')); // F15 Mim
router.use('/admin', require('./adminRoutes')); // F16 Moontaha
router.use('/progress', require('./progressRoutes')); // F17 Moontaha
router.use('/moderation', require('./moderationRoutes')); // F18 Moontaha
router.use('/practice', require('./practiceRoutes')); // F19 Moontaha
router.use('/notifications', require('./notificationRoutes')); // F20 Moontaha

module.exports = router;
