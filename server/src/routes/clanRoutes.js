// F13: Clans / Study Groups (Owner: Mim, Medium)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/clanController');

router.use(protect);

router.get('/', c.list);
router.get('/mine', c.mine);
router.post('/', c.create);
router.get('/:id', c.get);
router.post('/:id/join', c.join);
router.post('/:id/leave', c.leave);
router.patch('/:id/members/:userId', c.setRole);
router.delete('/:id/members/:userId', c.removeMember);
router.post('/:id/transfer', c.transfer);
router.post('/:id/challenges', c.addChallenge);
router.delete('/:id/challenges/:challengeId', c.removeChallenge);

module.exports = router;
