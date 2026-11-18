// CONTROLLER (F10 Farin, admin only): categories and the official question bank.
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Quiz = require('../models/Quiz');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { validateQuiz } = require('../services/quizValidation');
const { emitEvent, EVENTS } = require('../services/eventBus');

// GET /api/admin/content/categories
exports.listCategories = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ order: 1, name: 1 }),
    Quiz.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  res.json({
    categories: categories.map((c) => ({ ...c.toObject(), quizCount: (counts.find((x) => String(x._id) === String(c._id)) || {}).count || 0 })),
  });
});

// POST /api/admin/content/categories  { name, icon, order }
exports.createCategory = asyncHandler(async (req, res) => {
  if (!req.body.name || !String(req.body.name).trim()) throw new HttpError(400, 'Name is required');
  const category = await Category.create({ name: req.body.name, icon: req.body.icon, order: Number(req.body.order) || 0 });
  res.status(201).json({ category });
});

// PUT /api/admin/content/categories/:id
exports.updateCategory = asyncHandler(async (req, res) => {
  const update = {};
  ['name', 'icon'].forEach((k) => {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  });
  if (req.body.order !== undefined) update.order = Number(req.body.order) || 0;
  const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!category) throw new HttpError(404, 'Category not found');
  res.json({ category });
});

// DELETE /api/admin/content/categories/:id  - only if no quiz uses it
exports.deleteCategory = asyncHandler(async (req, res) => {
  const used = await Quiz.countDocuments({ category: req.params.id });
  if (used) throw new HttpError(400, `${used} quiz(zes) use this category. Move them first.`);
  await Category.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// GET /api/admin/content/quizzes?filter=pending|official|featured|all&q=
exports.listQuizzes = asyncHandler(async (req, res) => {
  const filter = { status: 'published' };
  if (req.query.filter === 'pending' || !req.query.filter) filter.isOfficial = false;
  if (req.query.filter === 'official') filter.isOfficial = true;
  if (req.query.filter === 'featured') filter.isFeatured = true;
  if (req.query.q) filter.title = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const quizzes = await Quiz.find(filter).sort({ updatedAt: -1 }).limit(100).populate('category', 'name').populate('author', 'username');
  res.json({
    quizzes: quizzes.map((q) => ({
      _id: q._id,
      title: q.title,
      category: q.category,
      author: q.author,
      difficulty: q.difficulty,
      isOfficial: q.isOfficial,
      isFeatured: q.isFeatured,
      playCount: q.playCount,
      questionCount: q.questions.length,
      updatedAt: q.updatedAt,
    })),
  });
});

// GET /api/admin/content/quizzes/:id  - full quiz with answers for review
exports.getQuiz = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Quiz not found');
  const quiz = await Quiz.findById(req.params.id).populate('category', 'name').populate('author', 'username');
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  res.json({ quiz, problems: validateQuiz(quiz) });
});

// POST /api/admin/content/quizzes/:id/approve  - add to the official question bank
exports.approve = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  if (quiz.status !== 'published') throw new HttpError(400, 'Only published quizzes can be approved');
  const problems = validateQuiz(quiz);
  if (problems.length) return res.status(400).json({ message: 'This quiz has problems', errors: problems });
  quiz.isOfficial = true;
  await quiz.save();
  emitEvent(EVENTS.QUIZ_APPROVED, { quizId: String(quiz._id), authorId: String(quiz.author), title: quiz.title });
  return res.json({ quiz });
});

// POST /api/admin/content/quizzes/:id/revoke  - remove from the official bank
exports.revoke = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByIdAndUpdate(req.params.id, { isOfficial: false }, { new: true });
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  res.json({ quiz });
});

// POST /api/admin/content/quizzes/:id/feature  { featured: true|false }
exports.feature = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOneAndUpdate({ _id: req.params.id, status: 'published' }, { isFeatured: !!req.body.featured }, { new: true });
  if (!quiz) throw new HttpError(404, 'Published quiz not found');
  res.json({ quiz });
});
