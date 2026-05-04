import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { deleteMedia, uploadMedia } from '../../../api/media.api';
import {
  getMyProfile,
  updateMyProfile,
  type MyProfileDto,
  type UpdateMyProfileRequest,
} from '../../../api/users.api';
import { useAuth } from '../../../auth/useAuth';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';

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

type ProfileFormState = {
  firstName: string;
  lastName: string;
  countryCode: string;
  phoneNumber: string;
  birthYear: string;
  gender: string;
  experienceLevel: string;
};

function splitPhone(value: string | null | undefined) {
  const phone = value?.trim() ?? '';
  const match = countryCodeOptions.find((option) => phone.startsWith(option.value));

  return {
    countryCode: match?.value ?? '+389',
    phoneNumber: match ? phone.slice(match.value.length) : phone,
  };
}

function buildInitialForm(profile: MyProfileDto): ProfileFormState {
  const split = splitPhone(profile.phone);

  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    countryCode: split.countryCode,
    phoneNumber: split.phoneNumber,
    birthYear: profile.birthYear == null ? '' : String(profile.birthYear),
    gender: profile.gender ?? '',
    experienceLevel:
      profile.experienceLevel == null ? '' : String(profile.experienceLevel),
  };
}

function toUpdatePayload(form: ProfileFormState): UpdateMyProfileRequest {
  const normalizedPhone = `${form.countryCode}${form.phoneNumber
    .trim()
    .replace(/^0+/, '')}`;

  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: normalizedPhone,
    birthYear: form.birthYear.trim() ? Number(form.birthYear) : null,
    gender: form.gender.trim() ? form.gender.trim() : null,
    experienceLevel: form.experienceLevel.trim()
      ? Number(form.experienceLevel)
      : null,
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getExperienceLabel(level: number | null): string {
  switch (level) {
    case 1:
      return 'Beginner';
    case 2:
      return 'Recreational';
    case 3:
      return 'Intermediate';
    case 4:
      return 'Advanced';
    case 5:
      return 'Competitive';
    default:
      return 'Not specified';
  }
}

function getExperienceDescription(level: number | null): string {
  switch (level) {
    case 1:
      return 'New to tennis or still learning the basic strokes, rules, positioning, and rally consistency.';
    case 2:
      return 'Plays casually and can sustain simple rallies, but consistency, placement, and match strategy are still developing.';
    case 3:
      return 'Can rally with control, serve reliably, and play structured points with moderate consistency.';
    case 4:
      return 'Strong player with reliable technique, controlled shot selection, tactical awareness, and competitive match experience.';
    case 5:
      return 'Highly competitive player with advanced consistency, pace control, tactical patterns, and tournament-level readiness.';
    default:
      return 'Select a level to describe your current tennis playing ability.';
  }
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 30_000,
  });

  const profile = profileQuery.data;
  const effectiveForm = profile ? form ?? buildInitialForm(profile) : null;

  const initials = useMemo(() => {
    const first = profile?.firstName?.trim()?.[0] ?? '';
    const last = profile?.lastName?.trim()?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async (response) => {
      setForm(buildInitialForm(response.user));
      setSuccessMessage(response.message || 'Profile updated successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(extractApiErrorMessage(error, 'Failed to update profile.'));
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => {
      if (!user?.id) {
        throw new Error('User is not available.');
      }

      return uploadMedia({
        file,
        entityType: 'user',
        entityId: user.id,
        usageType: 'Profile',
        sortOrder: 0,
      });
    },
    onSuccess: async () => {
      setSuccessMessage('Profile picture updated successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(
        extractApiErrorMessage(error, 'Failed to upload profile picture.'),
      );
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (mediaFileId: number) => deleteMedia(mediaFileId),
    onSuccess: async () => {
      setSuccessMessage('Profile picture removed successfully.');
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(
        extractApiErrorMessage(error, 'Failed to remove profile picture.'),
      );
    },
  });

  const isBusy =
    updateMutation.isPending ||
    uploadPhotoMutation.isPending ||
    deletePhotoMutation.isPending;

  const handleFormChange = (key: keyof ProfileFormState, value: string) => {
    if (!effectiveForm) {
      return;
    }

    setForm({ ...effectiveForm, [key]: value });
  };

  const handleSave = () => {
    if (!effectiveForm) {
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);
    updateMutation.mutate(toUpdatePayload(effectiveForm));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSuccessMessage(null);
      setErrorMessage('Please select an image file.');
      return;
    }

    uploadPhotoMutation.mutate(file);
  };

  if (profileQuery.isLoading || !effectiveForm) {
    return (
      <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl">
          <Alert severity="error">Failed to load your profile.</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Box
        sx={{
          background:
            'linear-gradient(180deg, rgba(21,101,192,0.96) 0%, rgba(66,165,245,0.9) 100%)',
          color: 'common.white',
          py: { xs: 4, md: 6 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.14) 0, rgba(255,255,255,0) 20%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 16%), radial-gradient(circle at 72% 70%, rgba(255,255,255,0.08) 0, rgba(255,255,255,0) 14%)',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AccountCircleOutlinedIcon />
                <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                  Player account
                </Typography>
              </Stack>

              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    mb: 1.25,
                    lineHeight: 0.96,
                    letterSpacing: '-0.03em',
                    fontSize: {
                      xs: '2.2rem',
                      sm: '2.8rem',
                      md: '3.6rem',
                      lg: '4.2rem',
                    },
                    textShadow: '0 8px 28px rgba(0,0,0,0.14)',
                  }}
                >
                  My Profile
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    maxWidth: 900,
                    opacity: 0.92,
                    fontSize: { xs: 18, md: 20 },
                  }}
                >
                  Manage your personal details, player level, account identity,
                  and profile picture.
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<VerifiedOutlinedIcon />}
                label={profile.emailVerifiedUtc ? 'Email verified' : 'Email not verified'}
                color={profile.emailVerifiedUtc ? 'success' : 'warning'}
              />
              <Chip
                icon={<SportsTennisIcon />}
                label={getExperienceLabel(profile.experienceLevel)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.16)',
                  color: 'common.white',
                }}
              />
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3.5}>
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '360px minmax(0, 1fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Card
              variant="outlined"
              sx={{
                borderRadius: 4,
                bgcolor: '#ffffff',
                boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack spacing={2.5} alignItems="center">
                  <Avatar
                    src={profile.profileImage?.url ?? undefined}
                    sx={{
                      width: 150,
                      height: 150,
                      fontSize: 42,
                      fontWeight: 900,
                      bgcolor: 'primary.main',
                      boxShadow: '0 16px 34px rgba(15,23,42,0.18)',
                    }}
                  >
                    {initials}
                  </Avatar>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 850 }}>
                      {profile.firstName} {profile.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      @{profile.username}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      icon={<BadgeOutlinedIcon />}
                      label={profile.role}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={profile.isActive ? 'Active' : 'Inactive'}
                      color={profile.isActive ? 'success' : 'default'}
                    />
                  </Stack>

                  <Divider flexItem />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handleFileSelected}
                  />

                  <Button
                    variant="contained"
                    startIcon={<CameraAltOutlinedIcon />}
                    onClick={handleUploadClick}
                    disabled={isBusy}
                    fullWidth
                  >
                    {profile.profileImage
                      ? 'Change profile picture'
                      : 'Upload profile picture'}
                  </Button>

                  {profile.profileImage && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() =>
                        deletePhotoMutation.mutate(profile.profileImage!.id)
                      }
                      disabled={isBusy}
                      fullWidth
                    >
                      Remove picture
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={3}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  bgcolor: '#ffffff',
                  boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonOutlinedIcon color="primary" />
                      <Typography variant="h5" sx={{ fontWeight: 850 }}>
                        Personal details
                      </Typography>
                    </Stack>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          md: 'repeat(2, 1fr)',
                        },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="First name"
                        value={effectiveForm.firstName}
                        onChange={(event) =>
                          handleFormChange('firstName', event.target.value)
                        }
                        fullWidth
                      />

                      <TextField
                        label="Last name"
                        value={effectiveForm.lastName}
                        onChange={(event) =>
                          handleFormChange('lastName', event.target.value)
                        }
                        fullWidth
                      />

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
                          gap: 1.5,
                          gridColumn: '1 / -1',
                        }}
                      >
                        <FormControl fullWidth>
                          <InputLabel id="country-code-label">
                            Country Code
                          </InputLabel>
                          <Select
                            labelId="country-code-label"
                            label="Country Code"
                            value={effectiveForm.countryCode}
                            onChange={(event) =>
                              handleFormChange('countryCode', event.target.value)
                            }
                          >
                            {countryCodeOptions.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <TextField
                          label="Phone"
                          value={effectiveForm.phoneNumber}
                          onChange={(event) =>
                            handleFormChange('phoneNumber', event.target.value)
                          }
                          fullWidth
                          helperText="Enter the local number without the country code."
                        />
                      </Box>

                      <TextField
                        label="Birth year"
                        type="number"
                        value={effectiveForm.birthYear}
                        onChange={(event) =>
                          handleFormChange('birthYear', event.target.value)
                        }
                        inputProps={{
                          min: 1900,
                          max: new Date().getFullYear(),
                          step: 1,
                        }}
                        fullWidth
                      />

                      <FormControl fullWidth>
                        <InputLabel id="gender-label">Gender</InputLabel>
                        <Select
                          labelId="gender-label"
                          label="Gender"
                          value={effectiveForm.gender}
                          onChange={(event) =>
                            handleFormChange('gender', event.target.value)
                          }
                        >
                          <MenuItem value="">Not specified</MenuItem>
                          <MenuItem value="Male">Male</MenuItem>
                          <MenuItem value="Female">Female</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>

                      <Box
                        sx={{
                          gridColumn: { xs: '1', md: '1 / -1' },
                          p: 2,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Stack spacing={1.5}>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                          >
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 850 }}
                              >
                                Experience level
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getExperienceLabel(
                                  effectiveForm.experienceLevel
                                    ? Number(effectiveForm.experienceLevel)
                                    : null,
                                )}
                              </Typography>
                            </Box>

                            <Chip
                              icon={<SportsTennisIcon />}
                              label={
                                effectiveForm.experienceLevel
                                  ? `${effectiveForm.experienceLevel} / 5`
                                  : 'Not specified'
                              }
                              color={
                                effectiveForm.experienceLevel ? 'primary' : 'default'
                              }
                              variant="outlined"
                            />
                          </Stack>

                          <Slider
                            value={
                              effectiveForm.experienceLevel
                                ? Number(effectiveForm.experienceLevel)
                                : 1
                            }
                            min={1}
                            max={5}
                            step={1}
                            onChange={(_, value) => {
                              handleFormChange('experienceLevel', String(value));
                            }}
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) =>
                              getExperienceLabel(value)
                            }
                            disabled={isBusy}
                            sx={{
                              mt: 1,
                              px: 0.5,
                            }}
                          />

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ lineHeight: 1.5 }}
                          >
                            <strong>
                              {getExperienceLabel(
                                effectiveForm.experienceLevel
                                  ? Number(effectiveForm.experienceLevel)
                                  : null,
                              )}
                              :
                            </strong>{' '}
                            {getExperienceDescription(
                              effectiveForm.experienceLevel
                                ? Number(effectiveForm.experienceLevel)
                                : null,
                            )}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>

                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        variant="contained"
                        startIcon={<SaveOutlinedIcon />}
                        onClick={handleSave}
                        disabled={isBusy}
                      >
                        Save profile
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  p: { xs: 2.5, md: 3 },
                  bgcolor: '#ffffff',
                  boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
                }}
              >
                <Stack spacing={2.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailOutlinedIcon color="primary" />
                    <Typography variant="h5" sx={{ fontWeight: 850 }}>
                      Account details
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'repeat(3, 1fr)',
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700 }}
                      >
                        Email
                      </Typography>
                      <Typography>{profile.email}</Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700 }}
                      >
                        Username
                      </Typography>
                      <Typography>{profile.username}</Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700 }}
                      >
                        Member since
                      </Typography>
                      <Typography>{formatDate(profile.createdUtc)}</Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700 }}
                      >
                        Completed bookings
                      </Typography>
                      <Typography>{profile.completedCount}</Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 700 }}
                      >
                        Cancelled bookings
                      </Typography>
                      <Typography>{profile.cancelledCount}</Typography>
                    </Box>
                  </Box>

                  <Divider />
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}