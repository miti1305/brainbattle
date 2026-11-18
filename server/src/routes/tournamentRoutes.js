// F11: Tournament Management (Owner: Mim, Hard)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/tournamentController');

router.use(protect);

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.post('/:id/register', c.register);
router.post('/:id/unregister', c.unregister);
router.post('/:id/start', c.start);
router.post('/:id/cancel', c.cancel);
router.post('/:id/matches/:index/play', c.play);
router.post('/:id/matches/:index/walkover', c.walkover);

module.exports = router;
