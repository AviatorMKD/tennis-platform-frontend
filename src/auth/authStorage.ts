import type { AuthUser } from './authTypes';

const AUTH_STORAGE_KEY = 'tennis-platform-auth';
const SESSION_EXPIRED_KEY = 'tennis-platform-session-expired';
const POST_LOGIN_REDIRECT_KEY = 'tennis-platform-post-login-redirect';

export function getStoredAuthUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
}

export function setStoredAuthUser(user: AuthUser): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuthUser(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function markSessionExpired(): void {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, 'true');
}

export function consumeSessionExpired(): boolean {
    const value = sessionStorage.getItem(SESSION_EXPIRED_KEY) === 'true';
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return value;
}

export function setPostLoginRedirectPath(path: string): void {
    if (!path || path === '/login') {
        return;
    }

    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
}

export function getPostLoginRedirectPath(): string | null {
    return sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
}

export function consumePostLoginRedirectPath(): string | null {
    const value = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return value;
}