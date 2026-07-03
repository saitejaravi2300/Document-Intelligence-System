import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
});

// Request interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => API.post('/api/auth/register', data),
  login: (data) => API.post('/api/auth/login', data),
  getMe: () => API.get('/api/auth/me'),
  logout: () => API.post('/api/auth/logout'),
};

export const docAPI = {
  upload: (formData) =>
    API.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: () => API.get('/api/documents'),
  getById: (id) => API.get(`/api/documents/${id}`),
  delete: (id) => API.delete(`/api/documents/${id}`),
  search: (query) => API.get(`/api/documents/search?q=${query}`),
  exportUrl: (id) => `${import.meta.env.VITE_API_URL || window.location.origin}/api/documents/${id}/export`,
  
  // Q&A RAG endpoints
  query: (id, question) => API.post(`/api/documents/${id}/query`, { question }),
  getQueryHistory: (id) => API.get(`/api/documents/${id}/query-history`),
  analyze: (id) => API.post(`/api/documents/${id}/analyze`),
};

export default API;
