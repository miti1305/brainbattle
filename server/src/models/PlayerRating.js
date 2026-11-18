// MODEL (F3 Abrar): Elo rating, tier and weekly points of one player.
const mongoose = require('mongoose');

const playerRatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rating: { type: Number, default: 1200 },
    tier: { type: String, default: 'Silver' },
    peakRating: { type: Number, default: 1200 },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    weeklyPoints: { type: Number, default: 0 },
    weeklyUpdatedAt: { type: Date, default: Date.now },
    ratedAt: { type: Date, default: Date.now }, // when rating last changed (tie-breaker)
  },
  { timestamps: true }
);

playerRatingSchema.index({ rating: -1, ratedAt: 1 });
playerRatingSchema.index({ weeklyPoints: -1, weeklyUpdatedAt: 1 });

module.exports = mongoose.model('PlayerRating', playerRatingSchema);
