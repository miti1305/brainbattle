// Shared read-only category list (used by several Abrar pages).
import api from './client';

export const getCategories = () => api.get('/categories').then((r) => r.data.categories);
