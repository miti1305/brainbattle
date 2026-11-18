// F8: Quiz Authoring & Publishing Workflow (Owner: Farin, Medium)
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const c = require('../controllers/quizController');

router.use(protect);

router.get('/', c.browse);
router.get('/mine', c.mine);
router.post('/', c.create);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/publish', c.publish);
router.post('/:id/unpublish', c.unpublish);
router.post('/:id/import-csv', c.importCsv);

module.exports = router;
