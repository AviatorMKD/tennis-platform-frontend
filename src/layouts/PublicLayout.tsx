import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { AppHeader } from '../shared/components/AppHeader';
import { ClubTimeNotice } from '../shared/components/ClubTimeNotice';

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppHeader />

      <ClubTimeNotice />

      <Box>{children}</Box>
    </Box>
  );
}