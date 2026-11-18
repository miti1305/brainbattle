// F12: Friends & Social Connections (Owner: Mim, Medium)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/friendController');

router.use(protect);

router.get('/', c.listFriends);
router.get('/requests', c.listRequests);
router.post('/requests', c.sendRequest);
router.post('/requests/:id/accept', c.acceptRequest);
router.post('/requests/:id/decline', c.declineRequest);
router.get('/blocked', c.listBlocked);
router.post('/block', c.block);
router.post('/unblock', c.unblock);
router.get('/search', c.search);
router.get('/suggestions', c.suggestions);
router.post('/challenge', c.challenge);
router.delete('/:userId', c.removeFriend);

module.exports = router;
