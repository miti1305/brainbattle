// F6 (Farin)
import api from './client';

export const listMyPuzzles = () => api.get('/puzzles').then((r) => r.data.attempts);
export const newPuzzle = (type, difficulty) => api.post('/puzzles', { type, difficulty }).then((r) => r.data.attempt);
export const getAttempt = (id) => api.get(`/puzzles/attempts/${id}`).then((r) => r.data.attempt);
export const saveState = (id, state) => api.put(`/puzzles/attempts/${id}/state`, { state }).then((r) => r.data.attempt);
export const makeMove = (id, move) => api.post(`/puzzles/attempts/${id}/move`, move).then((r) => r.data);
export const requestHint = (id) => api.post(`/puzzles/attempts/${id}/hint`).then((r) => r.data);
export const checkPuzzle = (id) => api.post(`/puzzles/attempts/${id}/check`).then((r) => r.data);
export const giveUp = (id) => api.post(`/puzzles/attempts/${id}/give-up`).then((r) => r.data);
