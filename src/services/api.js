import axios from 'axios';
const env = import.meta.env.NODE_ENV;
const API_BASE_URL = (env === 'production' ? import.meta.env.VITE_API_URL || 'http://localhost:2609' : import.meta.env.VITE_API_URL).replace(/\/$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor
api.interceptors.request.use(
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

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const data = error.response?.data;
        const message = data?.error || data?.message || (typeof data === 'string' ? data : error.message) || 'Something went wrong';
        return Promise.reject(new Error(message));
    }
);

export default api;
