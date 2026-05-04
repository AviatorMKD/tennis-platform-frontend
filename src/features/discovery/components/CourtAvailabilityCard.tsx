import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WbIncandescentIcon from '@mui/icons-material/WbIncandescent';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  Collapse,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CourtAvailabilityDetailDto } from '../../../api/discovery.api';
import { CourtBookingPanel } from './CourtBookingPanel';
import { formatLocalShortDate } from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { formatDurationLabel } from '../utils/discoveryTime';

type CourtAvailabilityCardProps = {
  clubId: number;
  date: string;
  startLocalTime?: string;
  durationMinutes?: number;
  court: CourtAvailabilityDetailDto;
  onBookingCreated?: () => Promise<void> | void;
};

export function CourtAvailabilityCard({
  date,
  startLocalTime,
  durationMinutes,
  court,
  onBookingCreated,
}: CourtAvailabilityCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOpenBooking = () => {
    if (!court.isAvailable) {
      void navigate(`/courts/${court.courtId}`);
      return;
    }

    setIsExpanded((previous) => !previous);
  };

  return (
    <Card
      sx={{
        borderRadius: 4,
        height: '100%',
        boxShadow: 3,
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {court.courtName || `Court #${court.courtId}`}
            </Typography>

            <Chip
              size="small"
              label={court.isAvailable ? 'Available' : 'Unavailable'}
              color={court.isAvailable ? 'success' : 'default'}
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={court.surfaceType || 'Surface unspecified'} />
            <Chip
              size="small"
              label={court.isIndoor ? 'Indoor' : 'Outdoor'}
              variant="outlined"
            />
            {court.hasLighting && (
              <Chip
                size="small"
                icon={<WbIncandescentIcon />}
                label="Lighting"
                variant="outlined"
              />
            )}
            {court.hasHeating && (
              <Chip
                size="small"
                icon={<ThermostatIcon />}
                label="Heating"
                variant="outlined"
              />
            )}
            {court.hasCooling && (
              <Chip
                size="small"
                icon={<BoltIcon />}
                label="Cooling"
                variant="outlined"
              />
            )}
          </Stack>

          {startLocalTime && durationMinutes && (
            <Stack direction="row" spacing={1} alignItems="center">
              <AccessTimeIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {formatLocalShortDate(date)} · {startLocalTime} · {formatDurationLabel(durationMinutes)}
              </Typography>
            </Stack>
          )}

          {court.price != null ? (
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {formatCurrency(court.price, court.currency)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Price not defined
            </Typography>
          )}

          {!court.isAvailable && court.unavailableReason && (
            <Alert severity="error">{court.unavailableReason}</Alert>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant={court.isAvailable ? 'contained' : 'outlined'}
              onClick={handleOpenBooking}
              sx={{ alignSelf: 'flex-start' }}
            >
              {court.isAvailable
                ? isExpanded
                  ? 'Hide booking controls'
                  : 'Book selected slot'
                : 'View court'}
            </Button>

            {!court.isAvailable && (
              <Button
                variant="outlined"
                onClick={() => void navigate(`/courts/${court.courtId}`)}
              >
                Open court
              </Button>
            )}
          </Stack>

          <Collapse in={court.isAvailable && isExpanded} unmountOnExit>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <CourtBookingPanel
                date={date}
                startLocalTime={startLocalTime}
                durationMinutes={durationMinutes}
                court={court}
                onBookingCreated={async () => {
                  setIsExpanded(false);
                  if (onBookingCreated) {
                    await onBookingCreated();
                  }
                }}
                onCancel={() => setIsExpanded(false)}
              />
            </Stack>
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  );
}