// F2: Skill-Based Matchmaking (Owner: Abrar, Medium)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/matchmakingController');

router.use(protect);

router.post('/join', c.join);
router.post('/leave', c.leave);
router.get('/status', c.status);

module.exports = router;
