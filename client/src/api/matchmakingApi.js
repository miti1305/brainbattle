// F2 (Abrar)
import api from './client';

export const joinQueue = (categoryId) => api.post('/matchmaking/join', { categoryId }).then((r) => r.data);
export const leaveQueue = () => api.post('/matchmaking/leave').then((r) => r.data);
export const getQueueStatus = () => api.get('/matchmaking/status').then((r) => r.data);
