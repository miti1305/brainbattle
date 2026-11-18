// F12 (Mim)
import api from './client';

export const getFriends = () => api.get('/friends').then((r) => r.data.friends);
export const getRequests = () => api.get('/friends/requests').then((r) => r.data);
export const sendRequest = (username) => api.post('/friends/requests', { username }).then((r) => r.data);
export const acceptRequest = (id) => api.post(`/friends/requests/${id}/accept`).then((r) => r.data);
export const declineRequest = (id) => api.post(`/friends/requests/${id}/decline`).then((r) => r.data);
export const removeFriend = (userId) => api.delete(`/friends/${userId}`).then((r) => r.data);
export const blockUser = (userId) => api.post('/friends/block', { userId }).then((r) => r.data);
export const unblockUser = (userId) => api.post('/friends/unblock', { userId }).then((r) => r.data);
export const getBlocked = () => api.get('/friends/blocked').then((r) => r.data.blocked);
export const searchUsers = (q) => api.get('/friends/search', { params: { q } }).then((r) => r.data.users);
export const getSuggestions = () => api.get('/friends/suggestions').then((r) => r.data.suggestions);
export const challengeFriend = (userId) => api.post('/friends/challenge', { userId }).then((r) => r.data);
