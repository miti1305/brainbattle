// Connects Mongoose to the shared MongoDB Atlas database (MONGODB_URI in .env).
const dns = require('dns');
const mongoose = require('mongoose');

// Some home routers/ISPs cannot answer the SRV lookup that "mongodb+srv://" needs
// (error: querySrv ECONNREFUSED). Use public DNS servers for Node's lookups instead.
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Create server/.env from server/.env.example');
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
