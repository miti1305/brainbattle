// F1: Real-Time Multiplayer Quiz Battle (Owner: Abrar, Hard)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/battleController');

router.use(protect);

router.get('/active', c.listActive);
router.get('/:id', c.getMatch);
router.post('/:id/leave', c.leaveMatch);

module.exports = router;
