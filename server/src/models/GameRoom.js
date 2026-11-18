// MODEL (F4 Abrar): private game room with invite code and custom settings.
const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    settings: {
      category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
      questionCount: { type: Number, default: 10, min: 3, max: 20 },
      questionTime: { type: Number, default: 15, min: 5, max: 60 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', ''], default: '' },
    },
    maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
    players: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
      },
    ],
    status: { type: String, enum: ['open', 'playing', 'closed'], default: 'open' },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GameRoom', gameRoomSchema);
