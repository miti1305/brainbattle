// MODEL (F7 Farin): consecutive days a player solved the Daily Challenge.
const mongoose = require('mongoose');

const dailyStreakSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  current: { type: Number, default: 0 },
  best: { type: Number, default: 0 },
  lastDate: String, // last 'YYYY-MM-DD' solved
});

module.exports = mongoose.model('DailyStreak', dailyStreakSchema);
