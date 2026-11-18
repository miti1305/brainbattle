// F10: Category & Official Question Bank Management (Admin)
// Owner: Farin (Easy)
// Mounted at /api/admin/content in routes/index.js (already registered, you don't need to edit index.js).
//
// How to build this feature (MVC):
//   1. Model      -> server/src/models/<Name>.js
//   2. Controller -> server/src/controllers/adminContentController.js (functions wrapped in asyncHandler)
//   3. Routes     -> replace the placeholder below with real routes that call the controller
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

// Placeholder: remove when you add real routes.
router.get('/', (req, res) => {
  res.status(501).json({ feature: 'F10', name: 'Category & Official Question Bank Management (Admin)', owner: 'Farin', status: 'not implemented yet' });
});

module.exports = router;
