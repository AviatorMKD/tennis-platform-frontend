import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import SportsTennisOutlinedIcon from '@mui/icons-material/SportsTennisOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  acceptBookingInvitation,
  getMyPendingInvitations,
  type BookingDto,
} from '../../../api/bookings.api';
import { useAuth } from '../../../auth/useAuth';
import { PendingInvitationCard } from '../components/PendingInvitationCard';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatLocalDate,
  fromUtcToLocalDate,
  getBusinessTodayDate,
} from '../../../shared/utils/dateTime';

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

function getInvitationDateKey(booking: BookingDto) {
  const date = fromUtcToLocalDate(booking.startUtc);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStatusCounts(bookings: BookingDto[]) {
  return bookings.reduce(
    (acc, booking) => {
      const status = (booking.status ?? '').toLowerCase();

      if (status === 'confirmed') acc.confirmed += 1;
      else if (status === 'pending') acc.pending += 1;
      else acc.other += 1;

      return acc;
    },
    {
      confirmed: 0,
      pending: 0,
      other: 0,
    }
  );
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

export function MyInvitationsPage() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState<'success' | 'error'>('success');
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

  const {
    data: invitations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['my-pending-invitations'],
    queryFn: getMyPendingInvitations,
  });

  const acceptMutation = useMutation({
    mutationFn: (bookingId: number) => acceptBookingInvitation(bookingId),
    onSuccess: async (updatedBooking: BookingDto) => {
      setFeedbackSeverity('success');
      setFeedbackMessage(
        `Invitation accepted successfully. Booking #${updatedBooking.id} is now ${
          updatedBooking.status ?? 'updated'
        }.`
      );

      setExpandedBookingId(null);

      await queryClient.invalidateQueries({ queryKey: ['my-pending-invitations'] });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['booking', updatedBooking.id] });
    },
    onError: (error) => {
      setFeedbackSeverity('error');
      setFeedbackMessage(extractApiErrorMessage(error, 'Failed to accept the invitation.'));
    },
  });

  const safeInvitations = invitations ?? [];
  const counts = getStatusCounts(safeInvitations);
  const userName = getUserDisplayName(auth);

  const nextInvitation = useMemo(() => {
    return [...safeInvitations].sort(
      (a, b) =>
        fromUtcToLocalDate(a.startUtc).getTime() -
        fromUtcToLocalDate(b.startUtc).getTime()
    )[0];
  }, [safeInvitations]);

  const todayCount = useMemo(() => {
    const today = getBusinessTodayDate();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;

    return safeInvitations.filter((booking) => getInvitationDateKey(booking) === todayKey).length;
  }, [safeInvitations]);

  const sortedInvitations = useMemo(() => {
    return [...safeInvitations].sort(
      (a, b) =>
        fromUtcToLocalDate(a.startUtc).getTime() -
        fromUtcToLocalDate(b.startUtc).getTime()
    );
  }, [safeInvitations]);

  const handleAccept = (bookingId: number) => {
    setFeedbackMessage('');
    acceptMutation.mutate(bookingId);
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
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MailOutlineOutlinedIcon />
              <Typography variant="overline" sx={{ letterSpacing: 1.4 }}>
                Player invitation dashboard
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
                My Invitations
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  maxWidth: 820,
                  opacity: 0.92,
                  fontSize: { xs: 18, md: 20 },
                }}
              >
                Welcome back, {userName}. Review pending invitations, expand a card for
                details, and accept while capacity is still available.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr 1fr',
                  md: 'repeat(5, minmax(0, 1fr))',
                },
                gap: 1,
              }}
            >
              <HeroStat label="Pending Invites" value={String(safeInvitations.length)} />
              <HeroStat label="Confirmed Sessions" value={String(counts.confirmed)} />
              <HeroStat label="Pending Sessions" value={String(counts.pending)} />
              <HeroStat label="Today" value={String(todayCount)} />
              <HeroStat
                label="Next"
                value={nextInvitation ? formatLocalDate(nextInvitation.startUtc) : 'None'}
              />
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<EventAvailableOutlinedIcon />}
                label={`${safeInvitations.length} pending invitation(s)`}
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
              />
              <Chip
                icon={<Groups2OutlinedIcon />}
                label="First come, first served"
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
              />
              <Chip
                icon={<SportsTennisOutlinedIcon />}
                label="Expand a card before accepting"
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'common.white' }}
              />
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3.5}>
          {feedbackMessage && (
            <Alert severity={feedbackSeverity}>{feedbackMessage}</Alert>
          )}

          {isLoading && <LoadingScreen />}

          {isError && <ErrorState message="Failed to load your pending invitations." />}

          {!isLoading && !isError && safeInvitations.length === 0 && (
            <EmptyState message="You do not have any pending invitations." />
          )}

          {!isLoading && !isError && safeInvitations.length > 0 && (
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
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Pending Invitations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {safeInvitations.length} invitation(s) awaiting your response.
                  </Typography>
                </Box>

                <Stack spacing={1.25}>
                  {sortedInvitations.map((booking) => {
                    const isThisBookingSubmitting =
                      acceptMutation.isPending && acceptMutation.variables === booking.id;

                    const acceptError =
                      acceptMutation.isError && acceptMutation.variables === booking.id
                        ? extractApiErrorMessage(
                            acceptMutation.error,
                            'Failed to accept invitation.'
                          )
                        : null;

                    return (
                      <PendingInvitationCard
                        key={booking.id}
                        booking={booking}
                        expanded={expandedBookingId === booking.id}
                        onToggleExpanded={() =>
                          setExpandedBookingId((current) =>
                            current === booking.id ? null : booking.id
                          )
                        }
                        onAccept={() => handleAccept(booking.id)}
                        acceptPending={isThisBookingSubmitting}
                        acceptError={acceptError}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}