// MODEL (F12 Mim): friend request / friendship / block between two users.
const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pairKey: { type: String, required: true, unique: true }, // smallerId_largerId -> one document per pair
  },
  { timestamps: true }
);

friendshipSchema.statics.keyFor = (a, b) => [String(a), String(b)].sort().join('_');

module.exports = mongoose.model('Friendship', friendshipSchema);
