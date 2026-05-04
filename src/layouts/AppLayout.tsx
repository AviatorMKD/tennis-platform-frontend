import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { AppHeader } from '../shared/components/AppHeader';
import { ClubTimeNotice } from '../shared/components/ClubTimeNotice';

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />

      <ClubTimeNotice />

      {children}
    </Box>
  );
}