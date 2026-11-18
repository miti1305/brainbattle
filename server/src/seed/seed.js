// Run with: npm run seed   (from the server folder)
// Creates the default categories, one admin account and sample official quizzes. Safe to run more than once.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Quiz = require('../models/Quiz');
const SAMPLE_QUIZZES = require('./sampleQuizzes');

const CATEGORIES = ['General Knowledge', 'Science', 'Mathematics', 'History', 'Programming', 'Bangladesh', 'Sports', 'Movies & Music'];

async function seed() {
  await connectDB();

  for (const [i, name] of CATEGORIES.entries()) {
    await Category.updateOne({ name }, { $setOnInsert: { name, order: i } }, { upsert: true });
  }
  console.log(`Categories ready (${CATEGORIES.length})`);

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@brainbattle.local').toLowerCase();
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
      email,
      passwordHash: await User.hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'),
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  let added = 0;
  for (const q of SAMPLE_QUIZZES) {
    if (await Quiz.findOne({ title: q.title })) continue;
    const category = await Category.findOne({ name: q.category });
    await Quiz.create({
      title: q.title,
      description: `Sample ${q.category} quiz`,
      category: category._id,
      difficulty: q.difficulty,
      status: 'published',
      isOfficial: true,
      author: admin._id,
      questions: q.questions.map(([text, options, correctIndex, explanation]) => ({ text, type: 'mcq', options, correctIndex, explanation })),
    });
    added += 1;
  }
  console.log(`Sample quizzes added: ${added}`);

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
