// Socket.IO setup. Every connection must send a valid JWT: io(url, { auth: { token } }).
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const presence = require('../services/presence');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth || {};
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user || user.isSuspended) return next(new Error('Not allowed'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Not logged in'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    // Personal room, so any feature can send to one user: getIO().to(`user:${id}`).emit(...)
    socket.join(`user:${userId}`);
    presence.add(userId);
    socket.on('disconnect', () => presence.remove(userId));

    require('./battleSocket')(io, socket); // F1 / F2 (Abrar)
    require('./lobbySocket')(io, socket); // F4 (Abrar)
    require('./notificationSocket')(io, socket); // F20 (Moontaha)
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

module.exports = { initSocket, getIO };
