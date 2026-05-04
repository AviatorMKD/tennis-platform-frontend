import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmailRequest } from '../../../api/auth.api';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

type VerifyState = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [state, setState] = useState<VerifyState>('verifying');
    const [message, setMessage] = useState('We are verifying your email address.');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setState('error');
            setMessage('Verification token is missing.');
            return;
        }

        const run = async () => {
            try {
                await verifyEmailRequest({ token });
                setState('success');
                setMessage('Your email has been verified successfully. You can now sign in.');
            } catch (error) {
                setState('error');
                setMessage(
                    extractApiErrorMessage(error, 'This verification link is invalid, expired, or already used.'),
                );
            }
        };

        void run();
    }, [searchParams]);

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
                    maxWidth: 560,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                }}
            >
                <Stack spacing={3} alignItems="center" textAlign="center">
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Email verification
                    </Typography>

                    {state === 'verifying' && (
                        <>
                            <CircularProgress />
                            <Typography color="text.secondary">{message}</Typography>
                        </>
                    )}

                    {state === 'success' && (
                        <>
                            <Alert severity="success" sx={{ width: '100%' }}>
                                {message}
                            </Alert>
                            <Button variant="contained" size="large" onClick={() => void navigate('/login')}>
                                Go to Login
                            </Button>
                        </>
                    )}

                    {state === 'error' && (
                        <>
                            <Alert severity="error" sx={{ width: '100%' }}>
                                {message}
                            </Alert>
                            <Button variant="contained" size="large" onClick={() => void navigate('/login')}>
                                Back to Login
                            </Button>
                        </>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}