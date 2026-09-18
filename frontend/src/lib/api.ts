import axios from 'axios';

export const API_URL =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civics_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 response and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('civics_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${API_URL}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          );
          if (res.data?.accessToken) {
            localStorage.setItem('civics_access_token', res.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('civics_access_token');
          localStorage.removeItem('civics_refresh_token');
          localStorage.removeItem('civics_user');
        }
      }
    }
    return Promise.reject(error);
  }
);
