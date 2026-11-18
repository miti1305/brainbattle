// F3: Ranked Rating & Leaderboards (Owner: Abrar, Medium)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/leaderboardController');

router.use(protect);

router.get('/', c.getLeaderboard);
router.get('/me', c.getMyRating);

module.exports = router;
