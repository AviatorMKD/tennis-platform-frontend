import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { loginRequest } from '../../../api/auth.api';
import { useAuth } from '../../../auth/useAuth';
import {
    consumePostLoginRedirectPath,
    consumeSessionExpired,
} from '../../../auth/authStorage';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

type LocationState = {
    from?: {
        pathname?: string;
        search?: string;
        hash?: string;
    };
};

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const state = location.state as LocationState | undefined;

    const redirectPathFromState = useMemo(() => {
        const pathname = state?.from?.pathname;
        const search = state?.from?.search ?? '';
        const hash = state?.from?.hash ?? '';

        if (!pathname || pathname === '/login') {
            return null;
        }

        return `${pathname}${search}${hash}`;
    }, [state]);

    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const hadExpiredSession = consumeSessionExpired();

        if (hadExpiredSession) {
            setSessionExpiredMessage('Your session expired. Please sign in again to continue.');
        }
    }, []);

    const handleLogin = async () => {
        setErrorMessage('');
        setSessionExpiredMessage('');
        setIsSubmitting(true);

        try {
            const response = await loginRequest({
                email: email.trim(),
                password,
            });

            login(response);

            const storedRedirectPath = consumePostLoginRedirectPath();
            const redirectPath =
                redirectPathFromState ||
                storedRedirectPath ||
                '/app/bookings';

            void navigate(redirectPath, { replace: true });
        } catch (error) {
            setErrorMessage(extractApiErrorMessage(error, 'Login failed. Please check your credentials.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                py: { xs: 4, md: 8 },
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    width: '100%',
                    maxWidth: 520,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                }}
            >
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Welcome back
                        </Typography>

                        <Typography color="text.secondary">
                            Sign in to manage bookings, invitations, and your player profile.
                        </Typography>
                    </Box>

                    {sessionExpiredMessage && (
                        <Alert severity="warning">{sessionExpiredMessage}</Alert>
                    )}

                    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        fullWidth
                    />

                    <TextField
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        fullWidth
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !isSubmitting) {
                                void handleLogin();
                            }
                        }}
                    />

                    <Button variant="contained" size="large" onClick={handleLogin} disabled={isSubmitting}>
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                        Don&apos;t have an account?{' '}
                        <Link component={RouterLink} to="/register" underline="hover">
                            Register
                        </Link>
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}