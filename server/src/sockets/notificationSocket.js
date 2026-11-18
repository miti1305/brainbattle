// F20 (Moontaha): push new notifications to `user:<id>` rooms, mark as read.
// Called once per connected socket. `socket.user` is the logged-in user.
module.exports = function registerNotificationSocket(io, socket) {
  // Example:
  // socket.on('battle:join', async ({ matchId }) => {
  //   socket.join(`match:${matchId}`);
  //   io.to(`match:${matchId}`).emit('battle:playerJoined', { userId: socket.user._id });
  // });
};
