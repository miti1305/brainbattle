// F10: Category & Official Question Bank Management (Owner: Farin, Easy, admin only)
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/adminContentController');

router.use(protect, authorize('admin'));

router.get('/categories', c.listCategories);
router.post('/categories', c.createCategory);
router.put('/categories/:id', c.updateCategory);
router.delete('/categories/:id', c.deleteCategory);
router.get('/quizzes', c.listQuizzes);
router.get('/quizzes/:id', c.getQuiz);
router.post('/quizzes/:id/approve', c.approve);
router.post('/quizzes/:id/revoke', c.revoke);
router.post('/quizzes/:id/feature', c.feature);

module.exports = router;
