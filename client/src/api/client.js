// Shared axios instance. Every request automatically sends the login token.
// Usage in any feature:  import api from '../api/client';  const { data } = await api.get('/quizzes');
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns server errors into a readable message: getErrorMessage(err)
export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong';
}

export default api;
