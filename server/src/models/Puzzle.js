// MODEL (F6 Farin): a generated puzzle. The solution is hidden from normal queries.
const mongoose = require('mongoose');

const puzzleSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['sudoku', 'wordsearch', 'crossword'], required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // what the player sees
    solution: { type: mongoose.Schema.Types.Mixed, select: false }, // never sent to the client
    initialState: { type: mongoose.Schema.Types.Mixed, required: true },
    maxHints: { type: Number, default: 3 },
    isDaily: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Puzzle', puzzleSchema);
