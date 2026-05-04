import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { formatDurationLabel } from '../utils/discoveryTime';

type ClubAvailabilityToolbarProps = {
  date: string;
  startLocalTime: string;
  durationMinutes: number;
  availableStartTimes: string[];
  suggestedDurations: number[];
  surfaceType: string;
  isIndoor: '' | 'true' | 'false';
  onDateChange: (value: string) => void;
  onStartLocalTimeChange: (value: string) => void;
  onDurationMinutesChange: (value: number) => void;
  onSurfaceTypeChange: (value: string) => void;
  onIsIndoorChange: (value: '' | 'true' | 'false') => void;
};

export function ClubAvailabilityToolbar({
  date,
  startLocalTime,
  durationMinutes,
  availableStartTimes,
  suggestedDurations,
  surfaceType,
  isIndoor,
  onDateChange,
  onStartLocalTimeChange,
  onDurationMinutesChange,
  onSurfaceTypeChange,
  onIsIndoorChange,
}: ClubAvailabilityToolbarProps) {
  const durationOptions = suggestedDurations.length > 0 ? suggestedDurations : [30, 60, 90, 120];
  const timeOptions = availableStartTimes.length > 0 ? availableStartTimes : [startLocalTime];

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 4,
        position: 'sticky',
        top: 12,
        zIndex: 2,
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Filter by availability
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select date, time, and duration to narrow matching courts.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="club-start-time-label">Start time</InputLabel>
            <Select
              labelId="club-start-time-label"
              value={startLocalTime}
              label="Start time"
              onChange={(event) => onStartLocalTimeChange(event.target.value)}
            >
              {timeOptions.map((time) => (
                <MenuItem key={time} value={time}>
                  {time}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="club-duration-label">Duration</InputLabel>
            <Select
              labelId="club-duration-label"
              value={String(durationMinutes)}
              label="Duration"
              onChange={(event) => onDurationMinutesChange(Number(event.target.value))}
            >
              {durationOptions.map((minutes) => (
                <MenuItem key={minutes} value={String(minutes)}>
                  {formatDurationLabel(minutes)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="club-surface-label">Surface</InputLabel>
            <Select
              labelId="club-surface-label"
              value={surfaceType}
              label="Surface"
              onChange={(event) => onSurfaceTypeChange(event.target.value)}
            >
              <MenuItem value="">Any surface</MenuItem>
              <MenuItem value="Clay">Clay</MenuItem>
              <MenuItem value="Hard">Hard</MenuItem>
              <MenuItem value="Grass">Grass</MenuItem>
              <MenuItem value="Carpet">Carpet</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="club-indoor-label">Indoor / Outdoor</InputLabel>
            <Select
              labelId="club-indoor-label"
              value={isIndoor}
              label="Indoor / Outdoor"
              onChange={(event) =>
                onIsIndoorChange(event.target.value as '' | 'true' | 'false')
              }
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Indoor</MenuItem>
              <MenuItem value="false">Outdoor</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Stack>
    </Paper>
  );
}