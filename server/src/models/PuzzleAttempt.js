// MODEL (F6/F7 Farin): one player's progress on one puzzle (autosaved).
const mongoose = require('mongoose');

const puzzleAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    puzzle: { type: mongoose.Schema.Types.ObjectId, ref: 'Puzzle', required: true },
    type: String,
    difficulty: String,
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    hintsUsed: { type: Number, default: 0 },
    solved: { type: Boolean, default: false },
    gaveUp: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    isDaily: { type: Boolean, default: false },
    dailyDate: String, // 'YYYY-MM-DD' for daily challenge attempts
    startedAt: { type: Date, default: Date.now },
    solvedAt: Date,
  },
  { timestamps: true }
);

// One daily attempt per user per day.
puzzleAttemptSchema.index({ user: 1, dailyDate: 1 }, { unique: true, partialFilterExpression: { isDaily: true } });

module.exports = mongoose.model('PuzzleAttempt', puzzleAttemptSchema);
