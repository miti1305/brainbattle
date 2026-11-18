// MODEL (F13 Mim): clan / study group with roles and group challenges.
const mongoose = require('mongoose');

const clanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 40 },
    description: { type: String, default: '', maxlength: 300 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    memberCap: { type: Number, default: 20, min: 2, max: 50 },
    members: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    challenges: [
      {
        title: { type: String, required: true },
        description: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        endsAt: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Clan', clanSchema);
