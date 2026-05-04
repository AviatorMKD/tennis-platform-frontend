import type { ReactNode } from 'react';
import { AuthProvider } from '../../auth/AuthProvider';
import { QueryProvider } from './QueryProvider';
import { ThemeRegistry } from './ThemeRegistry';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeRegistry>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </ThemeRegistry>
  );
}