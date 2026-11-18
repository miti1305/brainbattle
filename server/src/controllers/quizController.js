// CONTROLLER (F8 Farin): quiz authoring and publishing workflow (one feature: create, edit, delete,
// validate, draft/publish, CSV import), plus browsing published quizzes.
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { validateQuiz, questionsFromCsv } = require('../services/quizValidation');
const { emitEvent, EVENTS } = require('../services/eventBus');

const canEdit = (quiz, user) => String(quiz.author) === String(user._id) || user.role === 'admin';

async function loadQuiz(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Quiz not found');
  const quiz = await Quiz.findById(id);
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  return quiz;
}

function cleanQuestions(list) {
  if (!Array.isArray(list)) return undefined;
  return list.map((q) => ({
    text: String(q.text || ''),
    type: ['mcq', 'truefalse', 'image'].includes(q.type) ? q.type : 'mcq',
    imageUrl: q.imageUrl || '',
    options: q.type === 'truefalse' ? ['True', 'False'] : (Array.isArray(q.options) ? q.options.map(String) : []),
    correctIndex: Number.isInteger(Number(q.correctIndex)) ? Number(q.correctIndex) : -1,
    explanation: q.explanation || '',
  }));
}

const summary = (q) => ({
  _id: q._id,
  title: q.title,
  description: q.description,
  category: q.category,
  difficulty: q.difficulty,
  status: q.status,
  isOfficial: q.isOfficial,
  isFeatured: q.isFeatured,
  playCount: q.playCount,
  author: q.author,
  questionCount: q.questions.length,
  updatedAt: q.updatedAt,
});

// GET /api/quizzes?q=&category=&difficulty=&page=  - browse published quizzes
exports.browse = asyncHandler(async (req, res) => {
  const filter = { status: 'published' };
  if (req.query.q) filter.title = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (mongoose.isValidObjectId(req.query.category)) filter.category = req.query.category;
  if (['easy', 'medium', 'hard'].includes(req.query.difficulty)) filter.difficulty = req.query.difficulty;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const quizzes = await Quiz.find(filter)
    .sort({ isFeatured: -1, isOfficial: -1, playCount: -1 })
    .skip((page - 1) * 20)
    .limit(20)
    .populate('category', 'name')
    .populate('author', 'username');
  res.json({ quizzes: quizzes.map(summary), page });
});

// GET /api/quizzes/mine
exports.mine = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ author: req.user._id }).sort({ updatedAt: -1 }).populate('category', 'name');
  res.json({ quizzes: quizzes.map(summary) });
});

// GET /api/quizzes/:id  - authors/admins get answers; others only see published quizzes without answers
exports.get = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('category', 'name').populate('author', 'username');
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  const editor = String(quiz.author._id) === String(req.user._id) || req.user.role === 'admin';
  if (!editor && quiz.status !== 'published') throw new HttpError(404, 'Quiz not found');
  const obj = quiz.toObject();
  if (!editor) obj.questions = obj.questions.map(({ text, type, imageUrl, options }) => ({ text, type, imageUrl, options }));
  res.json({ quiz: obj, canEdit: editor });
});

// POST /api/quizzes  - new quiz starts as a draft
exports.create = asyncHandler(async (req, res) => {
  const { title, description, category, difficulty } = req.body;
  if (!title) throw new HttpError(400, 'Title is required');
  if (!mongoose.isValidObjectId(category)) throw new HttpError(400, 'Choose a category');
  const quiz = await Quiz.create({
    title,
    description,
    category,
    difficulty,
    author: req.user._id,
    status: 'draft',
    questions: cleanQuestions(req.body.questions) || [],
  });
  res.status(201).json({ quiz });
});

// PUT /api/quizzes/:id
exports.update = asyncHandler(async (req, res) => {
  const quiz = await loadQuiz(req.params.id);
  if (!canEdit(quiz, req.user)) throw new HttpError(403, 'Only the author can edit this quiz');
  ['title', 'description', 'difficulty'].forEach((k) => {
    if (req.body[k] !== undefined) quiz[k] = req.body[k];
  });
  if (req.body.category !== undefined) quiz.category = req.body.category;
  const questions = cleanQuestions(req.body.questions);
  if (questions) quiz.questions = questions;

  if (quiz.status === 'published') {
    const errors = validateQuiz(quiz);
    if (errors.length) return res.status(400).json({ message: 'A published quiz must stay valid. Fix these problems or unpublish first.', errors });
  }
  await quiz.save();
  return res.json({ quiz });
});

// DELETE /api/quizzes/:id
exports.remove = asyncHandler(async (req, res) => {
  const quiz = await loadQuiz(req.params.id);
  if (!canEdit(quiz, req.user)) throw new HttpError(403, 'Only the author can delete this quiz');
  await quiz.deleteOne();
  res.json({ ok: true });
});

// POST /api/quizzes/:id/publish  - incomplete quizzes cannot be published
exports.publish = asyncHandler(async (req, res) => {
  const quiz = await loadQuiz(req.params.id);
  if (!canEdit(quiz, req.user)) throw new HttpError(403, 'Only the author can publish this quiz');
  const errors = validateQuiz(quiz);
  if (errors.length) return res.status(400).json({ message: 'This quiz cannot be published yet', errors });
  const wasDraft = quiz.status !== 'published';
  quiz.status = 'published';
  await quiz.save();
  if (wasDraft) emitEvent(EVENTS.QUIZ_PUBLISHED, { quizId: String(quiz._id), authorId: String(quiz.author), title: quiz.title });
  return res.json({ quiz });
});

// POST /api/quizzes/:id/unpublish
exports.unpublish = asyncHandler(async (req, res) => {
  const quiz = await loadQuiz(req.params.id);
  if (!canEdit(quiz, req.user)) throw new HttpError(403, 'Only the author can unpublish this quiz');
  quiz.status = 'draft';
  quiz.isOfficial = false;
  quiz.isFeatured = false;
  await quiz.save();
  res.json({ quiz });
});

// POST /api/quizzes/:id/import-csv  { csv, mode: 'append' | 'replace' }  - all rows valid or nothing is imported
exports.importCsv = asyncHandler(async (req, res) => {
  const quiz = await loadQuiz(req.params.id);
  if (!canEdit(quiz, req.user)) throw new HttpError(403, 'Only the author can import questions');
  if (!req.body.csv) throw new HttpError(400, 'CSV text is missing');
  const { questions, errors } = questionsFromCsv(req.body.csv);
  if (errors.length) return res.status(400).json({ message: `${errors.length} row(s) have problems. Nothing was imported.`, errors });
  quiz.questions = req.body.mode === 'replace' ? questions : [...quiz.questions, ...questions];
  await quiz.save();
  return res.json({ quiz, imported: questions.length });
});
