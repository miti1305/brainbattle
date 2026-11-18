// F6: Interactive Puzzle Engine (Owner: Farin, Hard)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/puzzleController');

router.use(protect);

router.get('/', c.listMine);
router.post('/', c.startNew);
router.get('/attempts/:id', c.getAttempt);
router.put('/attempts/:id/state', c.saveState);
router.post('/attempts/:id/move', c.move);
router.post('/attempts/:id/hint', c.hint);
router.post('/attempts/:id/check', c.check);
router.post('/attempts/:id/give-up', c.giveUp);

module.exports = router;
