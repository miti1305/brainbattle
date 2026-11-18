// Entry point: loads config, connects to MongoDB, starts HTTP + Socket.IO + scheduled jobs.
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/sockets');
const { startJobs } = require('./src/jobs');
const { loadListeners } = require('./src/listeners');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const server = http.createServer(app);
  initSocket(server);
  loadListeners();
  startJobs();
  server.listen(PORT, () => console.log(`BrainBattle API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
