import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1e7d32',
        },
        secondary: {
            main: '#1565c0',
        },
        background: {
            default: '#f7f8fa',
            paper: '#ffffff',
        },
    },
    shape: {
        borderRadius: 10,
    },
    typography: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        h1: {
            fontSize: '2rem',
            fontWeight: 700,
        },
        h2: {
            fontSize: '1.5rem',
            fontWeight: 700,
        },
        h3: {
            fontSize: '1.25rem',
            fontWeight: 600,
        },
    },
});