import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and auth
api.interceptors.request.use(
  (config) => {
    // Add auth token to headers if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API service functions
export const schemesAPI = {
  // Get all schemes with pagination and filtering
  getSchemes: (params = {}) => {
    return api.get('/schemes/', { params });
  },

  // Get single scheme by ID
  getScheme: (id) => {
    return api.get(`/schemes/${id}`);
  },

  // Search schemes semantically
  searchSchemes: (query, n = 5) => {
    return api.get('/schemes/search', { params: { q: query, n } });
  },

  // Get all categories
  getCategories: () => {
    return api.get('/schemes/categories');
  },

  // Create new scheme (admin)
  createScheme: (schemeData) => {
    return api.post('/schemes/', schemeData);
  },
};

export const adminAPI = {
  // Trigger manual scraping
  triggerScraping: () => {
    return api.post('/admin/scrape-now');
  },

  // Get scheduler status
  getSchedulerStatus: () => {
    return api.get('/admin/scheduler-status');
  },
};

export const healthAPI = {
  // Health check
  healthCheck: () => {
    return api.get('/health');
  },
};

export default api;
