// F11 (Mim)
import api from './client';

export const listTournaments = (status) => api.get('/tournaments', { params: { status } }).then((r) => r.data.items);
export const createTournament = (body) => api.post('/tournaments', body).then((r) => r.data.tournament);
export const getTournament = (id) => api.get(`/tournaments/${id}`).then((r) => r.data.tournament);
export const registerTournament = (id) => api.post(`/tournaments/${id}/register`).then((r) => r.data.tournament);
export const unregisterTournament = (id) => api.post(`/tournaments/${id}/unregister`).then((r) => r.data.tournament);
export const startTournament = (id) => api.post(`/tournaments/${id}/start`).then((r) => r.data.tournament);
export const cancelTournament = (id) => api.post(`/tournaments/${id}/cancel`).then((r) => r.data);
export const playBracketMatch = (id, index) => api.post(`/tournaments/${id}/matches/${index}/play`).then((r) => r.data);
export const walkover = (id, index, winnerId) => api.post(`/tournaments/${id}/matches/${index}/walkover`, { winnerId }).then((r) => r.data.tournament);
