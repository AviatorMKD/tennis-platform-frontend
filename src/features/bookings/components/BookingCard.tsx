import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { BookingDto } from '../../../api/bookings.api';
import { formatLocalDateTime } from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

type BookingCardProps = {
  booking: BookingDto;
  onClick?: () => void;
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

function getClubCourtLabel(booking: BookingDto) {
  const clubName = booking.clubName?.trim() || 'Unknown club';
  const courtName = booking.courtName?.trim() || `Court #${booking.courtId}`;
  return `${clubName} / ${courtName}`;
}

export function BookingCard({ booking, onClick }: BookingCardProps) {
  const content = (
    <>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="h6">Booking #{booking.id}</Typography>

            <Chip
              label={booking.status ?? 'Unknown'}
              color={getStatusColor(booking.status)}
              size="small"
            />
          </Stack>

          <Typography variant="body2">
            <strong>Club / Court:</strong> {getClubCourtLabel(booking)}
          </Typography>

          <Typography variant="body2">
            <strong>Start:</strong> {formatLocalDateTime(booking.startUtc)}
          </Typography>

          <Typography variant="body2">
            <strong>End:</strong> {formatLocalDateTime(booking.endUtc)}
          </Typography>

          <Typography variant="body2">
            <strong>Price:</strong> {formatCurrency(booking.bookedPrice, booking.currency)}
          </Typography>

          <Typography variant="body2">
            <strong>Players Confirmed:</strong> {booking.confirmedPlayersCount}
          </Typography>

          <Typography variant="body2">
            <strong>Minimum / Maximum:</strong> {booking.minimumPlayersRequired} /{' '}
            {booking.maximumPlayersAllowed}
          </Typography>

          <Typography variant="body2">
            <strong>Needs Additional Players:</strong>{' '}
            {booking.needsAdditionalPlayers ? 'Yes' : 'No'}
          </Typography>

          <Typography variant="body2">
            <strong>Partner Cost Sharing:</strong>{' '}
            {booking.partnerCostSharing ? 'Yes' : 'No'}
          </Typography>

          {booking.playerRequirementDeadlineUtc && (
            <Typography variant="body2">
              <strong>Requirement Deadline:</strong>{' '}
              {formatLocalDateTime(booking.playerRequirementDeadlineUtc)}
            </Typography>
          )}

          {booking.cancelledUtc && (
            <Typography variant="body2">
              <strong>Cancelled:</strong> {formatLocalDateTime(booking.cancelledUtc)}
            </Typography>
          )}

          {booking.notes && (
            <Typography variant="body2">
              <strong>Notes:</strong> {booking.notes}
            </Typography>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button variant="outlined" onClick={onClick}>
          View Details
        </Button>
      </CardActions>
    </>
  );

  return (
    <Card sx={{ cursor: onClick ? 'pointer' : 'default' }}>
      {onClick ? (
        <CardActionArea onClick={onClick}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}