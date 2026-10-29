import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// System Health & Dataset Metadata
export const getHealth = () => api.get('/health').then(res => res.data);
export const getDatasetSummary = () => api.get('/dataset/summary').then(res => res.data);
export const getArticles = (params) => api.get('/articles', { params }).then(res => res.data);
export const getDatasetArticles = (params) => api.get('/articles', { params }).then(res => res.data);
export const getCategories = () => api.get('/categories').then(res => res.data);
export const getModels = () => api.get('/models').then(res => res.data);
export const getModelPerformance = () => api.get('/model-performance').then(res => res.data);
export const getKeywords = (category) => api.get('/keywords', { params: { category } }).then(res => res.data);

// Inference & Preview
export const predictSingle = (text, headline = null, modelName = 'best', sourceType = 'Text') =>
  api.post('/predict', { text, headline, model_name: modelName, source_type: sourceType }).then(res => res.data);

export const extractArticlePreview = (formData) => api.post('/extract', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);

// Telemetry & Statistics
export const getRecentPredictions = (limit = 50) => api.get('/predictions/recent', { params: { limit } }).then(res => res.data);
export const getStatistics = () => api.get('/statistics').then(res => res.data);

export default api;
