import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 25000,
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nexus.token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      sessionStorage.removeItem('nexus.token');
      window.dispatchEvent(new Event('nexus:logout'));
    }
    return Promise.reject(error);
  },
);
export const errorMessage = (e) =>
  e.response?.data?.message ||
  (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT'
    ? 'The server is taking too long to respond. It may be waking from inactivity. Wait a moment, then try again. If you were saving a report or creating an account, check whether it succeeded before submitting again.'
    : e.code === 'ERR_NETWORK'
      ? 'Cannot reach NEXUS API. Check your connection and that the NEXUS backend is running.'
      : e.message || 'Something went wrong. Please try again.');
