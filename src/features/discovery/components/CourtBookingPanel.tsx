import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import {
  createBooking,
  getInvitationCandidateCount,
} from '../../../api/bookings.api';
import type { CourtAvailabilityDetailDto } from '../../../api/discovery.api';
import { useAuth } from '../../../auth/useAuth';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatDateTimeLong24,
  formatLocalDate,
  getBusinessNowDate,
  toUtcIsoString,
} from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatDurationLabel } from '../utils/discoveryTime';

type CourtBookingPanelProps = {
  date: string;
  startLocalTime?: string;
  durationMinutes?: number;
  court: CourtAvailabilityDetailDto;
  displayPrice?: number | null;
  displayCurrency?: string | null;
  isSelectionAvailable?: boolean;
  onBookingCreated?: () => Promise<void> | void;
  onCancel?: () => void;
  hideOuterActions?: boolean;
  playerRequirementCutoffHours?: number | null;
};

function buildPseudoLocalDate(dateIso: string, timeText: string) {
  const [yearText, monthText, dayText] = dateIso.split('-');
  const [hourText, minuteText] = timeText.split(':');

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function getSubmissionCurrency(currency: string | null | undefined) {
  return currency ?? 'UNDEFINED';
}

function getFriendlyBookingErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const status = error.response?.status;

    if (status === 401) {
      return 'Please sign in to book this court.';
    }

    if (status === 403) {
      return 'Your account is not allowed to book this court.';
    }
  }

  return extractApiErrorMessage(error);
}

function getNormalizedSurface(surfaceType: string | null | undefined) {
  return (surfaceType ?? '').trim().toLowerCase();
}

function formatTime24(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function coerceExperienceLevel(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.round(value), 1, 5);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return clamp(Math.round(parsed), 1, 5);
    }
  }

  return null;
}

function getOrganizerExperienceLevel(authValue: unknown): number {
  if (!authValue || typeof authValue !== 'object') {
    return 3;
  }

  const root = authValue as Record<string, unknown>;
  const candidates: unknown[] = [
    root.experienceLevel,
    root.playerExperienceLevel,
    root.userExperienceLevel,
    root.profile && typeof root.profile === 'object'
      ? (root.profile as Record<string, unknown>).experienceLevel
      : null,
    root.user && typeof root.user === 'object'
      ? (root.user as Record<string, unknown>).experienceLevel
      : null,
    root.currentUser && typeof root.currentUser === 'object'
      ? (root.currentUser as Record<string, unknown>).experienceLevel
      : null,
  ];

  for (const candidate of candidates) {
    const resolved = coerceExperienceLevel(candidate);
    if (resolved != null) {
      return resolved;
    }
  }

  return 3;
}

function getCourtSurfaceTextureSx(
  surfaceType: string | null | undefined
): SxProps<Theme> {
  const surface = getNormalizedSurface(surfaceType);

  if (surface === 'clay') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#fff7f1',
      backgroundColor: '#b85a2b',
      backgroundImage: `
        radial-gradient(circle at 20% 18%, rgba(255,255,255,0.07) 0 2px, transparent 2px),
        radial-gradient(circle at 72% 64%, rgba(0,0,0,0.06) 0 1.5px, transparent 1.5px),
        radial-gradient(circle at 35% 78%, rgba(255,255,255,0.04) 0 1px, transparent 1px),
        linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 38%),
        linear-gradient(180deg, #c96b35 0%, #b85a2b 52%, #a94f24 100%)
      `,
      backgroundSize: '18px 18px, 22px 22px, 14px 14px, 100% 100%, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.18,
        backgroundImage: `
          repeating-linear-gradient(
            115deg,
            rgba(255,255,255,0.05) 0px,
            rgba(255,255,255,0.05) 1px,
            transparent 1px,
            transparent 7px
          )
        `,
        mixBlendMode: 'soft-light',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))',
      },
    };
  }

  if (surface === 'grass') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#f6fff3',
      backgroundColor: '#4f7f2b',
      backgroundImage: `
        repeating-linear-gradient(
          90deg,
          rgba(255,255,255,0.035) 0px,
          rgba(255,255,255,0.035) 2px,
          rgba(0,0,0,0.03) 2px,
          rgba(0,0,0,0.03) 4px,
          transparent 4px,
          transparent 12px
        ),
        radial-gradient(circle at 25% 30%, rgba(255,255,255,0.06) 0 1px, transparent 1px),
        radial-gradient(circle at 68% 58%, rgba(0,0,0,0.06) 0 1px, transparent 1px),
        linear-gradient(180deg, #6da83a 0%, #4f7f2b 55%, #3f6821 100%)
      `,
      backgroundSize: '100% 100%, 16px 16px, 18px 18px, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.2,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.06) 0px,
            rgba(255,255,255,0.06) 1px,
            transparent 1px,
            transparent 10px
          )
        `,
        mixBlendMode: 'soft-light',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.24))',
      },
    };
  }

  if (surface === 'hard') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#f4f8ff',
      backgroundColor: '#2f6aa3',
      backgroundImage: `
        radial-gradient(circle at 22% 22%, rgba(255,255,255,0.05) 0 1.5px, transparent 1.5px),
        radial-gradient(circle at 74% 62%, rgba(0,0,0,0.07) 0 1px, transparent 1px),
        repeating-linear-gradient(
          135deg,
          rgba(255,255,255,0.018) 0px,
          rgba(255,255,255,0.018) 2px,
          transparent 2px,
          transparent 8px
        ),
        linear-gradient(180deg, #4183c4 0%, #2f6aa3 58%, #245783 100%)
      `,
      backgroundSize: '18px 18px, 20px 20px, 100% 100%, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.18,
        backgroundImage: `
          repeating-radial-gradient(
            circle at 0 0,
            rgba(255,255,255,0.03) 0px,
            rgba(255,255,255,0.03) 1px,
            transparent 1px,
            transparent 6px
          )
        `,
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22))',
      },
    };
  }

  return {
    position: 'relative',
    overflow: 'hidden',
    color: 'text.primary',
    background:
      'linear-gradient(180deg, rgba(245,247,250,1) 0%, rgba(255,255,255,1) 100%)',
  };
}

function getCourtLineAccentSx(
  surfaceType: string | null | undefined
): SxProps<Theme> {
  const surface = getNormalizedSurface(surfaceType);

  if (surface === 'grass') {
    return {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.16,
      background:
        'linear-gradient(160deg, transparent 0 58%, rgba(255,255,255,0.9) 58% 60%, transparent 60%)',
    };
  }

  if (surface === 'clay') {
    return {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.14,
      background:
        'linear-gradient(145deg, transparent 0 62%, rgba(255,255,255,0.85) 62% 64%, transparent 64%)',
    };
  }

  if (surface === 'hard') {
    return {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.16,
      background:
        'linear-gradient(150deg, transparent 0 60%, rgba(255,255,255,0.9) 60% 62%, transparent 62%)',
    };
  }

  return {
    display: 'none',
  };
}

function InfoStat({
  label,
  value,
  onSurface = false,
  statusVariant,
}: {
  label: string;
  value: string;
  onSurface?: boolean;
  statusVariant?: 'confirmed' | 'pending' | null;
}) {
  const isPending = statusVariant === 'pending';

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.15,
        borderRadius: 2.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.35,
        bgcolor: isPending
          ? 'rgba(255,255,146,0.30)'
          : onSurface
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255,255,255,0.72)',
        border: '1px solid',
        borderColor: isPending
          ? 'rgba(255,255,146,0.75)'
          : onSurface
            ? 'rgba(255,255,255,0.16)'
            : 'divider',
        backdropFilter: onSurface ? 'blur(6px)' : 'none',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: onSurface ? 'rgba(255,255,255,0.78)' : 'text.secondary',
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 800,
          color: isPending
            ? '#ffffff'
            : onSurface
              ? '#ffffff'
              : 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function MiniBadge({
  label,
  icon,
  onSurface = false,
  sx,
}: {
  label: string;
  icon?: React.ReactNode;
  onSurface?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.15,
          py: 0.75,
          borderRadius: 999,
          bgcolor: onSurface ? 'rgba(255,255,255,0.10)' : 'rgba(25,118,210,0.05)',
          border: '1px solid',
          borderColor: onSurface ? 'rgba(255,255,255,0.16)' : 'divider',
          backdropFilter: onSurface ? 'blur(6px)' : 'none',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: onSurface ? 'inherit' : 'text.secondary',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {icon}
      <span>{label}</span>
    </Box>
  );
}

export function CourtBookingPanel({
  date,
  startLocalTime,
  durationMinutes,
  court,
  displayPrice,
  displayCurrency,
  isSelectionAvailable = true,
  onBookingCreated,
  onCancel,
  hideOuterActions = false,
  playerRequirementCutoffHours,
}: CourtBookingPanelProps) {
  const auth = useAuth();
  const { isAuthenticated } = auth;

  const organizerExperienceLevel = useMemo(() => getOrganizerExperienceLevel(auth), [auth]);
  const defaultExperienceRange = useMemo<[number, number]>(() => {
    const min = clamp(organizerExperienceLevel - 1, 1, 5);
    const max = clamp(organizerExperienceLevel + 1, 1, 5);
    return [min, max];
  }, [organizerExperienceLevel]);

  const [needsPlayers, setNeedsPlayers] = useState(false);
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [experienceRange, setExperienceRange] = useState<number[]>(defaultExperienceRange);
  const [partnerCostSharing, setPartnerCostSharing] = useState(false);
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [bookingResultStatus, setBookingResultStatus] = useState<string | null>(null);

  const organizerName = 'You';
  const bookedOnTimestamp = useMemo(() => getBusinessNowDate(), []);

  const startDate = useMemo(() => {
    if (!startLocalTime) return null;
    return buildPseudoLocalDate(date, startLocalTime);
  }, [date, startLocalTime]);

  const endDate = useMemo(() => {
    if (!startDate || !durationMinutes || durationMinutes <= 0) return null;
    return addMinutes(startDate, durationMinutes);
  }, [startDate, durationMinutes]);

  const cutoffDateTime = useMemo(() => {
    if (!startDate || !playerRequirementCutoffHours || playerRequirementCutoffHours <= 0) {
      return null;
    }

    return new Date(startDate.getTime() - playerRequirementCutoffHours * 60 * 60 * 1000);
  }, [startDate, playerRequirementCutoffHours]);

  const effectivePrice = displayPrice ?? court.price ?? null;
  const effectiveCurrency = displayCurrency ?? court.currency ?? null;

  const candidateCountQuery = useQuery({
    queryKey: [
      'booking-candidate-count-inline',
      court.courtId,
      needsPlayers,
      experienceRange[0],
      experienceRange[1],
    ],
    queryFn: () =>
      getInvitationCandidateCount({
        minimumExperienceLevel: experienceRange[0],
        maximumExperienceLevel: experienceRange[1],
      }),
    enabled: needsPlayers,
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('Please sign in to book this court.');
      }

      if (!isSelectionAvailable) {
        throw new Error('This court is no longer available for the selected time.');
      }

      if (!startDate || !endDate || !durationMinutes || durationMinutes <= 0) {
        throw new Error('Selected time range is invalid.');
      }

      const requiresPendingConfirmation = needsPlayers && minPlayers > 1;

      if (requiresPendingConfirmation && !cutoffDateTime) {
        throw new Error(
          'This club does not currently expose a player cutoff configuration for pending bookings.'
        );
      }

      return createBooking({
        courtId: court.courtId,
        startUtc: toUtcIsoString(startDate),
        endUtc: toUtcIsoString(endDate),
        bookedPrice: effectivePrice ?? 0,
        currency: getSubmissionCurrency(effectiveCurrency),
        needsAdditionalPlayers: needsPlayers,
        minimumPlayersRequired: needsPlayers ? minPlayers : 1,
        maximumPlayersAllowed: needsPlayers ? maxPlayers : 1,
        playerRequirementDeadlineUtc: requiresPendingConfirmation && cutoffDateTime
          ? toUtcIsoString(cutoffDateTime)
          : null,
        autoCancelIfPlayerRequirementNotMet: requiresPendingConfirmation,
        partnerCostSharing,
        minimumExperienceLevel: needsPlayers ? experienceRange[0] : null,
        maximumExperienceLevel: needsPlayers ? experienceRange[1] : null,
        autoInviteMatchingPlayers: needsPlayers,
        notes: notes.trim() || null,
      });
    },
    onSuccess: async (result) => {
      setLocalError('');
      setBookingResultStatus(result.status);
      setShowSuccessDialog(true);
    },
    onError: (error) => {
      setBookingResultStatus(null);
      setShowSuccessDialog(false);
      setLocalError(getFriendlyBookingErrorMessage(error));
    },
  });

  const handleCreateBooking = async () => {
    setLocalError('');

    if (!isAuthenticated) {
      setLocalError('Please sign in to book this court.');
      return;
    }

    if (!isSelectionAvailable) {
      setLocalError('This court is no longer available for the selected time.');
      return;
    }

    if (!startDate || !endDate || !durationMinutes || durationMinutes <= 0) {
      setLocalError('Selected time range is invalid.');
      return;
    }

    if (needsPlayers) {
      if (minPlayers < 1 || minPlayers > 4) {
        setLocalError('Minimum players must be between 1 and 4.');
        return;
      }

      if (maxPlayers < 1 || maxPlayers > 4) {
        setLocalError('Maximum players must be between 1 and 4.');
        return;
      }

      if (maxPlayers < minPlayers) {
        setLocalError('Maximum players cannot be less than minimum players.');
        return;
      }

      if (minPlayers === 1 && maxPlayers === 1) {
        setLocalError(
          'Minimum and maximum players cannot both be 1 when additional players are enabled.'
        );
        return;
      }

      if (minPlayers > 1 && !cutoffDateTime) {
        setLocalError(
          'A cutoff configuration is required when the booking must remain pending until enough players join.'
        );
        return;
      }
    }

    await createBookingMutation.mutateAsync();
  };

  const handleSuccessConfirm = async () => {
    setShowSuccessDialog(false);

    if (onBookingCreated) {
      await onBookingCreated();
    }
  };

  const handleNeedsPlayersToggle = (nextChecked: boolean) => {
    setNeedsPlayers(nextChecked);
    setLocalError('');

    if (nextChecked) {
      setMinPlayers(1);
      setMaxPlayers(2);
      setExperienceRange([...defaultExperienceRange]);
    } else {
      setPartnerCostSharing(false);
    }
  };

  const statusPreview = needsPlayers && minPlayers > 1 ? 'Pending' : 'Confirmed';
  const isCreatingBooking = createBookingMutation.isPending;

  return (
    <Stack spacing={2.25}>
      {localError && <Alert severity="error">{localError}</Alert>}

      {!isAuthenticated && (
        <Alert severity="info">
          You can view live availability as a guest, but you must sign in to create a booking.
        </Alert>
      )}

      {!startDate || !endDate || !durationMinutes ? (
        <Alert severity="warning">Select a valid time range first.</Alert>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                xl: 'minmax(0, 2fr) minmax(280px, 1fr)',
              },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <Box>
  <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  onClick={() => handleNeedsPlayersToggle(!needsPlayers)}
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 3,
                    bgcolor: needsPlayers ? 'rgba(25,118,210,0.05)' : 'grey.50',
                    borderColor: needsPlayers ? 'rgba(25,118,210,0.24)' : 'divider',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ px: 1.6, py: 1.35 }}>
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Stack
                        direction="row"
                        spacing={1.1}
                        alignItems="center"
                        sx={{ minWidth: 0, flex: 1 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: needsPlayers ? 'primary.main' : 'grey.500',
                            color: 'common.white',
                            flexShrink: 0,
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <Groups2OutlinedIcon fontSize="small" />
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            Additional Players
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {needsPlayers
                              ? 'Player invitation options are expanded below.'
                              : 'Keep this off for a private booking.'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                        <Tooltip
                          title="Minimum Players includes yourself. If set to 1, the booking can still confirm immediately by your own participation while invitations may still be sent to other players."
                          arrow
                          placement="top"
                        >
                          <IconButton
                            size="small"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Switch
                          checked={needsPlayers}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleNeedsPlayersToggle(event.target.checked)}
                        />
                      </Stack>
                    </Stack>
                  </Box>

                  <Collapse in={needsPlayers} timeout="auto" unmountOnExit>
                    <Box
                      onClick={(event) => event.stopPropagation()}
                      sx={{
                        px: 1.6,
                        pb: 1.6,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2.5,
                          bgcolor: '#ffffff',
                          border: '1px solid',
                          borderColor: 'rgba(25,118,210,0.16)',
                        }}
                      >
                        <Stack spacing={2}>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                              gap: 1.5,
                            }}
                          >
                            <Box
  sx={{
    px: 1.5,
    py: 1.5,
    borderRadius: 2.5,
    bgcolor: '#ffffff',
    border: '1px solid',
    borderColor: 'divider',
    gridColumn: { xs: '1 / -1', md: '1 / -1' },
  }}
>
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ mb: 1 }}
  >
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      Players: {minPlayers} - {maxPlayers}
    </Typography>

    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
      Self included
    </Typography>
  </Stack>

  <Slider
    value={[minPlayers, maxPlayers]}
    onChange={(_, value) => {
      const [nextMinRaw, nextMaxRaw] = value as number[];

      const nextMin = clamp(nextMinRaw, 1, 4);
      let nextMax = clamp(nextMaxRaw, nextMin, 4);

      if (nextMin === 1 && nextMax === 1) {
        nextMax = 2;
      }

      setMinPlayers(nextMin);
      setMaxPlayers(nextMax);
    }}
    min={1}
    max={4}
    step={1}
    marks
    valueLabelDisplay="auto"
    disableSwap
  />

  <Typography variant="caption" color="text.secondary">
    Select the minimum and maximum number of players for this booking.
  </Typography>
</Box>

                            <Box
                              sx={{
                                px: 1.5,
                                py: 1.5,
                                borderRadius: 2.5,
                                bgcolor: '#ffffff',
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  Experience Level: {experienceRange[0]} - {experienceRange[1]}
                                </Typography>

                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  Candidates:{' '}
                                  {candidateCountQuery.isLoading
                                    ? '...'
                                    : candidateCountQuery.data?.count ?? 'N/A'}
                                </Typography>
                              </Stack>

                              <Slider
                                value={experienceRange}
                                onChange={(_, value) => {
                                  const [nextMin, nextMax] = value as number[];
                                  setExperienceRange([
                                    clamp(nextMin, 1, 5),
                                    clamp(nextMax, 1, 5),
                                  ]);
                                }}
                                min={1}
                                max={5}
                                step={1}
                                marks
                                valueLabelDisplay="auto"
                              />
                            </Box>

                            <Paper
                              variant="outlined"
                              sx={{
                                px: 1.5,
                                py: 1.5,
                                borderRadius: 2.5,
                                bgcolor: '#ffffff',
                                borderColor: 'divider',
                              }}
                            >
                              <Stack spacing={1.25}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  Partner Cost Sharing
                                </Typography>

                                <FormControlLabel
                                  sx={{ m: 0, alignItems: 'flex-start' }}
                                  control={
                                    <Switch
                                      checked={partnerCostSharing}
                                      onChange={(event) =>
                                        setPartnerCostSharing(event.target.checked)
                                      }
                                    />
                                  }
                                  label={
                                    <Typography variant="body2" color="text.secondary">
                                      Turn this on to indicate that the booking cost will be shared among the players.
                                    </Typography>
                                  }
                                />
                              </Stack>
                            </Paper>
                          </Box>
                        </Stack>
                      </Box>
                    </Box>
                  </Collapse>
                </Paper>



                <TextField
                  label="Optional booking comment"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                />

                {hideOuterActions && (
                  <Button
                    variant="contained"
                    onClick={() => void handleCreateBooking()}
                    disabled={isCreatingBooking}
                    startIcon={
                      isCreatingBooking ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : undefined
                    }
                    sx={{
                      minHeight: 48,
                      alignSelf: 'flex-start',
                      px: 2.2,
                      borderRadius: 3,
                      fontWeight: 800,
                    }}
                  >
                    {isCreatingBooking ? 'Creating Booking...' : 'Create Booking'}
                  </Button>
                )}
                  </Stack>
              </Box>

              <Paper
                variant="outlined"
              sx={{
                ...getCourtSurfaceTextureSx(court.surfaceType),
                p: 2.2,
                borderRadius: 3.5,
                borderColor: 'rgba(255,255,255,0.14)',
                boxShadow: '0 10px 28px rgba(15,23,42,0.10)',
              }}
            >
              <Box sx={getCourtLineAccentSx(court.surfaceType)} />

              <Stack spacing={4} sx={{ position: 'relative', zIndex: 1 }}>
                <Stack direction="row" spacing={1.1} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(255,255,255,0.14)',
                      color: 'inherit',
                      border: '1px solid rgba(255,255,255,0.16)',
                      backdropFilter: 'blur(6px)',
                      flexShrink: 0,
                    }}
                  >
                    <ReceiptLongOutlinedIcon fontSize="small" />
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {court.courtName || `Court #${court.courtId}`}
                      </Box>
                      <Box component="span" sx={{ opacity: 0.65 }}>
                        ·
                      </Box>
                      <Box component="span" sx={{ opacity: 0.92, whiteSpace: 'nowrap' }}>
                        Booking Summary
                      </Box>
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.84)' }}>
                      Clear view of what will be booked on this court.
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 1.1,
                  }}
                >
                  <InfoStat label="Date" value={formatLocalDate(startDate)} onSurface />
                  <InfoStat label="Start" value={formatTime24(startDate)} onSurface />
                  <InfoStat label="End" value={formatTime24(endDate)} onSurface />
                  <InfoStat
                    label="Duration"
                    value={formatDurationLabel(durationMinutes)}
                    onSurface
                  />
                  <InfoStat
                    label="Price"
                    value={
                      effectivePrice != null
                        ? formatCurrency(effectivePrice, effectiveCurrency)
                        : 'Undefined'
                    }
                    onSurface
                  />
                  <InfoStat
                    label="Status preview"
                    value={statusPreview}
                    onSurface
                    statusVariant={
                      statusPreview === 'Confirmed'
                        ? 'confirmed'
                        : statusPreview === 'Pending'
                          ? 'pending'
                          : null
                    }
                  />
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.16)' }} />

                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <MiniBadge
                      label={needsPlayers ? 'Needs Players' : 'Private Booking'}
                      onSurface
                      sx={{
                        bgcolor: needsPlayers
                          ? 'rgba(255,255,146,0.3)'
                          : 'rgba(255,255,255,0.10)',
                        borderColor: needsPlayers
                          ? 'rgba(255,255,146,0.70)'
                          : 'rgba(255,255,255,0.16)',
                      }}
                    />
                    <MiniBadge
                      label={partnerCostSharing ? 'Cost Sharing' : 'Paid by Organizer'}
                      onSurface
                      sx={{
                        bgcolor: partnerCostSharing
                          ? 'rgba(255,255,146,0.30)'
                          : 'rgba(255,255,255,0.10)',
                        borderColor: partnerCostSharing
                          ? 'rgba(255,255,146,0.70)'
                          : 'rgba(255,255,255,0.16)',
                      }}
                    />
                  </Stack>

                  <Stack spacing={0.45}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)' }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        Organizer:
                      </Box>{' '}
                      {organizerName}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)' }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        Booked on:
                      </Box>{' '}
                      {formatDateTimeLong24(bookedOnTimestamp)}
                    </Typography>

                    {needsPlayers && minPlayers > 1 && cutoffDateTime && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.75,
                          color: 'rgba(255,255,255,0.92)',
                          lineHeight: 1.45,
                        }}
                      >
                        This booking will be confirmed only if the minimum number of
                        players is fulfilled before the cutoff date{' '}
                        <Box component="span" sx={{ fontWeight: 800 }}>
                          {formatDateTimeLong24(cutoffDateTime)}
                        </Box>{' '}
                        LT.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          </Box>

          {!hideOuterActions && (
                        <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={0}
              useFlexGap
              sx={{
                gap: { xs: 1.5, sm: 1.5 },
              }}
              justifyContent="flex-end"
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isCreatingBooking}
                  sx={{
                    minHeight: 48,
                    borderRadius: 3,
                    fontWeight: 700,
                    order: { xs: 2, sm: 1 },
                  }}
                >
                  Cancel
                </Button>
              )}

              <Button
                variant="contained"
                onClick={() => void handleCreateBooking()}
                disabled={isCreatingBooking}
                startIcon={
                  isCreatingBooking ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  borderRadius: 3,
                  fontWeight: 800,
                  order: { xs: 1, sm: 2 },
                }}
              >
                {isCreatingBooking ? 'Creating Booking...' : 'Create Booking'}
              </Button>
            </Stack>
          )}

          <Dialog
            open={showSuccessDialog}
            onClose={handleSuccessConfirm}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3.5,
                overflow: 'hidden',
                background: 'transparent',
                boxShadow: 'none',
              },
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                ...getCourtSurfaceTextureSx(court.surfaceType),
                p: 2.2,
                borderRadius: 3.5,
                borderColor: 'rgba(255,255,255,0.14)',
                boxShadow: '0 18px 42px rgba(15,23,42,0.28)',
              }}
            >
              <Box sx={getCourtLineAccentSx(court.surfaceType)} />

              <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
                <DialogTitle
                  sx={{
                    p: 0,
                    color: 'inherit',
                  }}
                >
                  <Stack direction="row" spacing={1.1} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(255,255,255,0.14)',
                        color: 'inherit',
                        border: '1px solid rgba(255,255,255,0.16)',
                        backdropFilter: 'blur(6px)',
                        flexShrink: 0,
                      }}
                    >
                      <ReceiptLongOutlinedIcon fontSize="small" />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Booking Created
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.84)' }}>
                        Your booking has been successfully created.
                      </Typography>
                    </Box>
                  </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: 0, color: 'inherit' }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                      gap: 1.1,
                    }}
                  >
                    <InfoStat
                      label="Court"
                      value={court.courtName || `Court #${court.courtId}`}
                      onSurface
                    />
                    <InfoStat label="Date" value={formatLocalDate(startDate)} onSurface />
                    <InfoStat
                      label="Time"
                      value={`${formatTime24(startDate)} - ${formatTime24(endDate)}`}
                      onSurface
                    />
                    <InfoStat
                      label="Duration"
                      value={formatDurationLabel(durationMinutes)}
                      onSurface
                    />
                    <InfoStat
                      label="Price"
                      value={
                        effectivePrice != null
                          ? formatCurrency(effectivePrice, effectiveCurrency)
                          : 'Undefined'
                      }
                      onSurface
                    />
                    <InfoStat
                      label="Status"
                      value={bookingResultStatus ?? 'Confirmed'}
                      onSurface
                      statusVariant={
                        bookingResultStatus?.toLowerCase() === 'pending'
                          ? 'pending'
                          : 'confirmed'
                      }
                    />
                  </Box>
                </DialogContent>

                <DialogActions sx={{ p: 0, justifyContent: 'flex-end' }}>
                  <Button
                    onClick={handleSuccessConfirm}
                    variant="contained"
                    sx={{
                      minHeight: 44,
                      px: 2.5,
                      borderRadius: 3,
                      fontWeight: 800,
                    }}
                  >
                    OK
                  </Button>
                </DialogActions>
              </Stack>
            </Paper>
          </Dialog>
        </>
      )}
    </Stack>
  );
}