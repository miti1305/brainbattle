// MODEL: Quiz with embedded questions (shared contract).
// Extended by F8 Quiz Authoring (Farin); read by F1 Battle, F4 Rooms, F7 Daily, F19 Practice, F10 Admin content.
// If you need a new field, agree with the team first, then add it here in a small PR.
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'truefalse', 'image'], default: 'mcq' },
  imageUrl: { type: String, default: '' },
  options: { type: [String], validate: (v) => v.length >= 2 },
  correctIndex: { type: Number, required: true, min: 0 },
  explanation: { type: String, default: '' },
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    isOfficial: { type: Boolean, default: false }, // approved into the official question bank (F10)
    isFeatured: { type: Boolean, default: false },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [questionSchema],
    playCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
