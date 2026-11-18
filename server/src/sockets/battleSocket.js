// F1 / F2 (Abrar): live battle events: join match, question start, answer, score update, finish.
// Called once per connected socket. `socket.user` is the logged-in user.
module.exports = function registerBattleSocket(io, socket) {
  // Example:
  // socket.on('battle:join', async ({ matchId }) => {
  //   socket.join(`match:${matchId}`);
  //   io.to(`match:${matchId}`).emit('battle:playerJoined', { userId: socket.user._id });
  // });
};
