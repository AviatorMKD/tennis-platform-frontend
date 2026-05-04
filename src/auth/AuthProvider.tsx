import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './authContext';
import { clearStoredAuthUser, getStoredAuthUser, setStoredAuthUser } from './authStorage';
import type { AuthContextValue, AuthUser } from './authTypes';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  useEffect(() => {
    const syncAuthState = () => {
      setUser(getStoredAuthUser());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'tennis-platform-auth') {
        syncAuthState();
      }
    };

    const handleCustomAuthChanged = () => {
      syncAuthState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      'tennis-platform-auth-changed',
      handleCustomAuthChanged as EventListener
    );

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        'tennis-platform-auth-changed',
        handleCustomAuthChanged as EventListener
      );
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: (nextUser: AuthUser) => {
        setUser(nextUser);
        setStoredAuthUser(nextUser);
        window.dispatchEvent(new CustomEvent('tennis-platform-auth-changed'));
      },
      logout: () => {
        setUser(null);
        clearStoredAuthUser();
        window.dispatchEvent(new CustomEvent('tennis-platform-auth-changed'));
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}