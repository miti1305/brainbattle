// F1 (Abrar)
import api from './client';

export const getActiveMatches = () => api.get('/battles/active').then((r) => r.data.matches);
export const getMatch = (id) => api.get(`/battles/${id}`).then((r) => r.data.match);
