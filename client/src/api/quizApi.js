// F8 (Farin)
import api from './client';

export const browseQuizzes = (params) => api.get('/quizzes', { params }).then((r) => r.data.quizzes);
export const getMyQuizzes = () => api.get('/quizzes/mine').then((r) => r.data.quizzes);
export const getQuiz = (id) => api.get(`/quizzes/${id}`).then((r) => r.data);
export const createQuiz = (body) => api.post('/quizzes', body).then((r) => r.data.quiz);
export const updateQuiz = (id, body) => api.put(`/quizzes/${id}`, body).then((r) => r.data.quiz);
export const deleteQuiz = (id) => api.delete(`/quizzes/${id}`).then((r) => r.data);
export const publishQuiz = (id) => api.post(`/quizzes/${id}/publish`).then((r) => r.data.quiz);
export const unpublishQuiz = (id) => api.post(`/quizzes/${id}/unpublish`).then((r) => r.data.quiz);
export const importCsv = (id, csv, mode) => api.post(`/quizzes/${id}/import-csv`, { csv, mode }).then((r) => r.data);
