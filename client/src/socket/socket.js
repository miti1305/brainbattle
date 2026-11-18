// One shared Socket.IO connection for the whole app (used by F1, F4, F20 ...).
// Usage: const socket = getSocket(); socket.emit('battle:join', { matchId });
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ auth: { token: localStorage.getItem('bb_token') }, autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
