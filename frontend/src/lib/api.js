import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

// ============ ADS API ============

export const adsApi = {
  upload: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/ads/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  list: async (limit = 50, offset = 0) => {
    return api.get('/ads', { params: { limit, offset } });
  },

  get: async (id) => {
    return api.get(`/ads/${id}`);
  },

  analyze: async (id) => {
    return api.post(`/ads/${id}/analyze`);
  },

  delete: async (id) => {
    return api.delete(`/ads/${id}`);
  },
};

// ============ JOBS API ============

export const jobsApi = {
  list: async (limit = 20, offset = 0) => {
    return api.get('/jobs', { params: { limit, offset } });
  },

  get: async (id) => {
    return api.get(`/jobs/${id}`);
  },

  cancel: async (id) => {
    return api.delete(`/jobs/${id}`);
  },
};

// ============ REACTIONS API ============

export const reactionsApi = {
  upload: async (adId, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ad_id', adId);

    return api.post('/reactions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },

  list: async (limit = 50, offset = 0) => {
    return api.get('/reactions', { params: { limit, offset } });
  },

  get: async (id) => {
    return api.get(`/reactions/${id}`);
  },

  getTimeline: async (id) => {
    return api.get(`/reactions/${id}/timeline`);
  },

  analyze: async (id) => {
    return api.post(`/reactions/${id}/analyze`);
  },

  delete: async (id) => {
    return api.delete(`/reactions/${id}`);
  },
};

// ============ TRAINING API ============

export const trainingApi = {
  list: async (limit = 50, offset = 0) => {
    return api.get('/training/entries', { params: { limit, offset } });
  },

  create: async (entry) => {
    return api.post('/training/entries', entry);
  },

  update: async (id, entry) => {
    return api.put(`/training/entries/${id}`, entry);
  },

  delete: async (id) => {
    return api.delete(`/training/entries/${id}`);
  },

  export: async () => {
    return api.post('/training/export');
  },
};

// ============ SETTINGS API ============

export const settingsApi = {
  get: async () => {
    return api.get('/settings');
  },

  update: async (settings) => {
    return api.put('/settings', settings);
  },

  test: async (service) => {
    return api.post(`/settings/test/${service}`);
  },
};

export default api;
