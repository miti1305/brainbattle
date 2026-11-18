// F8: Quiz Authoring & Publishing Workflow
// Owner: Farin (Medium)
// Mounted at /api/quizzes in routes/index.js (already registered, you don't need to edit index.js).
//
// How to build this feature (MVC):
//   1. Model      -> server/src/models/<Name>.js
//   2. Controller -> server/src/controllers/quizController.js (functions wrapped in asyncHandler)
//   3. Routes     -> replace the placeholder below with real routes that call the controller
const router = require('express').Router();
const { protect } = require('../middleware/auth');

router.use(protect);

// Placeholder: remove when you add real routes.
router.get('/', (req, res) => {
  res.status(501).json({ feature: 'F8', name: 'Quiz Authoring & Publishing Workflow', owner: 'Farin', status: 'not implemented yet' });
});

module.exports = router;
