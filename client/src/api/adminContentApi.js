// F10 (Farin)
import api from './client';

export const adminListCategories = () => api.get('/admin/content/categories').then((r) => r.data.categories);
export const adminCreateCategory = (body) => api.post('/admin/content/categories', body).then((r) => r.data.category);
export const adminUpdateCategory = (id, body) => api.put(`/admin/content/categories/${id}`, body).then((r) => r.data.category);
export const adminDeleteCategory = (id) => api.delete(`/admin/content/categories/${id}`).then((r) => r.data);
export const adminListQuizzes = (filter, q) => api.get('/admin/content/quizzes', { params: { filter, q } }).then((r) => r.data.quizzes);
export const adminGetQuiz = (id) => api.get(`/admin/content/quizzes/${id}`).then((r) => r.data);
export const adminApprove = (id) => api.post(`/admin/content/quizzes/${id}/approve`).then((r) => r.data.quiz);
export const adminRevoke = (id) => api.post(`/admin/content/quizzes/${id}/revoke`).then((r) => r.data.quiz);
export const adminFeature = (id, featured) => api.post(`/admin/content/quizzes/${id}/feature`, { featured }).then((r) => r.data.quiz);
