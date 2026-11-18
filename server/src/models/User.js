// MODEL: User (shared by every feature). Owner of auth/base: whole team.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['player', 'moderator', 'admin'];

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'player' },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 200 },
    isSuspended: { type: Boolean, default: false },
    suspendedUntil: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

// Never send the password hash to the client.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
