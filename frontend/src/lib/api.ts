import axios from 'axios';

// Production backend URL (separate Vercel project that is already live and working)
const PRODUCTION_BACKEND_URL = 'https://civicplus-backend.vercel.app/api';

export const getBaseUrl = (): string => {
  // 1. Check custom override in localStorage (configured via UI modal)
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('civics_backend_url');
    if (customUrl && customUrl.trim().length > 0) {
      const clean = customUrl.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  }

  // 2. Check build-time environment variable VITE_API_URL
  const envUrl = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 3. Localhost / Private local network — use local backend
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    const isLocal =
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h.startsWith('192.168.') ||
      h.startsWith('10.') ||
      h.startsWith('172.') ||
      h.endsWith('.local');
    if (isLocal) {
      if (envUrl && envUrl.startsWith('http')) {
        return envUrl.replace(/\/+$/, '');
      }
      return `http://${h}:3000/api`;
    }

    // 4. Deployed production — use the separate backend Vercel project
    return PRODUCTION_BACKEND_URL;
  }

  return PRODUCTION_BACKEND_URL;
};

export const API_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Real-time backend ping check
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
      timeout: 6000,
      headers: { Accept: 'application/json' },
    });
    const latency = Date.now() - startTime;
    if (res.status === 200 && res.data) {
      return {
        ok: true,
        message: res.data.message || 'Connected to backend server & MongoDB.',
        latency,
        data: res.data,
      };
    }
    return {
      ok: false,
      message: `Unexpected response status ${res.status}`,
      latency,
    };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const msg = err.response?.data?.message || err.message || 'Server unreachable';
    return {
      ok: false,
      message: msg,
      latency,
    };
  }
}

// Override backend URL in localStorage
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
