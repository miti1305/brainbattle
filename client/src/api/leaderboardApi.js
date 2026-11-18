// F3 (Abrar)
import api from './client';

export const getLeaderboard = (type, category) =>
  api.get('/leaderboards', { params: { type, category } }).then((r) => r.data);
export const getMyRating = () => api.get('/leaderboards/me').then((r) => r.data.rating);
