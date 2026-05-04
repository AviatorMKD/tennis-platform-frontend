import axios, { AxiosError } from 'axios';
import {
  clearStoredAuthUser,
  getStoredAuthUser,
  markSessionExpired,
  setPostLoginRedirectPath,
} from '../auth/authStorage';
import { isJwtExpired } from '../auth/authToken';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isHandlingSessionExpiry = false;

function isPublicPath(pathname: string): boolean {
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/verify-email' ||
    pathname === '/clubs'
  ) {
    return true;
  }

  if (pathname.startsWith('/clubs/')) {
    return true;
  }

  if (pathname.startsWith('/courts/')) {
    return true;
  }

  if (pathname.startsWith('/discover/clubs/')) {
    return true;
  }

  return false;
}

function handleExpiredSession() {
  if (isHandlingSessionExpiry) {
    return;
  }

  isHandlingSessionExpiry = true;

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const currentlyPublic = isPublicPath(window.location.pathname);

  clearStoredAuthUser();

  if (currentlyPublic) {
    window.dispatchEvent(new CustomEvent('tennis-platform-auth-changed'));
    isHandlingSessionExpiry = false;
    return;
  }

  markSessionExpired();
  setPostLoginRedirectPath(currentPath);
  window.location.assign('/login');
}

apiClient.interceptors.request.use((config) => {
  const authUser = getStoredAuthUser();

  if (!authUser?.token) {
    return config;
  }

  if (isJwtExpired(authUser.token)) {
    handleExpiredSession();
    return config;
  }

  config.headers.Authorization = `Bearer ${authUser.token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url?.toLowerCase() ?? '';
    const isLoginRequest =
      requestUrl.includes('/api/auth/login') || requestUrl.endsWith('/auth/login');
    const isAlreadyOnLoginPage = window.location.pathname === '/login';

    if (status === 401 && !isLoginRequest && !isAlreadyOnLoginPage) {
      handleExpiredSession();
    }

    return Promise.reject(error);
  }
);