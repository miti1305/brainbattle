// MODEL (F2 Abrar): a player waiting in the ranked queue.
const mongoose = require('mongoose');

const matchQueueEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  rating: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // optional: only match in this category
  joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MatchQueueEntry', matchQueueEntrySchema);
