import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SportsTennisOutlinedIcon from '@mui/icons-material/SportsTennisOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type {
  BookingDto,
  BookingInvitationDto,
  BookingParticipantDto,
} from '../../../api/bookings.api';
import {
  formatLocalDateTime,
  formatLocalTime,
  fromUtcToLocalDate,
} from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

type MyBookingListCardProps = {
  booking: BookingDto;
  expanded: boolean;
  currentUserId: number | null;
  isAuthenticated: boolean;
  onToggleExpanded: () => void;
  onAcceptInvitation: () => void;
  onCancelBooking: () => void;
  acceptPending: boolean;
  cancelPending: boolean;
  acceptError: string | null;
  cancelError: string | null;
};

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

function getStatusCapsuleSx(status: string | null): SxProps<Theme> {
  switch ((status ?? '').toLowerCase()) {
    case 'confirmed':
      return {
        bgcolor: 'rgba(34,197,94,0.95)',
        color: '#052e16',
        borderColor: 'rgba(187,247,208,0.95)',
      };
    case 'pending':
      return {
        bgcolor: 'rgba(245,158,11,0.96)',
        color: '#3b2300',
        borderColor: 'rgba(253,230,138,0.95)',
      };
    case 'cancelled':
      return {
        bgcolor: 'rgba(239,68,68,0.96)',
        color: '#fff',
        borderColor: 'rgba(254,202,202,0.95)',
      };
    case 'completed':
      return {
        bgcolor: 'rgba(14,165,233,0.96)',
        color: '#022c43',
        borderColor: 'rgba(186,230,253,0.95)',
      };
    default:
      return {
        bgcolor: 'rgba(255,255,255,0.92)',
        color: 'text.primary',
        borderColor: 'rgba(255,255,255,0.72)',
      };
  }
}

function getInitials(value: string | null | undefined) {
  const name = value?.trim();
  if (!name) return '?';

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getDurationMinutes(startUtc: string, endUtc: string) {
  const start = fromUtcToLocalDate(startUtc);
  const end = fromUtcToLocalDate(endUtc);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function formatDuration(startUtcOrMinutes: string | number | null, endUtc?: string) {
  const minutes =
    typeof startUtcOrMinutes === 'number'
      ? startUtcOrMinutes
      : startUtcOrMinutes && endUtc
        ? getDurationMinutes(startUtcOrMinutes, endUtc)
        : null;

  if (minutes == null) return 'Unknown';

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function getSurfaceTextureSx(surfaceType: string | null | undefined): SxProps<Theme> {
  const surface = (surfaceType ?? '').trim().toLowerCase();

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
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))',
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
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.24))',
      },
    };
  }

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
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.22))',
    },
  };
}

function getCourtLineAccentSx(): SxProps<Theme> {
  return {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.16,
    background:
      'linear-gradient(150deg, transparent 0 60%, rgba(255,255,255,0.9) 60% 62%, transparent 62%)',
  };
}

function SummaryChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error' | 'info' | 'default';
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.35,
        py: 1,
        borderRadius: 2.25,
        bgcolor: '#ffffff',
        borderColor: color ? `${color}.main` : 'rgba(15,23,42,0.08)',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 900,
          color: color ? `${color}.main` : 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

function ParticipantCard({ participant }: { participant: BookingParticipantDto }) {
  const status = participant.participationStatus ?? 'Unknown';

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: '#fff' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Avatar
              src={participant.profileImageUrl ?? undefined}
              alt={participant.displayName ?? 'Participant'}
              sx={{
                width: 40,
                height: 40,
                fontWeight: 800,
                flexShrink: 0,
                bgcolor: 'primary.main',
              }}
            >
              {getInitials(participant.displayName)}
            </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {participant.displayName ?? 'Unnamed participant'}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {participant.participantType ?? 'Participant'}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
          sx={{ flex: { xs: 'none', md: 1 } }}
        >
          <Chip label={status} color={getStatusColor(status)} size="small" variant="outlined" />

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
      </Stack>
    </Paper>
  );
}

function getInvitationStatusCounts(invitations: BookingInvitationDto[]) {
  return invitations.reduce<Record<string, number>>((acc, invitation) => {
    const key = (invitation.invitationStatus ?? 'Unknown').trim() || 'Unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function MyBookingListCard({
  booking,
  expanded,
  currentUserId,
  isAuthenticated,
  onToggleExpanded,
  onAcceptInvitation,
  onCancelBooking,
  acceptPending,
  cancelPending,
  acceptError,
  cancelError,
}: MyBookingListCardProps) {
  const normalizedStatus = (booking.status ?? '').toLowerCase();
  const isCancelled = normalizedStatus === 'cancelled';
  const isCompleted = normalizedStatus === 'completed';
  const isOwner = currentUserId != null && booking.playerUserId === currentUserId;

  const playerQuotaMet = booking.confirmedPlayersCount >= booking.minimumPlayersRequired;
  const playerRequirementLabel = playerQuotaMet
    ? 'Quota met'
    : booking.needsAdditionalPlayers
      ? 'Needs players'
      : 'Ready';

  const participants = booking.participants ?? [];
  const invitations = booking.invitations ?? [];
  const durationMinutes = getDurationMinutes(booking.startUtc, booking.endUtc);
  const invitationStatusCounts = getInvitationStatusCounts(invitations);

  const currentUserInvitation =
    currentUserId == null
      ? null
      : invitations.find(
          (invitation) =>
            invitation.invitedUserId === currentUserId &&
            (invitation.invitationStatus ?? '').toLowerCase() === 'pending'
        ) ?? null;

  const canAcceptInvitation =
    !!currentUserInvitation && !isCancelled && !isCompleted && isAuthenticated;

  const canCancelBooking = isAuthenticated && isOwner && !isCancelled && !isCompleted;

  return (
    <Paper
      variant="outlined"
      onClick={onToggleExpanded}
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        borderColor: expanded ? 'rgba(25,118,210,0.35)' : 'divider',
        boxShadow: expanded
          ? '0 18px 44px rgba(15,23,42,0.16)'
          : '0 8px 22px rgba(15,23,42,0.08)',
        bgcolor: '#ffffff',
        opacity: isCancelled || isCompleted ? 0.7 : 1,
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 16px 36px rgba(15,23,42,0.14)',
        },
      }}
    >
      <Box sx={{
    p: 1.35,
    pb: 0.9,
    ...getSurfaceTextureSx(booking.surfaceType),
}}>
        <Box sx={getCourtLineAccentSx()} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
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
              <SportsTennisOutlinedIcon fontSize="small" />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
                {booking.courtName ?? `Court #${booking.courtId}`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.84)' }}>
                {booking.clubName ?? 'Unknown club'} · Booking #{booking.id}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
            sx={{ ml: { sm: 'auto' } }}
          >
            <Chip
              label={booking.status ?? 'Unknown'}
              sx={{
                height: 36,
                px: 0.75,
                borderRadius: 999,
                border: '1px solid',
                fontWeight: 950,
                boxShadow: '0 8px 20px rgba(15,23,42,0.18)',
                backdropFilter: 'blur(8px)',
                '& .MuiChip-label': {
                  px: 1.25,
                  fontWeight: 950,
                  letterSpacing: 0.2,
                },
                ...getStatusCapsuleSx(booking.status),
              }}
            />

            <Button
              size="medium"
              variant="contained"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded();
              }}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                minHeight: 36,
                borderRadius: 999,
                fontWeight: 900,
                bgcolor: 'rgba(255,255,255,0.92)',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: '#fff',
                },
              }}
            >
              Details
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            mt: 1.2,
            p: { xs: 1.5, md: 2 },
color: 'text.primary',
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 26px rgba(15,23,42,0.14)',
            border: '1px solid rgba(255,255,255,0.42)',
          }}
        >
          <Stack spacing={expanded ? 1.65 : 1.1}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 0.75,
              }}
            >
              <SummaryChip label="Start" value={formatLocalTime(booking.startUtc)} />
              <SummaryChip label="End" value={formatLocalTime(booking.endUtc)} />
              <SummaryChip label="Duration" value={formatDuration(durationMinutes)} />
              <SummaryChip
                label="Price"
                value={formatCurrency(booking.bookedPrice, booking.currency)}
              />
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                variant="outlined"
                label={`Confirmed ${booking.confirmedPlayersCount}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Min ${booking.minimumPlayersRequired} players`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Max ${booking.maximumPlayersAllowed} players`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={playerRequirementLabel}
                color={playerQuotaMet || !booking.needsAdditionalPlayers ? 'success' : 'warning'}
              />
              {booking.partnerCostSharing && (
                <Chip size="small" variant="outlined" label="Cost sharing" />
              )}
              <Chip size="small" variant="outlined" label={`${invitations.length} invitation(s)`} />
            </Stack>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box
                onClick={(event) => event.stopPropagation()}
                sx={{
                  pt: { xs: 1.75, md: 2.25 },
                }}
              >
                <Stack spacing={2.5}>
                  {isCompleted && (
                    <Alert severity="info">
                      This booking has been completed. No further booking actions are available.
                    </Alert>
                  )}

                  {isCancelled && booking.cancelledUtc && (
                    <Alert severity="error">
                      Cancelled on {formatLocalDateTime(booking.cancelledUtc)}
                    </Alert>
                  )}

                  {acceptError && <Alert severity="error">{acceptError}</Alert>}
                  {cancelError && <Alert severity="error">{cancelError}</Alert>}

                  <Divider />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
                      gap: 2,
                      alignItems: 'stretch',
                    }}
                  >
                    <Stack spacing={2.25}>
                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Groups2OutlinedIcon color="primary" />
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>
                              Participants
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {participants.length} participant record(s) on this booking.
                            </Typography>
                          </Box>
                        </Stack>

                        {participants.length === 0 ? (
                          <Alert severity="info">No participants recorded.</Alert>
                        ) : (
                          <Stack spacing={1.1}>
                            {participants.map((participant) => (
                              <ParticipantCard key={participant.id} participant={participant} />
                            ))}
                          </Stack>
                        )}
                      </Stack>

                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonOutlineOutlinedIcon color="primary" />
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>
                              Invitations Summary
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {invitations.length} invitation record(s) linked to this booking.
                            </Typography>
                          </Box>
                        </Stack>

                        {invitations.length === 0 ? (
                          <Alert severity="info">No invitations were created for this booking.</Alert>
                        ) : (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                md: 'repeat(4, minmax(0, 1fr))',
                              },
                              gap: 1,
                            }}
                          >
                            <SummaryChip label="Total" value={String(invitations.length)} />
                            {Object.entries(invitationStatusCounts)
                              .sort(([left], [right]) => left.localeCompare(right))
                              .map(([status, count]) => (
                                <SummaryChip key={status} label={status} value={String(count)} />
                              ))}
                          </Box>
                        )}
                      </Stack>

                      {booking.notes && (
                        <Stack spacing={1.25}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <NotesOutlinedIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>
                              Notes
                            </Typography>
                          </Stack>

                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                            <Typography variant="body1">{booking.notes}</Typography>
                          </Paper>
                        </Stack>
                      )}
                    </Stack>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: '#fafafa',
                        height: '100%',
                        display: 'flex',
                      }}
                    >
                      <Stack spacing={1.25} sx={{ width: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>
                          Actions
                        </Typography>

                        {booking.playerRequirementDeadlineUtc && (
                          <Alert severity="warning">
                            Requirement deadline:{' '}
                            {formatLocalDateTime(booking.playerRequirementDeadlineUtc)}
                          </Alert>
                        )}

                        {canAcceptInvitation && (
                          <Button
                            fullWidth
                            size="large"
                            variant="contained"
                            onClick={onAcceptInvitation}
                            disabled={acceptPending}
                            sx={{ borderRadius: 3, fontWeight: 800 }}
                          >
                            {acceptPending ? 'Accepting...' : 'Accept Invitation'}
                          </Button>
                        )}

                        {canCancelBooking && (
                          <Button
                            fullWidth
                            size="large"
                            variant="outlined"
                            color="error"
                            startIcon={<CloseOutlinedIcon />}
                            onClick={onCancelBooking}
                            disabled={cancelPending}
                            sx={{ borderRadius: 3, fontWeight: 800 }}
                          >
                            {cancelPending ? 'Cancelling...' : 'Cancel Booking'}
                          </Button>
                        )}

                        {!canAcceptInvitation && !canCancelBooking && (
                          <Alert severity="info">
                            No actions are currently available for this booking.
                          </Alert>
                        )}
                      </Stack>
                    </Paper>
                  </Box>
                </Stack>
              </Box>
            </Collapse>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}