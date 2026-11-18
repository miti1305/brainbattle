// F4 (Abrar): private room lobby: join by code, player list, kick, host starts match.
// Called once per connected socket. `socket.user` is the logged-in user.
module.exports = function registerLobbySocket(io, socket) {
  // Example:
  // socket.on('battle:join', async ({ matchId }) => {
  //   socket.join(`match:${matchId}`);
  //   io.to(`match:${matchId}`).emit('battle:playerJoined', { userId: socket.user._id });
  // });
};
