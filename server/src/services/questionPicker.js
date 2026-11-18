// SHARED: picks random questions from published quizzes (official ones first).
// Used by F1 Battle / F4 Rooms (Abrar) and F19 Solo Practice (Moontaha).
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');

/**
 * @param {object} opts
 * @param {string} [opts.categoryId]  only this category (optional)
 * @param {string} [opts.difficulty]  'easy' | 'medium' | 'hard' (optional)
 * @param {number} [opts.count=10]
 * @returns {Promise<Array<{quiz, category, text, type, imageUrl, options, correctIndex, explanation}>>}
 */
async function pickQuestions({ categoryId, difficulty, count = 10 } = {}) {
  const base = { status: 'published' };
  if (categoryId && mongoose.isValidObjectId(categoryId)) base.category = new mongoose.Types.ObjectId(categoryId);
  if (difficulty) base.difficulty = difficulty;

  const sample = (match, size) =>
    Quiz.aggregate([
      { $match: match },
      { $unwind: '$questions' },
      { $sample: { size } },
      {
        $project: {
          _id: 0,
          quiz: '$_id',
          category: '$category',
          text: '$questions.text',
          type: '$questions.type',
          imageUrl: '$questions.imageUrl',
          options: '$questions.options',
          correctIndex: '$questions.correctIndex',
          explanation: '$questions.explanation',
        },
      },
    ]);

  let questions = await sample({ ...base, isOfficial: true }, count);
  if (questions.length < count) {
    const seen = new Set(questions.map((q) => q.text));
    const extra = (await sample(base, count * 2)).filter((q) => !seen.has(q.text));
    questions = questions.concat(extra).slice(0, count);
  }

  const quizIds = [...new Set(questions.map((q) => String(q.quiz)))];
  if (quizIds.length) await Quiz.updateMany({ _id: { $in: quizIds } }, { $inc: { playCount: 1 } });

  return questions;
}

// Removes answers before sending questions to players.
const hideAnswers = (questions) =>
  questions.map(({ text, type, imageUrl, options }) => ({ text, type, imageUrl, options }));

module.exports = { pickQuestions, hideAnswers };
