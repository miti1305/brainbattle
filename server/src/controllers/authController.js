// CONTROLLER: register, login, current user. (Supporting functionality, not a counted feature.)
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const generateToken = require('../utils/generateToken');

const sendAuth = (res, status, user) => res.status(status).json({ token: generateToken(user), user });

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) throw new HttpError(400, 'Username, email and password are required');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (exists) throw new HttpError(409, 'Username or email is already registered');

  const user = await User.create({ username, email, passwordHash: await User.hashPassword(password) });
  sendAuth(res, 201, user);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'Wrong email or password');
  if (user.isSuspended) throw new HttpError(403, 'Your account is suspended');

  sendAuth(res, 200, user);
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
