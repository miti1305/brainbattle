// CONTROLLER: read-only category list for everyone. Admin create/edit/delete lives in F10 (Farin).
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ order: 1, name: 1 });
  res.json({ categories });
});
