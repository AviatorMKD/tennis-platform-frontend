import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SportsTennisOutlinedIcon from '@mui/icons-material/SportsTennisOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  BookingDto,
  BookingInvitationDto,
  BookingParticipantDto,
} from '../../../api/bookings.api';
import {
  acceptBookingInvitation,
  cancelBooking,
  getBookingById,
} from '../../../api/bookings.api';
import { useAuth } from '../../../auth/useAuth';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  fromUtcToLocalDate,
} from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

function getStatusColor(
  status: string | null
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch ((status ?? '').toLowerCase()) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    case 'completed':
      return 'info';
    default:
      return 'default';
  }
}

function getStatusTone(status: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'confirmed':
      return {
        bg: 'rgba(46, 125, 50, 0.08)',
        border: 'rgba(46, 125, 50, 0.22)',
        text: 'success.dark',
      };
    case 'pending':
      return {
        bg: 'rgba(237, 108, 2, 0.08)',
        border: 'rgba(237, 108, 2, 0.24)',
        text: 'warning.dark',
      };
    case 'cancelled':
      return {
        bg: 'rgba(211, 47, 47, 0.08)',
        border: 'rgba(211, 47, 47, 0.24)',
        text: 'error.dark',
      };
    case 'completed':
      return {
        bg: 'rgba(2, 136, 209, 0.08)',
        border: 'rgba(2, 136, 209, 0.24)',
        text: 'info.dark',
      };
    default:
      return {
        bg: 'grey.50',
        border: 'divider',
        text: 'text.primary',
      };
  }
}

function getClubCourtLabel(booking: BookingDto) {
  const clubName = booking.clubName?.trim() || 'Unknown club';
  const courtName = booking.courtName?.trim() || `Court #${booking.courtId}`;
  return `${clubName} / ${courtName}`;
}

function getDurationMinutes(startUtc: string, endUtc: string) {
  const start = fromUtcToLocalDate(startUtc);
  const end = fromUtcToLocalDate(endUtc);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return 'Unknown';

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function getInitials(value: string | null | undefined) {
  const name = value?.trim();
  if (!name) return '?';

  const parts = name.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('');
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = true,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.50',
                  color: 'primary.main',
                }}
              >
                {icon}
              </Box>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {title}
                </Typography>

                {subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>

            <IconButton onClick={() => setExpanded((value) => !value)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            {children}
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  );
}

function InfoTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: ReturnType<typeof getStatusTone>;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: 3,
        bgcolor: tone?.bg ?? '#fff',
        borderColor: tone?.border ?? 'divider',
        minHeight: 86,
      }}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {icon && (
            <Box sx={{ color: tone?.text ?? 'text.secondary', display: 'flex' }}>
              {icon}
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            {label}
          </Typography>
        </Stack>

        <Typography
          variant="body1"
          sx={{
            fontWeight: 800,
            color: tone?.text ?? 'text.primary',
            wordBreak: 'break-word',
          }}
        >
          {value}
        </Typography>
      </Stack>
    </Paper>
  );
}

function ParticipantCard({ participant }: { participant: BookingParticipantDto }) {
  const status = participant.participationStatus ?? 'Unknown';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: '#fff',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 800 }}>
          {getInitials(participant.displayName)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {participant.displayName ?? 'Unnamed participant'}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {participant.participantType ?? 'Participant'}
              </Typography>
            </Box>

            <Chip
              label={status}
              color={getStatusColor(status)}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
            {participant.joinedUtc && (
              <Chip
                size="small"
                variant="outlined"
                label={`Joined: ${formatLocalDateTime(participant.joinedUtc)}`}
              />
            )}

            {participant.experienceLevelSnapshot != null && (
              <Chip
                size="small"
                variant="outlined"
                label={`Level ${participant.experienceLevelSnapshot}`}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function InvitationCard({ invitation }: { invitation: BookingInvitationDto }) {
  const status = invitation.invitationStatus ?? 'Unknown';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: '#fff',
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Invitation #{invitation.id}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              User #{invitation.invitedUserId} · {invitation.invitationChannel ?? 'Channel N/A'}
            </Typography>
          </Box>

          <Chip
            label={status}
            color={getStatusColor(status)}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            variant="outlined"
            label={`Sent: ${formatLocalDateTime(invitation.sentUtc)}`}
          />

          {invitation.respondedUtc && (
            <Chip
              size="small"
              variant="outlined"
              label={`Responded: ${formatLocalDateTime(invitation.respondedUtc)}`}
            />
          )}

          {invitation.requiredForConfirmation && (
            <Chip size="small" color="warning" variant="outlined" label="Required" />
          )}
        </Stack>

        {invitation.responseNotes && (
          <Typography variant="body2" color="text.secondary">
            {invitation.responseNotes}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export function BookingDetailsPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated } = useAuth();

  const numericBookingId = Number(bookingId);
  const invitedUserIdFromUrlRaw = searchParams.get('invitedUserId');
  const invitedUserIdFromUrl =
    invitedUserIdFromUrlRaw && !Number.isNaN(Number(invitedUserIdFromUrlRaw))
      ? Number(invitedUserIdFromUrlRaw)
      : null;

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery<BookingDto>({
    queryKey: ['booking', numericBookingId],
    queryFn: () => getBookingById(numericBookingId),
    enabled: !!bookingId && !Number.isNaN(numericBookingId),
  });

  const currentUserInvitation = useMemo(() => {
    if (!booking || !user) return null;

    return (
      booking.invitations.find(
        (invitation) =>
          invitation.invitedUserId === user.id &&
          (invitation.invitationStatus ?? '').toLowerCase() === 'pending'
      ) ?? null
    );
  }, [booking, user]);

  const isWrongLoggedInUserForInvitation = useMemo(() => {
    if (!user || invitedUserIdFromUrl === null) return false;
    return user.id !== invitedUserIdFromUrl;
  }, [user, invitedUserIdFromUrl]);

  const normalizedBookingStatus = (booking?.status ?? '').toLowerCase();
  const isBookingCancelled = normalizedBookingStatus === 'cancelled';
  const isBookingCompleted = normalizedBookingStatus === 'completed';

  const canAcceptInvitation =
    !!currentUserInvitation &&
    !isWrongLoggedInUserForInvitation &&
    !isBookingCancelled &&
    !isBookingCompleted;

  const acceptInvitationMutation = useMutation({
    mutationFn: () => acceptBookingInvitation(numericBookingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', numericBookingId] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-pending-invitations'] }),
      ]);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: () => cancelBooking(numericBookingId),
    onSuccess: async (updatedBooking) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', numericBookingId] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-pending-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['club-booking-discovery'] }),
        queryClient.invalidateQueries({ queryKey: ['club-time-grid'] }),
        queryClient.invalidateQueries({ queryKey: ['club-day-occupancy'] }),
      ]);

      queryClient.setQueryData(['booking', updatedBooking.id], updatedBooking);
    },
  });

  const handleSwitchAccount = () => {
    logout();
    void navigate('/login', {
      replace: true,
      state: {
        from: {
          pathname: `/app/bookings/${numericBookingId}`,
          search: invitedUserIdFromUrl !== null ? `?invitedUserId=${invitedUserIdFromUrl}` : '',
        },
      },
    });
  };

  if (!bookingId || Number.isNaN(numericBookingId)) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', mt: 4 }}>
        <Alert severity="error">Invalid booking id.</Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', mt: 4 }}>
        <Alert severity="error">
          {extractApiErrorMessage(error, 'Failed to load booking.')}
        </Alert>
      </Box>
    );
  }

  if (!booking) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', mt: 4 }}>
        <Alert severity="warning">Booking not found.</Alert>
      </Box>
    );
  }

  const statusTone = getStatusTone(booking.status);
  const durationMinutes = getDurationMinutes(booking.startUtc, booking.endUtc);
  const confirmedRatio =
    booking.maximumPlayersAllowed > 0
      ? Math.min(100, (booking.confirmedPlayersCount / booking.maximumPlayersAllowed) * 100)
      : 0;

  return (
    <Box sx={{ maxWidth: 1360, mx: 'auto', p: { xs: 1, md: 3 } }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 2.25, md: 3 },
            borderRadius: 4,
            background:
              'linear-gradient(135deg, rgba(25,118,210,0.13) 0%, rgba(25,118,210,0.03) 100%)',
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Booking Details
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                  Booking #{booking.id}
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  <Chip
                    icon={<LocationOnOutlinedIcon />}
                    label={getClubCourtLabel(booking)}
                    variant="outlined"
                  />
                  <Chip
                    icon={<SportsTennisOutlinedIcon />}
                    label={booking.courtName ?? `Court #${booking.courtId}`}
                    variant="outlined"
                  />
                </Stack>
              </Box>

              <Chip
                label={booking.status ?? 'Unknown'}
                color={getStatusColor(booking.status)}
                sx={{
                  px: 1,
                  py: 2.25,
                  fontWeight: 900,
                  borderRadius: 999,
                }}
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              <InfoTile
                label="Date"
                value={formatLocalDate(booking.startUtc)}
                icon={<CalendarMonthOutlinedIcon fontSize="small" />}
              />
              <InfoTile
                label="Time"
                value={`${formatLocalTime(booking.startUtc)} – ${formatLocalTime(booking.endUtc)}`}
                icon={<AccessTimeOutlinedIcon fontSize="small" />}
              />
              <InfoTile
                label="Duration"
                value={formatDuration(durationMinutes)}
                icon={<AccessTimeOutlinedIcon fontSize="small" />}
              />
              <InfoTile
                label="Price"
                value={formatCurrency(booking.bookedPrice, booking.currency)}
                icon={<LocalOfferOutlinedIcon fontSize="small" />}
              />
            </Box>
          </Stack>
        </Paper>

        {isWrongLoggedInUserForInvitation && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={handleSwitchAccount}>
                Switch Account
              </Button>
            }
          >
            This invitation is intended for a different account.
          </Alert>
        )}

        {isBookingCompleted && (
          <Alert severity="info">
            This booking has been completed. No further booking actions are available.
          </Alert>
        )}

        {acceptInvitationMutation.isSuccess && (
          <Alert severity="success">Invitation accepted successfully.</Alert>
        )}

        {acceptInvitationMutation.isError && (
          <Alert severity="error">
            {extractApiErrorMessage(
              acceptInvitationMutation.error,
              'Failed to accept invitation.'
            )}
          </Alert>
        )}

        {cancelBookingMutation.isSuccess && (
          <Alert severity="success">Booking cancelled successfully.</Alert>
        )}

        {cancelBookingMutation.isError && (
          <Alert severity="error">
            {extractApiErrorMessage(
              cancelBookingMutation.error,
              'Failed to cancel booking.'
            )}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '1.15fr 0.85fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Stack spacing={3}>
            <SectionCard
              title="Calendar View"
              subtitle="A quick schedule-style view of this booking."
              icon={<CalendarMonthOutlinedIcon />}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 4,
                  bgcolor: '#fff',
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems="stretch"
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      width: { xs: '100%', md: 150 },
                      borderRadius: 3,
                      overflow: 'hidden',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        {fromUtcToLocalDate(booking.startUtc).toLocaleDateString([], {
                          month: 'long',
                        })}
                      </Typography>
                    </Box>

                    <Box sx={{ py: 2 }}>
                      <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1 }}>
                        {fromUtcToLocalDate(booking.startUtc).getDate()}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {fromUtcToLocalDate(booking.startUtc).toLocaleDateString([], {
                          weekday: 'long',
                        })}
                      </Typography>
                    </Box>
                  </Paper>

                  <Box sx={{ flex: 1 }}>
                    <Stack spacing={1.5}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          bgcolor: statusTone.bg,
                          borderColor: statusTone.border,
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>
                              {formatLocalTime(booking.startUtc)} –{' '}
                              {formatLocalTime(booking.endUtc)}
                            </Typography>

                            <Chip
                              size="small"
                              color={getStatusColor(booking.status)}
                              label={booking.status ?? 'Unknown'}
                            />
                          </Stack>

                          <Typography variant="body2" color="text.secondary">
                            {booking.clubName ?? 'Unknown club'} ·{' '}
                            {booking.courtName ?? `Court #${booking.courtId}`}
                          </Typography>
                        </Stack>
                      </Paper>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(3, minmax(0, 1fr))',
                          },
                          gap: 1.25,
                        }}
                      >
                        <InfoTile label="Start" value={formatLocalDateTime(booking.startUtc)} />
                        <InfoTile label="End" value={formatLocalDateTime(booking.endUtc)} />
                        <InfoTile label="Created" value={formatLocalDateTime(booking.createdUtc)} />
                      </Box>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </SectionCard>

            <SectionCard
              title="Participants"
              subtitle={`${booking.participants.length} participant record(s) on this booking.`}
              icon={<Groups2OutlinedIcon />}
            >
              <Stack spacing={1.25}>
                {booking.participants.length === 0 ? (
                  <Alert severity="info">No participants recorded.</Alert>
                ) : (
                  booking.participants.map((participant) => (
                    <ParticipantCard key={participant.id} participant={participant} />
                  ))
                )}
              </Stack>
            </SectionCard>

            <SectionCard
              title="Invitations"
              subtitle={`${booking.invitations.length} invitation record(s) linked to this booking.`}
              icon={<PersonOutlineOutlinedIcon />}
              defaultExpanded={booking.invitations.length > 0}
            >
              <Stack spacing={1.25}>
                {booking.invitations.length === 0 ? (
                  <Alert severity="info">No invitations were created for this booking.</Alert>
                ) : (
                  booking.invitations.map((invitation) => (
                    <InvitationCard key={invitation.id} invitation={invitation} />
                  ))
                )}
              </Stack>
            </SectionCard>

            {(booking.notes || booking.cancelledUtc) && (
              <SectionCard
                title="Notes & Cancellation"
                subtitle="Operational notes and cancellation information."
                icon={<NotesOutlinedIcon />}
              >
                <Stack spacing={1.5}>
                  {booking.notes && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Notes
                      </Typography>
                      <Typography variant="body1">{booking.notes}</Typography>
                    </Paper>
                  )}

                  {booking.cancelledUtc && (
                    <Alert severity="error">
                      Cancelled on {formatLocalDateTime(booking.cancelledUtc)}
                    </Alert>
                  )}
                </Stack>
              </SectionCard>
            )}
          </Stack>

          <Stack spacing={3} sx={{ position: { xl: 'sticky' }, top: { xl: 24 } }}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Stack spacing={2.25}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Booking Summary
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 1.25,
                    }}
                  >
                    <InfoTile
                      label="Status"
                      value={booking.status ?? 'Unknown'}
                      tone={statusTone}
                    />
                    <InfoTile
                      label="Price"
                      value={formatCurrency(booking.bookedPrice, booking.currency)}
                    />
                    <InfoTile label="Duration" value={formatDuration(durationMinutes)} />
                    <InfoTile
                      label="Cost sharing"
                      value={booking.partnerCostSharing ? 'Yes' : 'No'}
                    />
                  </Box>

                  <Divider />

                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Confirmed players
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {booking.confirmedPlayersCount} / {booking.maximumPlayersAllowed}
                      </Typography>
                    </Stack>

                    <LinearProgress
                      variant="determinate"
                      value={confirmedRatio}
                      sx={{ height: 8, borderRadius: 999 }}
                    />

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={`Min ${booking.minimumPlayersRequired}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`Max ${booking.maximumPlayersAllowed}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        color={booking.needsAdditionalPlayers ? 'warning' : 'success'}
                        label={booking.needsAdditionalPlayers ? 'Needs players' : 'Ready'}
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>

                  {booking.playerRequirementDeadlineUtc && (
                    <Alert severity="warning">
                      Requirement deadline:{' '}
                      {formatLocalDateTime(booking.playerRequirementDeadlineUtc)}
                    </Alert>
                  )}

                  <Divider />

                  <Stack spacing={1.25}>
                    {canAcceptInvitation && (
                      <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        onClick={() => acceptInvitationMutation.mutate()}
                        disabled={acceptInvitationMutation.isPending}
                        sx={{ borderRadius: 3, fontWeight: 800 }}
                      >
                        {acceptInvitationMutation.isPending
                          ? 'Accepting...'
                          : 'Accept Invitation'}
                      </Button>
                    )}

                    {isAuthenticated && !isBookingCancelled && !isBookingCompleted && (
                      <Button
                        fullWidth
                        size="large"
                        variant="outlined"
                        color="error"
                        onClick={() => cancelBookingMutation.mutate()}
                        disabled={cancelBookingMutation.isPending}
                        sx={{ borderRadius: 3, fontWeight: 800 }}
                      >
                        {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                      </Button>
                    )}

                    <Button
                      fullWidth
                      size="large"
                      variant="outlined"
                      onClick={() => navigate('/app/bookings')}
                      sx={{ borderRadius: 3, fontWeight: 800 }}
                    >
                      Back to My Bookings
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}