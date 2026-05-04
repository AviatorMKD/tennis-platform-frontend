import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { BookingDto } from '../../../api/bookings.api';
import {
  acceptBookingInvitation,
  cancelBooking,
  getMyBookings,
} from '../../../api/bookings.api';
import { getMyProfile } from '../../../api/users.api';
import { useAuth } from '../../../auth/useAuth';
import { MyBookingListCard } from '../components/MyBookingListCard';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatLocalDate,
  fromUtcToLocalDate,
  getBusinessTodayDate,
} from '../../../shared/utils/dateTime';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthTitle(date: Date) {
  return date.toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const firstWeekday = firstDay.getDay();
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

function getBookingDateKey(booking: BookingDto) {
  return getDateKey(fromUtcToLocalDate(booking.startUtc));
}

function getStatusCounts(bookings: BookingDto[]) {
  return bookings.reduce(
    (acc, booking) => {
      const status = (booking.status ?? '').toLowerCase();

      if (status === 'confirmed') acc.confirmed += 1;
      else if (status === 'pending') acc.pending += 1;
      else if (status === 'cancelled') acc.cancelled += 1;
      else if (status === 'completed') acc.completed += 1;
      else acc.other += 1;

      return acc;
    },
    {
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0,
      other: 0,
    }
  );
}

function getUserDisplayName(authValue: unknown) {
  if (!authValue || typeof authValue !== 'object') {
    return 'Player';
  }

  const root = authValue as Record<string, unknown>;
  const user =
    root.user && typeof root.user === 'object'
      ? (root.user as Record<string, unknown>)
      : root;

  const firstName = typeof user.firstName === 'string' ? user.firstName : '';
  const lastName = typeof user.lastName === 'string' ? user.lastName : '';
  const username = typeof user.username === 'string' ? user.username : '';
  const email = typeof user.email === 'string' ? user.email : '';

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || username || email || 'Player';
}

function getCurrentUserId(authValue: unknown) {
  if (!authValue || typeof authValue !== 'object') return null;

  const root = authValue as Record<string, unknown>;
  const user =
    root.user && typeof root.user === 'object'
      ? (root.user as Record<string, unknown>)
      : root;

  return typeof user.id === 'number' ? user.id : null;
}

function getIsAuthenticated(authValue: unknown) {
  if (!authValue || typeof authValue !== 'object') return false;

  const root = authValue as Record<string, unknown>;
  return root.isAuthenticated === true;
}

function getStatusDotColor(status: string) {
  switch (status) {
    case 'confirmed':
      return 'success.main';
    case 'pending':
      return 'warning.main';
    case 'cancelled':
      return 'error.main';
    case 'completed':
      return 'info.main';
    default:
      return 'grey.500';
  }
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.05,
        borderRadius: 2.25,
        bgcolor: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.78)',
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        {label}
      </Typography>

      <Typography variant="body2" sx={{ fontWeight: 900, color: '#ffffff' }}>
        {value}
      </Typography>
    </Box>
  );
}

function CalendarLegendChip({ status, label }: { status: string; label: string }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: getStatusDotColor(status),
            }}
          />
          <Box component="span">{label}</Box>
        </Stack>
      }
      sx={{
        bgcolor: '#ffffff',
        '& .MuiChip-label': {
          display: 'flex',
          alignItems: 'center',
        },
      }}
    />
  );
}

function MonthlyCalendar({
  month,
  selectedDateKey,
  bookingsByDate,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}: {
  month: Date;
  selectedDateKey: string;
  bookingsByDate: Map<string, BookingDto[]>;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const days = getCalendarDays(month);
  const todayKey = getDateKey(getBusinessTodayDate());

  return (
    <Paper
      elevation={8}
      sx={{
        borderRadius: { xs: 4, md: 3 },
        p: { xs: 2, md: 3 },
        bgcolor: '#f7f7f7',
        color: 'text.primary',
        boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
      }}
    >
      <Stack spacing={1.75}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button size="small" variant="outlined" onClick={onPreviousMonth}>
            Prev
          </Button>

          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {getMonthTitle(month)}
          </Typography>

          <Button size="small" variant="outlined" onClick={onNextMonth}>
            Next
          </Button>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.45 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel) => (
            <Typography
              key={dayLabel}
              variant="caption"
              sx={{
                textAlign: 'center',
                color: 'text.secondary',
                fontWeight: 900,
              }}
            >
              {dayLabel}
            </Typography>
          ))}

          {days.map((day) => {
            const key = getDateKey(day);
            const bookings = bookingsByDate.get(key) ?? [];
            const isCurrentMonth = day.getMonth() === month.getMonth();
            const isSelected = key === selectedDateKey;
            const isToday = key === todayKey;
            const counts = getStatusCounts(bookings);

            return (
              <Box
                key={key}
                component="button"
                type="button"
                onClick={() => onSelectDate(day)}
                sx={{
                  minHeight: 46,
                  border: '1px solid',
                  borderColor: isSelected
                    ? 'success.main'
                    : isToday
                      ? 'rgba(46,125,50,0.95)'
                      : 'divider',
                  borderWidth: isToday ? 2 : 1,
                  borderRadius: 1.25,
                  bgcolor: isSelected ? 'rgba(46,125,50,0.13)' : '#fff',
                  color: isCurrentMonth ? 'text.primary' : 'text.disabled',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.35,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: 'rgba(46,125,50,0.10)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSelected || isToday ? 900 : 700,
                  }}
                >
                  {day.getDate()}
                </Typography>

                {bookings.length > 0 && (
                  <Stack direction="row" spacing={0.25}>
                    {(['confirmed', 'pending', 'cancelled', 'completed'] as const).map(
                      (status) =>
                        counts[status] > 0 && (
                          <Box
                            key={status}
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              bgcolor: getStatusDotColor(status),
                            }}
                          />
                        )
                    )}
                  </Stack>
                )}
              </Box>
            );
          })}
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
          <CalendarLegendChip status="confirmed" label="Confirmed" />
          <CalendarLegendChip status="pending" label="Pending" />
          <CalendarLegendChip status="cancelled" label="Cancelled" />
          <CalendarLegendChip status="completed" label="Completed" />
        </Stack>
      </Stack>
    </Paper>
  );
}

export function MyBookingsPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const currentUserId = getCurrentUserId(auth);
  const isAuthenticated = getIsAuthenticated(auth);

  const [selectedDate, setSelectedDate] = useState<Date>(() => getBusinessTodayDate());
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(getBusinessTodayDate()));
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
  });

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 30_000,
    enabled: isAuthenticated,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: (bookingId: number) => acceptBookingInvitation(bookingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-pending-invitations'] }),
      ]);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => cancelBooking(bookingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-pending-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['club-booking-discovery'] }),
        queryClient.invalidateQueries({ queryKey: ['club-time-grid'] }),
        queryClient.invalidateQueries({ queryKey: ['club-day-occupancy'] }),
      ]);
    },
  });

  const safeBookings = bookings ?? [];
  const selectedDateKey = getDateKey(selectedDate);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingDto[]>();

    for (const booking of safeBookings) {
      const key = getBookingDateKey(booking);
      const existing = map.get(key) ?? [];
      existing.push(booking);
      map.set(key, existing);
    }

    return map;
  }, [safeBookings]);

  const selectedBookings = useMemo(() => {
    return [...(bookingsByDate.get(selectedDateKey) ?? [])].sort(
      (a, b) =>
        fromUtcToLocalDate(a.startUtc).getTime() -
        fromUtcToLocalDate(b.startUtc).getTime()
    );
  }, [bookingsByDate, selectedDateKey]);

  const counts = getStatusCounts(safeBookings);
  const userName = getUserDisplayName(auth);
  const profile = profileQuery.data;

  const heroInitials = useMemo(() => {
    const first = profile?.firstName?.trim()?.[0] ?? '';
    const last = profile?.lastName?.trim()?.[0] ?? '';
    const fromProfile = `${first}${last}`.toUpperCase();

    if (fromProfile) {
      return fromProfile;
    }

    return userName.charAt(0).toUpperCase() || 'P';
  }, [profile, userName]);

  const handleCancelBooking = (bookingId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking? This action may notify other participants.'
    );

    if (!confirmed) return;

    cancelBookingMutation.mutate(bookingId);
  };

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <Box
        sx={{
          background:
            'linear-gradient(180deg, rgba(27,94,32,0.92) 0%, rgba(56,142,60,0.86) 100%)',
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
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                xl: 'minmax(0, 1.15fr) minmax(360px, 620px)',
              },
              gap: { xs: 3, xl: 5 },
              alignItems: 'center',
            }}
          >
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  src={profile?.profileImage?.url ?? undefined}
                  alt={userName}
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    fontWeight: 900,
                    bgcolor: 'rgba(255,255,255,0.22)',
                    color: 'common.white',
                    border: '1px solid rgba(255,255,255,0.35)',
                  }}
                >
                  {heroInitials}
                </Avatar>

                <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                  Player booking dashboard
                </Typography>
              </Stack>

              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    mb: 1.25,
                    maxWidth: 760,
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
                  My Bookings
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    maxWidth: 760,
                    opacity: 0.92,
                    fontSize: { xs: 18, md: 20 },
                  }}
                >
                  Welcome back, {userName}. Use the calendar to review your bookings by date,
                  then expand any booking card to view details and available actions.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                <HeroStat label="Total" value={String(safeBookings.length)} />
                <HeroStat label="Confirmed" value={String(counts.confirmed)} />
                <HeroStat label="Pending" value={String(counts.pending)} />
                <HeroStat label="Completed" value={String(counts.completed)} />
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<EventAvailableOutlinedIcon />}
                  label={`${selectedBookings.length} booking(s) on selected date`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                />
                <Chip
                  icon={<Groups2OutlinedIcon />}
                  label="Expand a card for details and actions"
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
                />
              </Stack>
            </Stack>

            <Box sx={{ width: '100%', minWidth: 0, justifySelf: 'stretch' }}>
              <MonthlyCalendar
                month={visibleMonth}
                selectedDateKey={selectedDateKey}
                bookingsByDate={bookingsByDate}
                onPreviousMonth={() => setVisibleMonth((current) => addMonths(current, -1))}
                onNextMonth={() => setVisibleMonth((current) => addMonths(current, 1))}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setVisibleMonth(startOfMonth(date));
                  setExpandedBookingId(null);
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3.5}>
          {isLoading && <LoadingScreen />}

          {isError && <ErrorState message="Failed to load your bookings." />}

          {!isLoading && !isError && safeBookings.length === 0 && (
            <EmptyState message="You do not have any bookings yet." />
          )}

          {!isLoading && !isError && safeBookings.length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 4,
                bgcolor: '#ffffff',
                boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
              }}
            >
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {formatLocalDate(selectedDate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedBookings.length > 0
                        ? `${selectedBookings.length} booking(s) scheduled for this date.`
                        : 'No bookings scheduled for this date.'}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    onClick={() => {
                      const today = getBusinessTodayDate();
                      setSelectedDate(today);
                      setVisibleMonth(startOfMonth(today));
                      setExpandedBookingId(null);
                    }}
                    sx={{ borderRadius: 3, fontWeight: 800 }}
                  >
                    Today
                  </Button>
                </Stack>

                {acceptInvitationMutation.isSuccess && (
                  <Alert severity="success">Invitation accepted successfully.</Alert>
                )}

                {cancelBookingMutation.isSuccess && (
                  <Alert severity="success">Booking cancelled successfully.</Alert>
                )}

                {selectedBookings.length === 0 ? (
                  <EmptyState message="No bookings on the selected date." />
                ) : (
                  <Stack spacing={1.25}>
                    {selectedBookings.map((booking) => {
                      const isAcceptPending =
                        acceptInvitationMutation.isPending &&
                        acceptInvitationMutation.variables === booking.id;

                      const isCancelPending =
                        cancelBookingMutation.isPending &&
                        cancelBookingMutation.variables === booking.id;

                      const acceptError =
                        acceptInvitationMutation.isError &&
                        acceptInvitationMutation.variables === booking.id
                          ? extractApiErrorMessage(
                              acceptInvitationMutation.error,
                              'Failed to accept invitation.'
                            )
                          : null;

                      const cancelError =
                        cancelBookingMutation.isError &&
                        cancelBookingMutation.variables === booking.id
                          ? extractApiErrorMessage(
                              cancelBookingMutation.error,
                              'Failed to cancel booking.'
                            )
                          : null;

                      return (
                        <MyBookingListCard
                          key={booking.id}
                          booking={booking}
                          expanded={expandedBookingId === booking.id}
                          currentUserId={currentUserId}
                          isAuthenticated={isAuthenticated}
                          onToggleExpanded={() =>
                            setExpandedBookingId((current) =>
                              current === booking.id ? null : booking.id
                            )
                          }
                          onAcceptInvitation={() => acceptInvitationMutation.mutate(booking.id)}
                          onCancelBooking={() => handleCancelBooking(booking.id)}
                          acceptPending={isAcceptPending}
                          cancelPending={isCancelPending}
                          acceptError={acceptError}
                          cancelError={cancelError}
                        />
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}