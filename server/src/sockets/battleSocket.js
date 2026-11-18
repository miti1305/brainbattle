// F1 / F2 (Abrar): live battle events.
// Client emits: battle:join {matchId}, battle:answer {matchId, qIndex, choice}, battle:leave {matchId}
// Server emits: battle:state, battle:starting, battle:question, battle:answered, battle:reveal,
//               battle:finished, battle:playerLeft, battle:cancelled
const battleService = require('../services/battleService');

module.exports = function registerBattleSocket(io, socket) {
  const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

  socket.on('battle:join', async ({ matchId } = {}, ack) => {
    try {
      await battleService.joinMatch(matchId, socket.user, socket);
      reply(ack, { ok: true });
    } catch (err) {
      reply(ack, { ok: false, message: err.message });
    }
  });

  socket.on('battle:answer', async ({ matchId, qIndex, choice } = {}, ack) => {
    try {
      reply(ack, await battleService.submitAnswer(matchId, socket.user, Number(qIndex), Number(choice)));
    } catch (err) {
      reply(ack, { ok: false, message: err.message });
    }
  });

  socket.on('battle:leave', async ({ matchId } = {}, ack) => {
    try {
      await battleService.forfeit(matchId, socket.user._id);
      socket.leave(`match:${matchId}`);
      reply(ack, { ok: true });
    } catch (err) {
      reply(ack, { ok: false, message: err.message });
    }
  });

  socket.on('disconnect', () => {
    battleService.handleDisconnect(socket.user).catch((err) => console.error('battle disconnect:', err.message));
  });
};
