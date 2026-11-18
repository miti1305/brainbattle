// MODEL (F11 Mim): tournament with registration and a bracket.
const mongoose = require('mongoose');

const bracketMatchSchema = new mongoose.Schema(
  {
    round: Number,
    slot: Number,
    playerA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    playerB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDraw: { type: Boolean, default: false }, // round robin only
    status: { type: String, enum: ['pending', 'ready', 'live', 'done'], default: 'pending' },
    isBye: { type: Boolean, default: false },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null }, // F1 battle (Abrar)
    readyAt: Date,
    scoreA: Number,
    scoreB: Number,
  },
  { _id: false }
);

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 500 },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    format: { type: String, enum: ['single', 'roundrobin'], default: 'single' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    maxPlayers: { type: Number, default: 8, min: 2, max: 32 },
    regDeadline: { type: Date, required: true },
    matchDeadlineHours: { type: Number, default: 24, min: 1, max: 168 },
    status: { type: String, enum: ['registration', 'ongoing', 'finished', 'cancelled'], default: 'registration' },
    participants: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, username: String }],
    matches: [bracketMatchSchema],
    champion: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tournament', tournamentSchema);
