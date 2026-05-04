import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { AppHeader } from '../shared/components/AppHeader';
import { ClubTimeNotice } from '../shared/components/ClubTimeNotice';

type OperatorLayoutProps = {
  children: ReactNode;
};

export function OperatorLayout({ children }: OperatorLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />

      <ClubTimeNotice />

      {children}
    </Box>
  );
}