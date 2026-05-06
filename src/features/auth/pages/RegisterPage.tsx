import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { registerRequest } from '../../../api/auth.api';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const countryCodeOptions = [
    { value: '+389', label: '+389 Macedonia' },
    { value: '+355', label: '+355 Albania' },
    { value: '+381', label: '+381 Serbia' },
    { value: '+383', label: '+383 Kosovo' },
    { value: '+382', label: '+382 Montenegro' },
    { value: '+359', label: '+359 Bulgaria' },
    { value: '+30', label: '+30 Greece' },
    { value: '+385', label: '+385 Croatia' },
    { value: '+386', label: '+386 Slovenia' },
    { value: '+387', label: '+387 Bosnia and Herzegovina' },
    { value: '+90', label: '+90 Türkiye' },
    { value: '+974', label: '+974 Qatar' },
];

const experienceDescriptions: Record<number, string> = {
    1: 'Beginner - New to tennis or learning the fundamentals. Limited consistency, short rallies, and basic understanding of strokes and rules.',
    2: 'Recreational - Plays casually with some ability to rally. Basic shot control is present, but consistency and technique are still developing.',
    3: 'Intermediate - Maintains consistent rallies and demonstrates control over most strokes. Understands basic tactics and can structure points.',
    4: 'Advanced - Strong and reliable technique with good consistency under pressure. Uses tactics effectively and can vary pace, spin, and placement.',
    5: 'Competitive - Actively competes in leagues or tournaments. High consistency, physical readiness, and performance-driven, strategic play.',
};

const experienceMarks = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
];

function buildBirthYearOptions() {
    const currentYear = new Date().getFullYear();
    const youngestYear = currentYear - 13;
    const oldestYear = currentYear - 100;

    return Array.from(
        { length: youngestYear - oldestYear + 1 },
        (_, index) => youngestYear - index,
    );
}

export function RegisterPage() {
    const birthYearOptions = useMemo(() => buildBirthYearOptions(), []);
    const turnstileRef = useRef<TurnstileInstance | null>(null);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [countryCode, setCountryCode] = useState('+389');
    const [phone, setPhone] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState('');
    const [experienceLevel, setExperienceLevel] = useState<number>(3);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetTurnstile = () => {
        setTurnstileToken('');
        turnstileRef.current?.reset();
    };

    const handleRegister = async () => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!firstName.trim()) {
            setErrorMessage('First name is required.');
            return;
        }

        if (!lastName.trim()) {
            setErrorMessage('Last name is required.');
            return;
        }

        if (!username.trim()) {
            setErrorMessage('Username is required.');
            return;
        }

        if (!email.trim()) {
            setErrorMessage('Email is required.');
            return;
        }

        if (!countryCode.trim()) {
            setErrorMessage('Country code is required.');
            return;
        }

        if (!phone.trim()) {
            setErrorMessage('Phone is required.');
            return;
        }

        if (!experienceLevel || experienceLevel < 1 || experienceLevel > 5) {
            setErrorMessage('Experience level is required.');
            return;
        }

        if (!password) {
            setErrorMessage('Password is required.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        if (!turnstileToken) {
            setErrorMessage('Please wait for the security check to complete.');
            return;
        }

        setIsSubmitting(true);

        try {
            const normalizedPhone = `${countryCode}${phone.trim().replace(/^0+/, '')}`;

            const response = await registerRequest({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: username.trim(),
                email: email.trim(),
                phone: normalizedPhone,
                password,
                birthYear: birthYear.trim() ? Number(birthYear) : null,
                gender: gender.trim(),
                experienceLevel,
                turnstileToken,
            });

            setSuccessMessage(
                response.message ||
                    'Registration successful. Please check your email and click the verification link before signing in.',
            );

            setPassword('');
            setConfirmPassword('');
            resetTurnstile();
        } catch (error) {
            setErrorMessage(
                extractApiErrorMessage(error, 'Registration failed. Please review your details and try again.'),
            );
            resetTurnstile();
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
                    maxWidth: 640,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                }}
            >
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Create your account
                        </Typography>

                        <Typography color="text.secondary">
                            Register to start booking courts, receiving invitations, and managing your profile.
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Fields marked with * are mandatory.
                        </Typography>
                    </Box>

                    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                    {successMessage && <Alert severity="success">{successMessage}</Alert>}

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label="First Name"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Last Name"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            required
                            fullWidth
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label="Username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            required
                            fullWidth
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label="Country Code"
                            select
                            value={countryCode}
                            onChange={(event) => setCountryCode(event.target.value)}
                            required
                            sx={{ width: { xs: '100%', md: 220 } }}
                        >
                            {countryCodeOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Phone"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            required
                            fullWidth
                            helperText="Enter the local number without the country code."
                        />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label="Birth Year"
                            select
                            value={birthYear}
                            onChange={(event) => setBirthYear(event.target.value)}
                            fullWidth
                        >
                            <MenuItem value="">Select</MenuItem>
                            {birthYearOptions.map((year) => (
                                <MenuItem key={year} value={String(year)}>
                                    {year}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Gender"
                            select
                            value={gender}
                            onChange={(event) => setGender(event.target.value)}
                            fullWidth
                        >
                            <MenuItem value="">Select</MenuItem>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </TextField>
                    </Stack>

                    <Box>
                        <Typography sx={{ fontWeight: 600, mb: 1 }}>
                            Experience Level *
                        </Typography>

                        <Slider
                            value={experienceLevel}
                            min={1}
                            max={5}
                            step={1}
                            marks={experienceMarks}
                            valueLabelDisplay="auto"
                            onChange={(_, value) => setExperienceLevel(value as number)}
                        />

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {experienceDescriptions[experienceLevel]}
                        </Typography>
                    </Box>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                            fullWidth
                        />
                        <TextField
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            required
                            fullWidth
                        />
                    </Stack>

                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Turnstile
                            ref={turnstileRef}
                            siteKey={TURNSTILE_SITE_KEY}
                            onSuccess={(token) => {
                                setTurnstileToken(token);
                                setErrorMessage((current) =>
                                    current === 'Please wait for the security check to complete.' ? '' : current,
                                );
                            }}
                            onExpire={() => setTurnstileToken('')}
                            onError={() => setTurnstileToken('')}
                        />
                    </Box>

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleRegister}
                        disabled={isSubmitting || !turnstileToken}
                    >
                        {isSubmitting ? 'Creating account...' : 'Register'}
                    </Button>

                    <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                        Already have an account?{' '}
                        <Link component={RouterLink} to="/login" underline="hover">
                            Sign in
                        </Link>
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}