import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { appTheme } from '../../theme';

type ThemeRegistryProps = {
    children: ReactNode;
};

export function ThemeRegistry({ children }: ThemeRegistryProps) {
    return (
        <ThemeProvider theme={appTheme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}