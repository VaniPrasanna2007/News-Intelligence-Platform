import axios from 'axios';

// Consistent backend base URL per Part 5 specification
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Core Endpoints
export const getHealth = () => api.get('/health').then(res => res.data);
export const getDatasetSummary = () => api.get('/dataset/summary').then(res => res.data);
export const getArticles = (params) => api.get('/articles', { params }).then(res => res.data);
export const getDatasetArticles = (params) => api.get('/articles', { params }).then(res => res.data);
export const getCategories = () => api.get('/categories').then(res => res.data);
export const getModels = () => api.get('/models').then(res => res.data);
export const getModelPerformance = () => api.get('/model-performance').then(res => res.data);
export const getKeywords = (category) => api.get('/keywords', { params: { category } }).then(res => res.data);
export const getConfusionMatrix = (modelName) => api.get('/confusion-matrix', { params: { model_name: modelName } }).then(res => res.data);
export const predictSingle = (text, headline = null, modelName = 'best', sourceType = 'Text') => 
  api.post('/predict', { text, headline, model_name: modelName, source_type: sourceType }).then(res => res.data);
export const predictBatch = (items) => api.post('/predict/batch', items).then(res => res.data);
export const predictBatchUpload = (formData) => api.post('/predict/batch-upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);
export const getRecentPredictions = (limit = 50) => api.get('/predictions/recent', { params: { limit } }).then(res => res.data);
export const getStatistics = () => api.get('/statistics').then(res => res.data);
export const triggerRetrain = () => api.post('/retrain').then(res => res.data);
export const getRetrainStatus = () => api.get('/retrain/status').then(res => res.data);

// Intelligence Platform Endpoints
export const extractArticlePreview = (formData) => api.post('/extract', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);

export const getNewsDNA = (text, headline = null, sourceUrl = null, modelName = 'best') =>
  api.post('/news-dna', { text, headline, source_url: sourceUrl, model_name: modelName }).then(res => res.data);

export const searchSimilarity = (text, topK = 8) =>
  api.post('/similarity', { text, top_k: topK }).then(res => res.data);

export const calculateNovelty = (text) =>
  api.post('/novelty', { text }).then(res => res.data);

export const getArticleProfile = (text, headline = null) =>
  api.post('/article-profile', { text, headline }).then(res => res.data);

export const checkHeadlineAlignment = (headline, body) =>
  api.post('/headline-alignment', { headline, body }).then(res => res.data);

export const extractEntities = (text) =>
  api.post('/entities', { text }).then(res => res.data);

export const compareClaims = (text) =>
  api.post('/claim-comparison', { text }).then(res => res.data);

export const getStoryClusters = () =>
  api.get('/story-clusters').then(res => res.data);

export const getCoverageGaps = () =>
  api.get('/coverage-gaps').then(res => res.data);

export const getSourceAnalysis = () =>
  api.get('/source-analysis').then(res => res.data);

export const getCategoryConstellation = () =>
  api.get('/category-constellation').then(res => res.data);

export const getClusterConstellation = () =>
  api.get('/cluster-constellation').then(res => res.data);

export const submitHumanReview = (data) =>
  api.post('/review', data).then(res => res.data);

export const getReviewStats = () =>
  api.get('/review/stats').then(res => res.data);

export default api;
