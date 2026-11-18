// MODEL (F1 Abrar): one quiz battle between 2-4 players.
// Also used by F2 (ranked), F4 (private rooms), F5 (history) and read by F9, F11, F13, F15.
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    qIndex: Number,
    choice: Number,
    isCorrect: Boolean,
    timeMs: Number,
    points: Number,
  },
  { _id: false }
);

const playerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    answers: [answerSchema],
    result: { type: String, enum: ['win', 'loss', 'draw', 'forfeit', null], default: null },
    connected: { type: Boolean, default: false },
    forfeited: { type: Boolean, default: false },
    ratingBefore: Number,
    ratingAfter: Number,
  },
  { _id: false }
);

const matchQuestionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    text: String,
    type: String,
    imageUrl: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['ranked', 'private', 'tournament', 'casual'], default: 'casual' },
    status: { type: String, enum: ['waiting', 'active', 'finished', 'cancelled'], default: 'waiting' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    questions: [matchQuestionSchema],
    questionTime: { type: Number, default: 15 }, // seconds per question
    currentIndex: { type: Number, default: -1 },
    revealedIndex: { type: Number, default: -1 },
    questionStartedAt: Date,
    players: [playerSchema],
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'GameRoom' },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }, // set by F11 (Mim)
    bracketIndex: Number, // set by F11 (Mim)
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

matchSchema.index({ 'players.user': 1, status: 1, finishedAt: -1 });

module.exports = mongoose.model('Match', matchSchema);
