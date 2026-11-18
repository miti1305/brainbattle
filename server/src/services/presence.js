// Tracks who is online (connected with Socket.IO). Used by F12 Friends (online status).
const counts = new Map(); // userId -> number of open sockets

exports.add = (userId) => counts.set(String(userId), (counts.get(String(userId)) || 0) + 1);

exports.remove = (userId) => {
  const id = String(userId);
  const n = (counts.get(id) || 1) - 1;
  if (n <= 0) counts.delete(id);
  else counts.set(id, n);
};

exports.isOnline = (userId) => counts.has(String(userId));
