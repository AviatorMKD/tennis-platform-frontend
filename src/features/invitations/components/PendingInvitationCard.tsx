import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import SportsTennisOutlinedIcon from '@mui/icons-material/SportsTennisOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { BookingDto } from '../../../api/bookings.api';
import {
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  fromUtcToLocalDate,
} from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

type PendingInvitationCardProps = {
  booking: BookingDto;
  expanded: boolean;
  onToggleExpanded: () => void;
  onAccept: () => void;
  acceptPending: boolean;
  acceptError: string | null;
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

function getDurationMinutes(startUtc: string, endUtc: string) {
  const start = fromUtcToLocalDate(startUtc);
  const end = fromUtcToLocalDate(endUtc);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

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
        linear-gradient(180deg, #c96b35 0%, #b85a2b 52%, #a94f24 100%)
      `,
      backgroundSize: '18px 18px, 22px 22px, 100% 100%',
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
        linear-gradient(180deg, #6da83a 0%, #4f7f2b 55%, #3f6821 100%)
      `,
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
      repeating-linear-gradient(
        135deg,
        rgba(255,255,255,0.018) 0px,
        rgba(255,255,255,0.018) 2px,
        transparent 2px,
        transparent 8px
      ),
      linear-gradient(180deg, #4183c4 0%, #2f6aa3 58%, #245783 100%)
    `,
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

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.35,
        py: 1,
        borderRadius: 2.25,
        bgcolor: '#ffffff',
        borderColor: 'rgba(15,23,42,0.08)',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>

      <Typography variant="body2" sx={{ fontWeight: 900, color: 'text.primary' }}>
        {value}
      </Typography>
    </Paper>
  );
}

export function PendingInvitationCard({
  booking,
  expanded,
  onToggleExpanded,
  onAccept,
  acceptPending,
  acceptError,
}: PendingInvitationCardProps) {
  const durationMinutes = getDurationMinutes(booking.startUtc, booking.endUtc);
  const bookingStatus = (booking.status ?? '').toLowerCase();
  const isInactive = bookingStatus === 'cancelled' || bookingStatus === 'completed';

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
        opacity: isInactive ? 0.7 : 1,
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
            flexWrap="wrap"
            useFlexGap
            sx={{ ml: { sm: 'auto' } }}
          >
            <Chip
              label="Pending Invitation"
              color="warning"
              sx={{
                height: 36,
                borderRadius: 999,
                fontWeight: 900,
                boxShadow: '0 8px 20px rgba(15,23,42,0.18)',
                '& .MuiChip-label': {
                  px: 1.4,
                  fontSize: '0.85rem',
                  fontWeight: 900,
                },
              }}
            />

            <Chip
              label={booking.status ?? 'Unknown'}
              color={getStatusColor(booking.status)}
              sx={{
                height: 36,
                borderRadius: 999,
                fontWeight: 900,
                boxShadow: '0 8px 20px rgba(15,23,42,0.18)',
                '& .MuiChip-label': {
                  px: 1.4,
                  fontSize: '0.85rem',
                  fontWeight: 900,
                },
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
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.96)',
            color: 'text.primary',
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
                  value={
                    booking.partnerCostSharing
                      ? formatCurrency(booking.bookedPrice, booking.currency)
                      : 'Not Applicable'
                  }
                />
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                variant="outlined"
                label={`${booking.confirmedPlayersCount}/${booking.maximumPlayersAllowed} players`}
              />
              <Chip
                size="small"
                variant="outlined"
                color={booking.needsAdditionalPlayers ? 'warning' : 'success'}
                label={booking.needsAdditionalPlayers ? 'Needs players' : 'Ready'}
              />
              {booking.partnerCostSharing ? (
                  <Chip size="small" variant="outlined" label="Cost sharing" />
                ) : (
                  <Chip size="small" variant="outlined" color="success" label="Host pays" />
                )}
              {booking.playerRequirementDeadlineUtc && (
                <Chip
                  size="small"
                  variant="outlined"
                  color="warning"
                  label={`Reply by ${formatLocalDateTime(booking.playerRequirementDeadlineUtc)}`}
                />
              )}
            </Stack>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box onClick={(event) => event.stopPropagation()} sx={{ pt: { xs: 1.75, md: 2.25 } }}>
                <Stack spacing={2.5}>
                  {acceptError && <Alert severity="error">{acceptError}</Alert>}

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
                          <EventAvailableOutlinedIcon color="primary" />
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 900, color: 'text.primary' }}
                            >
                              Invitation Details
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Review the booking before accepting the invitation.
                            </Typography>
                          </Box>
                        </Stack>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: '1fr',
                              md: 'repeat(2, minmax(0, 1fr))',
                            },
                            gap: 1,
                          }}
                        >
                          <SummaryChip label="Date" value={formatLocalDate(booking.startUtc)} />
                          <SummaryChip
                            label="Time"
                            value={`${formatLocalTime(booking.startUtc)} – ${formatLocalTime(
                              booking.endUtc
                            )}`}
                          />
                          <SummaryChip
                            label="Club / Court"
                            value={`${booking.clubName ?? 'Unknown club'} / ${
                              booking.courtName ?? `Court #${booking.courtId}`
                            }`}
                          />
                          <SummaryChip label="Booking Status" value={booking.status ?? 'Unknown'} />
                        </Box>
                      </Stack>

                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Groups2OutlinedIcon color="primary" />
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 900, color: 'text.primary' }}
                            >
                              Player Requirement
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Capacity and confirmation rules for this session.
                            </Typography>
                          </Box>
                        </Stack>

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
                          <SummaryChip
                            label="Confirmed"
                            value={String(booking.confirmedPlayersCount)}
                          />
                          <SummaryChip
                            label="Minimum"
                            value={String(booking.minimumPlayersRequired)}
                          />
                          <SummaryChip
                            label="Maximum"
                            value={String(booking.maximumPlayersAllowed)}
                          />
                          <SummaryChip
                            label="Needs players"
                            value={booking.needsAdditionalPlayers ? 'Yes' : 'No'}
                          />
                        </Box>
                      </Stack>

                      {booking.notes && (
                        <Stack spacing={1.25}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <NotesOutlinedIcon color="primary" />
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 900, color: 'text.primary' }}
                            >
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
                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>
                          Actions
                        </Typography>

                        <Alert severity="info">
                          Accepting will add you to the booking if capacity is still available.
                        </Alert>
                        {!booking.partnerCostSharing && (
  <Alert severity="success">
    This booking is fully covered by the organizer. You will not be charged.
  </Alert>
)}
                        {booking.playerRequirementDeadlineUtc && (
                          <Alert severity="warning">
                            Reply deadline:{' '}
                            {formatLocalDateTime(booking.playerRequirementDeadlineUtc)}
                          </Alert>
                        )}

                        <Button
                          fullWidth
                          size="large"
                          variant="contained"
                          onClick={onAccept}
                          disabled={acceptPending || isInactive}
                          sx={{ borderRadius: 3, fontWeight: 800 }}
                        >
                          {acceptPending ? 'Accepting...' : 'Accept Invitation'}
                        </Button>

                        {isInactive && (
                          <Alert severity="warning">
                            This invitation is no longer actionable because the booking is not active.
                          </Alert>
                        )}

                        <Divider />

                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocationOnOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {booking.clubName ?? 'Unknown club'}
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center">
                            <AccessTimeOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {formatLocalTime(booking.startUtc)} –{' '}
                              {formatLocalTime(booking.endUtc)}
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center">
                          <LocalOfferOutlinedIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {booking.partnerCostSharing
                              ? formatCurrency(booking.bookedPrice, booking.currency)
                              : 'Cost is covered by the organizer'}
                          </Typography>
                        </Stack>
                        </Stack>
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