import axios from 'axios';

/**
 * Centralized API Base URL Resolver
 * Strictly avoids hardcoded production or development URLs in source code.
 * Reads from centralized environment variables (VITE_API_URL), diagnostics override, or relative origin.
 */
export const getBaseUrl = (): string => {
  // 1. Diagnostics/Custom override in localStorage (configured via UI modal)
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('civics_backend_url');
    if (customUrl && customUrl.trim().length > 0) {
      const clean = customUrl.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  }

  // 2. Centralized environment variable VITE_API_URL
  const envUrl = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    // Safety check: If running in production browser on a remote domain, ignore accidental localhost env var
    if (typeof window !== 'undefined') {
      const isRemote = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isRemote && (clean.includes('localhost') || clean.includes('127.0.0.1'))) {
        return `${window.location.origin}/api`;
      }
    }
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 3. Fallback based on browser environment
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocal) {
      return `http://${window.location.hostname}:3000/api`;
    }

    return `${window.location.origin}/api`;
  }

  return '/api';
};

export const API_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000, // 15-second reasonable timeout for authentication & operations
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Real-time backend ping check verifying GET /api/health
 */
export async function pingBackendHealth(urlToTest?: string): Promise<{
  ok: boolean;
  message: string;
  latency: number;
  data?: any;
}> {
  const targetBase = (urlToTest || getBaseUrl()).replace(/\/+$/, '');
  const testEndpoint = targetBase.endsWith('/api') ? `${targetBase}/health` : `${targetBase}/api/health`;
  const startTime = Date.now();

  try {
    const res = await axios.get(testEndpoint, {
      timeout: 8000,
      headers: { Accept: 'application/json' },
    });
    const latency = Date.now() - startTime;
    const isDbConnected = res.data?.database === 'connected';

    if (res.status === 200 && isDbConnected) {
      return {
        ok: true,
        message: 'Connected to backend server & MongoDB Atlas.',
        latency,
        data: res.data,
      };
    } else if (res.data?.status === 'degraded' || !isDbConnected) {
      return {
        ok: false,
        message: 'Backend server is online, but MongoDB is disconnected or degraded.',
        latency,
        data: res.data,
      };
    }

    return {
      ok: false,
      message: `Unexpected response status ${res.status}`,
      latency,
      data: res.data,
    };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const msg =
      err.response?.data?.message ||
      (err.code === 'ECONNABORTED'
        ? 'Health check timed out (8s limit)'
        : err.message || 'Server unreachable');
    return {
      ok: false,
      message: msg,
      latency,
      data: err.response?.data,
    };
  }
}

// Override backend URL in localStorage (development/diagnostics)
export function setBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem('civics_backend_url', clean);
    window.location.reload();
  }
}

// Reset backend URL in localStorage
export function resetBackendUrl(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('civics_backend_url');
    window.location.reload();
  }
}

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
      // Do not attempt refresh on auth login endpoints
      const isAuthLoginUrl =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/civic') ||
        originalRequest.url?.includes('/auth/officer') ||
        originalRequest.url?.includes('/auth/employee') ||
        originalRequest.url?.includes('/auth/controller');

      if (isAuthLoginUrl) {
        return Promise.reject(error);
      }

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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('civics_session_expired'));
          }
        }
      } else {
        localStorage.removeItem('civics_access_token');
        localStorage.removeItem('civics_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('civics_session_expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);
