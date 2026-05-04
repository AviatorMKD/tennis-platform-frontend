import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RefreshIcon from '@mui/icons-material/Refresh';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import TodayIcon from '@mui/icons-material/Today';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  cancelBooking,
  getBookingById,
  type BookingDto,
} from '../../../api/bookings.api';
import { getClubs, type ClubDto, type ClubMediaDto } from '../../../api/clubs.api';
import {
  getOperatorClubDaySchedule,
  type OperatorScheduleBlockDto,
  type OperatorScheduleBookingDto,
} from '../../../api/operatorSchedule.api';
import {
  formatLocalDateTime,
  formatLocalShortDate,
  formatLocalTime,
  fromUtcToLocalDate,
  getBusinessTodayIsoDate,
  getBusinessNowDate,
} from '../../../shared/utils/dateTime';

type SelectedItem =
  | { type: 'booking'; booking: OperatorScheduleBookingDto }
  | { type: 'block'; block: OperatorScheduleBlockDto }
  | null;

function isVideoMedia(item: ClubMediaDto) {
  const url = item.url.toLowerCase().split('?')[0];

  return (
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.ogg') ||
    url.endsWith('.mov') ||
    url.includes('/video/')
  );
}

function getHeroMedia(club: ClubDto | undefined): ClubMediaDto | null {
  if (!club) {
    return null;
  }

  return (
    (club.media ?? [])
      .filter((item) => item.usageType?.toLowerCase() === 'hero')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    (club.media ?? [])
      .filter((item) => item.usageType?.toLowerCase() === 'gallery')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] ??
    null
  );
}

function parseTimeToMinutes(value: string) {
  const normalized = value.slice(0, 5);

  if (normalized === '24:00') {
    return 24 * 60;
  }

  const [hourText, minuteText] = normalized.split(':');
  return Number(hourText) * 60 + Number(minuteText);
}

function formatMinutes(value: number) {
  const bounded = Math.max(0, Math.min(24 * 60, value));

  if (bounded === 24 * 60) {
    return '00:00';
  }

  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;

  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function buildTicks(openMinutes: number, closeMinutes: number) {
  const span = closeMinutes - openMinutes;
  const interval = span <= 720 ? 30 : 60;
  const ticks: number[] = [];

  const first = Math.ceil(openMinutes / interval) * interval;

  if (first > openMinutes) {
    ticks.push(openMinutes);
  }

  for (let minute = first; minute <= closeMinutes; minute += interval) {
    ticks.push(minute);
  }

  if (!ticks.includes(closeMinutes)) {
    ticks.push(closeMinutes);
  }

  return ticks;
}

function getLocalMinuteOfDay(utcValue: string) {
  const local = fromUtcToLocalDate(utcValue);
  return local.getHours() * 60 + local.getMinutes();
}

function getNowMinuteOfDay() {
  const now = getBusinessNowDate();
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

function getTimelinePosition(
  startUtc: string,
  endUtc: string,
  openMinutes: number,
  closeMinutes: number
) {
  const span = Math.max(1, closeMinutes - openMinutes);

  const rawStart = getLocalMinuteOfDay(startUtc);
  const rawEnd = getLocalMinuteOfDay(endUtc);

  const start = Math.max(openMinutes, Math.min(closeMinutes, rawStart));
  const end = Math.max(openMinutes, Math.min(closeMinutes, rawEnd));

  return {
    left: `${((start - openMinutes) / span) * 100}%`,
    width: `${(Math.max(1, end - start) / span) * 100}%`,
  };
}

function getNowLineLeft(nowMinutes: number, openMinutes: number, closeMinutes: number) {
  if (nowMinutes < openMinutes || nowMinutes > closeMinutes) {
    return null;
  }

  const span = Math.max(1, closeMinutes - openMinutes);
  return `${((nowMinutes - openMinutes) / span) * 100}%`;
}

function getBookingColor(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'confirmed') {
    return {
      bgcolor: 'success.main',
      borderColor: 'success.dark',
      color: 'success.contrastText',
    };
  }

  if (normalized === 'pending') {
    return {
      bgcolor: 'warning.main',
      borderColor: 'warning.dark',
      color: 'warning.contrastText',
    };
  }

  return {
    bgcolor: 'grey.600',
    borderColor: 'grey.800',
    color: 'common.white',
  };
}

function getSurfaceTexture(surfaceType: string | null) {
  const normalized = (surfaceType ?? '').trim().toLowerCase();

  if (normalized.includes('clay')) {
    return {
      background:
        'linear-gradient(135deg, rgba(191,87,40,0.22), rgba(232,141,82,0.16)), radial-gradient(circle at 18% 22%, rgba(120,53,24,0.18) 0 1px, transparent 1px), radial-gradient(circle at 70% 72%, rgba(255,255,255,0.28) 0 1px, transparent 1px)',
      backgroundSize: 'auto, 12px 12px, 16px 16px',
    };
  }

  if (normalized.includes('grass')) {
    return {
      background:
        'linear-gradient(135deg, rgba(46,125,50,0.22), rgba(129,199,132,0.14)), repeating-linear-gradient(90deg, rgba(27,94,32,0.08) 0 2px, transparent 2px 8px)',
    };
  }

  if (normalized.includes('carpet')) {
    return {
      background:
        'linear-gradient(135deg, rgba(92,64,51,0.18), rgba(141,110,99,0.12)), repeating-linear-gradient(45deg, rgba(80,60,50,0.08) 0 2px, transparent 2px 7px)',
    };
  }

  if (normalized.includes('hard') || normalized.includes('acrylic')) {
    return {
      background:
        'linear-gradient(135deg, rgba(25,118,210,0.18), rgba(100,181,246,0.12)), radial-gradient(circle at 24% 20%, rgba(255,255,255,0.35) 0 1px, transparent 1px)',
      backgroundSize: 'auto, 14px 14px',
    };
  }

  if (normalized.includes('synthetic')) {
    return {
      background:
        'linear-gradient(135deg, rgba(0,121,107,0.18), rgba(77,182,172,0.12)), repeating-linear-gradient(90deg, rgba(0,77,64,0.06) 0 2px, transparent 2px 8px)',
    };
  }

  return {
    background:
      'linear-gradient(135deg, rgba(100,116,139,0.14), rgba(226,232,240,0.22))',
  };
}

function canCancelBooking(booking: BookingDto | undefined) {
  if (!booking?.status) {
    return false;
  }

  const normalized = booking.status.trim().toLowerCase();

  return normalized !== 'cancelled' && normalized !== 'completed';
}

function BookingTooltipContent({ booking }: { booking: OperatorScheduleBookingDto }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption">Status: {booking.status}</Typography>
      <Typography variant="caption">From: {formatLocalTime(booking.startUtc)}</Typography>
      <Typography variant="caption">To: {formatLocalTime(booking.endUtc)}</Typography>
      <Typography variant="caption">Reserved by: {booking.ownerName}</Typography>
      <Typography variant="caption">
        Booked at: {formatLocalDateTime(booking.createdUtc)}
      </Typography>
      <Typography variant="caption">
        Booking comment: {booking.notes?.trim() || 'None'}
      </Typography>
    </Stack>
  );
}

function BlockTooltipContent({ block }: { block: OperatorScheduleBlockDto }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption">Type: Court block</Typography>
      <Typography variant="caption">From: {formatLocalTime(block.startUtc)}</Typography>
      <Typography variant="caption">To: {formatLocalTime(block.endUtc)}</Typography>
      <Typography variant="caption">
        Created at: {formatLocalDateTime(block.createdUtc)}
      </Typography>
      <Typography variant="caption">Reason: {block.reason?.trim() || 'None'}</Typography>
    </Stack>
  );
}

type FullBookingDetailsProps = {
  booking: BookingDto | undefined;
  isCancelling: boolean;
  cancelErrorMessage: string | null;
  onRequestCancel: () => void;
};

function FullBookingDetails({
  booking,
  isCancelling,
  cancelErrorMessage,
  onRequestCancel,
}: FullBookingDetailsProps) {
  if (!booking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const showCancelButton = canCancelBooking(booking);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip label={booking.status || 'Unknown status'} color="primary" />
        <Chip
          label={`${formatLocalTime(booking.startUtc)} – ${formatLocalTime(
            booking.endUtc
          )}`}
        />
        <Chip label={`${booking.bookedPrice} ${booking.currency || ''}`} />
        <Chip
          label={booking.partnerCostSharing ? 'Cost sharing' : 'Organizer pays'}
          variant="outlined"
        />
      </Stack>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Booking
        </Typography>
        <Typography variant="body2">
          Club: {booking.clubName || `#${booking.clubId}`}
        </Typography>
        <Typography variant="body2">
          Court: {booking.courtName || `#${booking.courtId}`}
        </Typography>
        <Typography variant="body2">
          Booked at: {formatLocalDateTime(booking.createdUtc)}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Players
        </Typography>
        <Typography variant="body2">
          Confirmed: {booking.confirmedPlayersCount} / minimum{' '}
          {booking.minimumPlayersRequired} / maximum {booking.maximumPlayersAllowed}
        </Typography>
        <Typography variant="body2">
          Needs additional players: {booking.needsAdditionalPlayers ? 'Yes' : 'No'}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          Comment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {booking.notes?.trim() || 'No booking comment.'}
        </Typography>
      </Box>

      {booking.participants.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Participants
          </Typography>
          <Stack spacing={1}>
            {booking.participants.map((participant) => (
              <Box
                key={participant.id}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {participant.displayName ||
                    `User #${participant.userId ?? 'unknown'}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {participant.participantType || 'Participant'} ·{' '}
                  {participant.participationStatus || 'Unknown'}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {cancelErrorMessage && <Alert severity="error">{cancelErrorMessage}</Alert>}

      {showCancelButton && (
        <>
          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Operator actions
            </Typography>

            <Button
              color="error"
              variant="contained"
              onClick={onRequestCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel booking'}
            </Button>
          </Box>
        </>
      )}
    </Stack>
  );
}

export function OperatorClubSchedulePage() {
  const { clubId } = useParams();
  const parsedClubId = Number(clubId);
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(getBusinessTodayIsoDate());
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [nowMinutes, setNowMinutes] = useState(getNowMinuteOfDay());
  const [bookingToCancel, setBookingToCancel] = useState<BookingDto | null>(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMinutes(getNowMinuteOfDay());
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const scheduleAutoRefreshMs = import.meta.env.DEV ? 15_000 : 300_000;

  const scheduleQuery = useQuery({
    queryKey: ['operator-club-schedule', parsedClubId, selectedDate],
    queryFn: () => getOperatorClubDaySchedule(parsedClubId, selectedDate),
    enabled: Number.isInteger(parsedClubId) && parsedClubId > 0 && !!selectedDate,
    refetchInterval: scheduleAutoRefreshMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    placeholderData: (previousData) => previousData,
  });

  const clubsQuery = useQuery({
    queryKey: ['clubs'],
    queryFn: getClubs,
    enabled: Number.isInteger(parsedClubId) && parsedClubId > 0,
    staleTime: 10 * 60 * 1000,
  });

  const selectedBookingId =
    selectedItem?.type === 'booking' ? selectedItem.booking.bookingId : null;

  const bookingDetailsQuery = useQuery({
    queryKey: ['booking-details', selectedBookingId],
    queryFn: () => getBookingById(selectedBookingId!),
    enabled: selectedBookingId != null,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => cancelBooking(bookingId),
    onSuccess: async (_cancelledBooking, bookingId) => {
      setBookingToCancel(null);
      setCancelErrorMessage(null);
      setSelectedItem(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['operator-club-schedule', parsedClubId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['booking-details', bookingId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['my-bookings'],
        }),
      ]);

      await scheduleQuery.refetch();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to cancel booking. Please try again.';

      setCancelErrorMessage(message);
      setBookingToCancel(null);
    },
  });

  const schedule = scheduleQuery.data;

  const currentClub = useMemo(() => {
    return (clubsQuery.data ?? []).find((club) => club.id === parsedClubId);
  }, [clubsQuery.data, parsedClubId]);

  const heroMedia = useMemo(() => getHeroMedia(currentClub), [currentClub]);

  const openMinutes = useMemo(() => {
    return parseTimeToMinutes(schedule?.operatingOpenTime ?? '00:00');
  }, [schedule?.operatingOpenTime]);

  const closeMinutes = useMemo(() => {
    return parseTimeToMinutes(schedule?.operatingCloseTime ?? '24:00');
  }, [schedule?.operatingCloseTime]);

  const ticks = useMemo(
    () => buildTicks(openMinutes, closeMinutes),
    [openMinutes, closeMinutes]
  );

  const isToday = selectedDate === getBusinessTodayIsoDate();

  const nowLineLeft = useMemo(() => {
    if (!isToday) {
      return null;
    }

    return getNowLineLeft(nowMinutes, openMinutes, closeMinutes);
  }, [isToday, nowMinutes, openMinutes, closeMinutes]);

  const pageTitle = schedule?.clubName
    ? `${schedule.clubName}  Play Schedule`
    : 'Daily Play Schedule';

  if (!Number.isInteger(parsedClubId) || parsedClubId <= 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">Invalid club id.</Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Box
          sx={{
            color: 'common.white',
            py: { xs: 4, md: 6 },
            position: 'relative',
            overflow: 'hidden',
            background:
              'linear-gradient(180deg, rgba(21,101,192,0.96) 0%, rgba(66,165,245,0.9) 100%)',
          }}
        >
          {heroMedia ? (
            isVideoMedia(heroMedia) ? (
              <Box
                component="video"
                src={heroMedia.url}
                autoPlay
                muted
                loop
                playsInline
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                component="img"
                src={heroMedia.url}
                alt={schedule?.clubName || currentClub?.name || 'Club hero'}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )
          ) : null}

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(8,32,64,0.74) 0%, rgba(8,32,64,0.58) 48%, rgba(8,32,64,0.78) 100%)',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.14) 0, rgba(255,255,255,0) 20%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 16%)',
            }}
          />

          <Container maxWidth="xl" sx={{ position: 'relative' }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarMonthIcon />
                <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                  Live operator schedule
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
                      xs: '2.05rem',
                      sm: '2.55rem',
                      md: '3.25rem',
                      lg: '3.9rem',
                    },
                    textShadow: '0 8px 28px rgba(0,0,0,0.14)',
                  }}
                >
                  {pageTitle}
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    maxWidth: 1100,
                    opacity: 0.92,
                    fontSize: { xs: 18, md: 20 },
                    textShadow: '0 2px 12px rgba(0,0,0,0.24)',
                  }}
                >
                  Live roster view of bookings and court blocks across all courts.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={formatLocalShortDate(selectedDate)}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                />
                <Chip
                  label={
                    scheduleQuery.isFetching
                      ? 'Refreshing...'
                      : import.meta.env.DEV
                        ? 'Auto-refresh: 15s'
                        : 'Auto-refresh: 5 min'
                  }
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                />
                {isToday && (
                  <Chip
                    label={`Now: ${formatMinutes(Math.floor(nowMinutes))}`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                  />
                )}
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'center' }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1.25, sm: 1.5 }}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ width: '100%' }}
                  >
                    <DatePicker
                      label="Schedule date"
                      value={dayjs(selectedDate)}
                      onChange={(value) => {
                        if (!value) {
                          return;
                        }

                        setSelectedDate(value.format('YYYY-MM-DD'));
                      }}
                      format="DD/MM/YYYY"
                      slotProps={{
                        textField: {
                          size: 'small',
                        },
                      }}
                    />

                    <Button
                      variant={isToday ? 'contained' : 'outlined'}
                      startIcon={<TodayIcon />}
                      onClick={() => setSelectedDate(getBusinessTodayIsoDate())}
                    >
                      Today
                    </Button>

                    {schedule && (
                      <>
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={`${schedule.operatingOpenTime} – ${schedule.operatingCloseTime}`}
                          variant="outlined"
                        />
                        <Chip
                          icon={<SportsTennisIcon />}
                          label={`${schedule.courts.length} court(s)`}
                          variant="outlined"
                        />
                        <Chip
                          label={`${schedule.bookings.length} booking(s)`}
                          color={schedule.bookings.length > 0 ? 'success' : 'default'}
                          variant="outlined"
                        />
                        <Chip
                          label={`${schedule.blocks.length} block(s)`}
                          color={schedule.blocks.length > 0 ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      </>
                    )}
                  </Stack>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => void scheduleQuery.refetch()}
                    disabled={scheduleQuery.isFetching}
                    sx={{ width: { xs: '100%', md: 'auto' } }}
                  >
                    Refresh
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {scheduleQuery.isLoading && !schedule && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {scheduleQuery.isError && (
              <Alert severity="error">Failed to load operator schedule.</Alert>
            )}

            {schedule && (
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  bgcolor: '#ffffff',
                  boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
                }}
              >
                <Box sx={{ overflowX: { xs: 'auto', xl: 'hidden' } }}>
                  <Box
                    sx={{
                      minWidth: { xs: 980, xl: 0 },
                      width: '100%',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '210px 1fr', lg: '220px 1fr' },
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRight: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 900 }}>
                          Court
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          position: 'relative',
                          height: 62,
                          pr: { xs: 2, xl: 4 },
                          background:
                            'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            right: { xs: 16, xl: 32 },
                            top: 34,
                            height: 12,
                            borderTop: '2px solid',
                            borderColor: 'text.secondary',
                          }}
                        />

                        {ticks.map((tick) => {
                          const span = Math.max(1, closeMinutes - openMinutes);
                          const left = `${((tick - openMinutes) / span) * 100}%`;
                          const isMajor =
                            tick % 60 === 0 ||
                            tick === openMinutes ||
                            tick === closeMinutes;

                          return (
                            <Box
                              key={tick}
                              sx={{
                                position: 'absolute',
                                left,
                                top: 10,
                                bottom: 0,
                                width: 0,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  fontWeight: 850,
                                  fontSize: '0.68rem',
                                  color: 'text.secondary',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatMinutes(tick)}
                              </Typography>

                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 24,
                                  left: 0,
                                  width: '1px',
                                  height: isMajor ? 18 : 11,
                                  bgcolor: isMajor ? 'text.secondary' : 'divider',
                                }}
                              />
                            </Box>
                          );
                        })}

                        {nowLineLeft && (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: nowLineLeft,
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              bgcolor: 'error.main',
                              zIndex: 5,
                              boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {schedule.courts.length === 0 && (
                      <Box sx={{ p: 3 }}>
                        <Alert severity="info">No courts found for this club.</Alert>
                      </Box>
                    )}

                    {schedule.courts.map((court) => {
                      const courtBookings = schedule.bookings.filter(
                        (booking) => booking.courtId === court.courtId
                      );

                      const courtBlocks = schedule.blocks.filter(
                        (block) => block.courtId === court.courtId
                      );

                      return (
                        <Box
                          key={court.courtId}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '210px 1fr', lg: '220px 1fr' },
                            minHeight: 58,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-of-type': {
                              borderBottom: 0,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              p: 1.35,
                              borderRight: '1px solid',
                              borderColor: 'divider',
                              opacity: court.isActive ? 1 : 0.65,
                              ...getSurfaceTexture(court.surfaceType),
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 850 }}>
                              {court.courtName || `Court #${court.courtId}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {court.surfaceType || 'Surface unspecified'} ·{' '}
                              {court.isIndoor ? 'Indoor' : 'Outdoor'}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              position: 'relative',
                              minHeight: 58,
                              pr: { xs: 2, xl: 4 },
                              background: 'transparent',
                            }}
                          >
                            {nowLineLeft && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: nowLineLeft,
                                  top: 0,
                                  bottom: 0,
                                  width: '2px',
                                  bgcolor: 'error.main',
                                  zIndex: 4,
                                  boxShadow: '0 0 0 1px rgba(255,255,255,0.75)',
                                  pointerEvents: 'none',
                                }}
                              />
                            )}

                            {courtBookings.map((booking) => {
                              const position = getTimelinePosition(
                                booking.startUtc,
                                booking.endUtc,
                                openMinutes,
                                closeMinutes
                              );

                              const colors = getBookingColor(booking.status);

                              return (
                                <Tooltip
                                  key={`booking-${booking.bookingId}`}
                                  arrow
                                  title={<BookingTooltipContent booking={booking} />}
                                >
                                  <Box
                                    onClick={() => {
                                      setCancelErrorMessage(null);
                                      setSelectedItem({ type: 'booking', booking });
                                    }}
                                    sx={{
                                      position: 'absolute',
                                      left: position.left,
                                      width: position.width,
                                      top: 13,
                                      height: 30,
                                      borderRadius: 0.75,
                                      px: 0.75,
                                      display: 'flex',
                                      alignItems: 'center',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: '1px solid',
                                      borderColor: colors.borderColor,
                                      bgcolor: colors.bgcolor,
                                      color: colors.color,
                                      boxShadow: '0 3px 8px rgba(15,23,42,0.16)',
                                      zIndex: 6,
                                      '&:hover': {
                                        filter: 'brightness(0.95)',
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 850,
                                        fontSize: '0.66rem',
                                        lineHeight: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {booking.ownerName} · {formatLocalTime(booking.startUtc)}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })}

                            {courtBlocks.map((block) => {
                              const position = getTimelinePosition(
                                block.startUtc,
                                block.endUtc,
                                openMinutes,
                                closeMinutes
                              );

                              return (
                                <Tooltip
                                  key={`block-${block.blockId}`}
                                  arrow
                                  title={<BlockTooltipContent block={block} />}
                                >
                                  <Box
                                    onClick={() => setSelectedItem({ type: 'block', block })}
                                    sx={{
                                      position: 'absolute',
                                      left: position.left,
                                      width: position.width,
                                      top: 13,
                                      height: 30,
                                      borderRadius: 0.75,
                                      px: 0.75,
                                      display: 'flex',
                                      alignItems: 'center',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: '1px dashed',
                                      borderColor: 'error.dark',
                                      bgcolor: 'error.light',
                                      color: 'error.contrastText',
                                      boxShadow: '0 3px 8px rgba(15,23,42,0.14)',
                                      zIndex: 6,
                                      '&:hover': {
                                        filter: 'brightness(0.95)',
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 850,
                                        fontSize: '0.66rem',
                                        lineHeight: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Block · {formatLocalTime(block.startUtc)}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Paper>
            )}
          </Stack>
        </Container>

        <Dialog
          open={selectedItem != null}
          onClose={() => {
            if (!cancelBookingMutation.isPending) {
              setSelectedItem(null);
              setBookingToCancel(null);
              setCancelErrorMessage(null);
            }
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedItem?.type === 'booking'
              ? `Booking #${selectedItem.booking.bookingId}`
              : selectedItem?.type === 'block'
                ? `Court block #${selectedItem.block.blockId}`
                : 'Details'}
          </DialogTitle>

          <DialogContent dividers>
            {selectedItem?.type === 'booking' && (
              <FullBookingDetails
                booking={bookingDetailsQuery.data}
                isCancelling={cancelBookingMutation.isPending}
                cancelErrorMessage={cancelErrorMessage}
                onRequestCancel={() => {
                  if (bookingDetailsQuery.data) {
                    setCancelErrorMessage(null);
                    setBookingToCancel(bookingDetailsQuery.data);
                  }
                }}
              />
            )}

            {selectedItem?.type === 'block' && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Court block" color="error" />
                  <Chip
                    label={`${formatLocalTime(selectedItem.block.startUtc)} – ${formatLocalTime(
                      selectedItem.block.endUtc
                    )}`}
                    variant="outlined"
                  />
                </Stack>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Court
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem.block.courtName ||
                      `Court #${selectedItem.block.courtId}`}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatLocalDateTime(selectedItem.block.createdUtc)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Reason
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedItem.block.reason?.trim() || 'No reason provided.'}
                  </Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={bookingToCancel != null}
          onClose={() => {
            if (!cancelBookingMutation.isPending) {
              setBookingToCancel(null);
            }
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Cancel booking?</DialogTitle>

          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Typography variant="body2">
                This will cancel the booking and remove it from the live schedule after refresh.
              </Typography>

              {bookingToCancel && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {bookingToCancel.clubName || `Club #${bookingToCancel.clubId}`}
                  </Typography>
                  <Typography variant="body2">
                    {bookingToCancel.courtName || `Court #${bookingToCancel.courtId}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatLocalTime(bookingToCancel.startUtc)} –{' '}
                    {formatLocalTime(bookingToCancel.endUtc)}
                  </Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => setBookingToCancel(null)}
              disabled={cancelBookingMutation.isPending}
            >
              Keep booking
            </Button>

            <Button
              color="error"
              variant="contained"
              disabled={cancelBookingMutation.isPending || bookingToCancel == null}
              onClick={() => {
                if (bookingToCancel) {
                  cancelBookingMutation.mutate(bookingToCancel.id);
                }
              }}
            >
              {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel booking'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}