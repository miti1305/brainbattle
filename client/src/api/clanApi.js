// F13 (Mim)
import api from './client';

export const listClans = (q) => api.get('/clans', { params: { q } }).then((r) => r.data.clans);
export const getMyClan = () => api.get('/clans/mine').then((r) => r.data.clan);
export const createClan = (body) => api.post('/clans', body).then((r) => r.data.clan);
export const getClan = (id) => api.get(`/clans/${id}`).then((r) => r.data);
export const joinClan = (id) => api.post(`/clans/${id}/join`).then((r) => r.data);
export const leaveClan = (id) => api.post(`/clans/${id}/leave`).then((r) => r.data);
export const setMemberRole = (id, userId, role) => api.patch(`/clans/${id}/members/${userId}`, { role }).then((r) => r.data);
export const removeMember = (id, userId) => api.delete(`/clans/${id}/members/${userId}`).then((r) => r.data);
export const transferOwnership = (id, userId) => api.post(`/clans/${id}/transfer`, { userId }).then((r) => r.data);
export const addChallenge = (id, body) => api.post(`/clans/${id}/challenges`, body).then((r) => r.data);
export const removeChallenge = (id, challengeId) => api.delete(`/clans/${id}/challenges/${challengeId}`).then((r) => r.data);
