import api from './client';

export const registerUser = (body) => api.post('/auth/register', body).then((r) => r.data);
export const loginUser = (body) => api.post('/auth/login', body).then((r) => r.data);
export const fetchMe = () => api.get('/auth/me').then((r) => r.data);
