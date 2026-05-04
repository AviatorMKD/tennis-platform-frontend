import SearchIcon from '@mui/icons-material/Search';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/en-gb';

type QuickAvailabilitySearchValues = {
  city: string;
  date: string;
  startLocalTime: string;
  durationMinutes: number;
  surfaceType: string;
  isIndoor: '' | 'true' | 'false';
};

type QuickAvailabilitySearchBarProps = {
  initialCity?: string;
  onSearch: (values: QuickAvailabilitySearchValues) => void;
  isSubmitting?: boolean;
  showWarning?: boolean;
  warningTitle?: string;
  warningMessage?: string;
  minTime?: string;
  maxTime?: string;
};

type TimeBox = {
  key: string;
  label: string;
  minuteOfDay: number;
};

const surfaceOptions = ['Clay', 'Hard', 'Grass', 'Carpet'];

function normalizeTimeText(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, 5);
}

function parseTimeStringToMinutes(value: string) {
  const normalized = value.slice(0, 5);

  if (normalized === '24:00') {
    return 24 * 60;
  }

  const [hourPart, minutePart] = normalized.split(':');
  const hours = Number(hourPart ?? '0');
  const minutes = Number(minutePart ?? '0');
  return hours * 60 + minutes;
}

function formatMinutesToKey(value: number) {
  const normalized = Math.max(0, Math.min(24 * 60, value));

  if (normalized === 24 * 60) {
    return '24:00';
  }

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function formatMinutesToLabel(value: number) {
  if (value === 24 * 60) {
    return '00:00';
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

function addMinutesToTimeString(value: string, minutes: number) {
  return formatMinutesToKey(parseTimeStringToMinutes(value) + minutes);
}

function clampTimeToWindow(value: string, minMinutes: number, maxMinutes: number) {
  const minutes = parseTimeStringToMinutes(value);
  return formatMinutesToKey(Math.max(minMinutes, Math.min(maxMinutes, minutes)));
}

function formatDurationLabel(minutes: number) {
  if (minutes <= 0) return '0 min';

  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  return `${hours}h ${remainder}m`;
}

function formatDisplayRange(fromTime: string, untilTime: string) {
  const fromLabel = fromTime === '24:00' ? '00:00' : fromTime;
  const untilLabel = untilTime === '24:00' ? '00:00' : untilTime;
  return `${fromLabel} – ${untilLabel}`;
}

function buildTimeBoxes(intervalMinutes: number, minMinutes: number, maxMinutes: number) {
  const boxes: TimeBox[] = [];

  const safeMin = Math.max(0, Math.min(24 * 60, minMinutes));
  const safeMax = Math.max(safeMin, Math.min(24 * 60, maxMinutes));

  const start = Math.floor(safeMin / intervalMinutes) * intervalMinutes;
  const end = Math.ceil(safeMax / intervalMinutes) * intervalMinutes;

  for (let minutes = start; minutes <= end; minutes += intervalMinutes) {
    const boundedMinutes = Math.max(safeMin, Math.min(safeMax, minutes));

    if (boxes.some((box) => box.minuteOfDay === boundedMinutes)) {
      continue;
    }

    boxes.push({
      key: formatMinutesToKey(boundedMinutes),
      label: formatMinutesToLabel(boundedMinutes),
      minuteOfDay: boundedMinutes,
    });
  }

  return boxes;
}

function getSelectionBounds(startKey: string, endKey: string) {
  const startMinutes = parseTimeStringToMinutes(startKey);
  const endMinutes = parseTimeStringToMinutes(endKey);

  return {
    fromMinutes: Math.min(startMinutes, endMinutes),
    toMinutes: Math.max(startMinutes, endMinutes),
    fromKey: formatMinutesToKey(Math.min(startMinutes, endMinutes)),
    toKey: formatMinutesToKey(Math.max(startMinutes, endMinutes)),
  };
}

function getSelectableDateBounds() {
  const today = dayjs().startOf('day');
  const lastDay = today.add(13, 'day');
  return { today, lastDay };
}

function isDateWithinNext14Days(value: Dayjs | null) {
  if (!value) return false;

  const { today, lastDay } = getSelectableDateBounds();
  const normalized = value.startOf('day');

  return !normalized.isBefore(today) && !normalized.isAfter(lastDay);
}

function getNextUpcomingHourSlot(minMinutes: number, maxMinutes: number) {
  const now = dayjs();
  const roundedUp =
    now.minute() === 0 && now.second() === 0 && now.millisecond() === 0
      ? now
      : now.add(1, 'hour').startOf('hour');

  const roundedKey = roundedUp.format('HH:mm');
  const roundedMinutes = parseTimeStringToMinutes(roundedKey);

  const startMinutes =
    roundedMinutes >= minMinutes && roundedMinutes < maxMinutes ? roundedMinutes : minMinutes;

  const endMinutes = Math.min(maxMinutes, startMinutes + 60);

  return {
    date: roundedUp.format('YYYY-MM-DD'),
    startLocalTime: formatMinutesToKey(startMinutes),
    endLocalTime: formatMinutesToKey(endMinutes),
  };
}

export function QuickAvailabilitySearchBar({
  initialCity = '',
  onSearch,
  isSubmitting = false,
  showWarning = false,
  warningTitle = '',
  warningMessage = '',
  minTime,
  maxTime,
}: QuickAvailabilitySearchBarProps) {
  const { t } = useTranslation();

  const effectiveMinTime = normalizeTimeText(minTime, '00:00');
  const effectiveMaxTime = normalizeTimeText(maxTime, '24:00');

  const minMinutes = parseTimeStringToMinutes(effectiveMinTime);
  const maxMinutes = parseTimeStringToMinutes(effectiveMaxTime);

  const initialSlot = useMemo(
    () => getNextUpcomingHourSlot(minMinutes, maxMinutes),
    [minMinutes, maxMinutes]
  );

  const timeBoxes = useMemo(
    () => buildTimeBoxes(30, minMinutes, maxMinutes),
    [minMinutes, maxMinutes]
  );

  const [date, setDate] = useState(initialSlot.date);
  const [draftFromTime, setDraftFromTime] = useState(initialSlot.startLocalTime);
  const [draftUntilTime, setDraftUntilTime] = useState(initialSlot.endLocalTime);
  const [surfaceType, setSurfaceType] = useState('');
  const [isIndoor, setIsIndoor] = useState<'' | 'true' | 'false'>('');

  const [timePickerAnchorEl, setTimePickerAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [pickerStartTime, setPickerStartTime] = useState('');
  const [pickerEndTime, setPickerEndTime] = useState('');
  const [pickerHoverTime, setPickerHoverTime] = useState('');

  const isTimePickerOpen = Boolean(timePickerAnchorEl);
  const pickerEffectiveEndTime = pickerEndTime || pickerHoverTime || '';

  const pickerBounds = useMemo(() => {
    if (!pickerStartTime || !pickerEffectiveEndTime) {
      return null;
    }

    return getSelectionBounds(pickerStartTime, pickerEffectiveEndTime);
  }, [pickerStartTime, pickerEffectiveEndTime]);

  const pickerPreviewDuration = useMemo(() => {
    if (!pickerBounds) return 0;
    return pickerBounds.toMinutes - pickerBounds.fromMinutes;
  }, [pickerBounds]);

  const durationMinutes = useMemo(() => {
    if (!draftFromTime || !draftUntilTime) return 0;

    const normalized = getSelectionBounds(draftFromTime, draftUntilTime);
    return normalized.toMinutes - normalized.fromMinutes;
  }, [draftFromTime, draftUntilTime]);

  const handleSubmit = () => {
    if (!draftFromTime || !draftUntilTime) {
      return;
    }

    const normalized = getSelectionBounds(draftFromTime, draftUntilTime);

    onSearch({
      city: initialCity?.trim() || 'Skopje',
      date,
      startLocalTime: normalized.fromKey,
      durationMinutes: normalized.toMinutes - normalized.fromMinutes,
      surfaceType,
      isIndoor,
    });
  };

  const openTimePicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    const defaultStart = clampTimeToWindow(draftFromTime || initialSlot.startLocalTime, minMinutes, maxMinutes);
    const defaultEnd = clampTimeToWindow(
      draftUntilTime || addMinutesToTimeString(defaultStart, 60),
      minMinutes,
      maxMinutes
    );

    setPickerStartTime(defaultStart);
    setPickerEndTime(defaultEnd);
    setPickerHoverTime('');
    setTimePickerAnchorEl(event.currentTarget);
  };

  const closeTimePicker = (commit = true) => {
    if (commit && pickerStartTime && pickerEffectiveEndTime) {
      const normalized = getSelectionBounds(pickerStartTime, pickerEffectiveEndTime);

      if (normalized.fromKey !== normalized.toKey) {
        setDraftFromTime(clampTimeToWindow(normalized.fromKey, minMinutes, maxMinutes));
        setDraftUntilTime(clampTimeToWindow(normalized.toKey, minMinutes, maxMinutes));
      }
    }

    setTimePickerAnchorEl(null);
    setPickerHoverTime('');
  };

  const handleTimeBoxClick = (boxKey: string) => {
    if (!pickerStartTime) {
      setPickerStartTime(boxKey);
      setPickerEndTime('');
      setPickerHoverTime('');
      return;
    }

    if (!pickerEndTime) {
      setPickerEndTime(boxKey);
      setPickerHoverTime('');
      return;
    }

    setPickerStartTime(boxKey);
    setPickerEndTime('');
    setPickerHoverTime('');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <Box>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            backdropFilter: 'blur(10px)',
            position: 'relative',
            zIndex: 2,
            transition: 'box-shadow 260ms ease',
            boxShadow: showWarning
              ? '0px 18px 38px rgba(0,0,0,0.24), 0px 8px 18px rgba(0,0,0,0.14)'
              : undefined,
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('home.quickSearch.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('home.quickSearch.helperText')}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <DatePicker
                label={t('home.quickSearch.date')}
                value={dayjs(date)}
                onChange={(newValue) => {
                  if (!newValue || !isDateWithinNext14Days(newValue)) {
                    return;
                  }

                  setDate(newValue.format('YYYY-MM-DD'));
                }}
                minDate={getSelectableDateBounds().today}
                maxDate={getSelectableDateBounds().lastDay}
                shouldDisableDate={(value) => !isDateWithinNext14Days(value)}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />

              <Button
                variant="outlined"
                size="large"
                startIcon={<ScheduleIcon />}
                onClick={openTimePicker}
                sx={{
                  minHeight: 56,
                  justifyContent: 'flex-start',
                  px: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {draftFromTime && draftUntilTime
                  ? formatDisplayRange(draftFromTime, draftUntilTime)
                  : t('home.quickSearch.selectTimeRange')}
              </Button>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="quick-surface-label">
                  {t('home.quickSearch.surface')}
                </InputLabel>
                <Select
                  labelId="quick-surface-label"
                  value={surfaceType}
                  label={t('home.quickSearch.surface')}
                  onChange={(event) => setSurfaceType(event.target.value)}
                >
                  <MenuItem value="">{t('home.quickSearch.anySurface')}</MenuItem>
                  {surfaceOptions.map((surface) => (
                    <MenuItem key={surface} value={surface}>
                      {t(`home.quickSearch.surfaces.${surface.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="quick-indoor-label">
                  {t('home.quickSearch.indoorOutdoor')}
                </InputLabel>
                <Select
                  labelId="quick-indoor-label"
                  value={isIndoor}
                  label={t('home.quickSearch.indoorOutdoor')}
                  onChange={(event) =>
                    setIsIndoor(event.target.value as '' | 'true' | 'false')
                  }
                >
                  <MenuItem value="">{t('home.quickSearch.any')}</MenuItem>
                  <MenuItem value="true">{t('home.quickSearch.indoor')}</MenuItem>
                  <MenuItem value="false">{t('home.quickSearch.outdoor')}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip icon={<EventOutlinedIcon />} label={date} variant="outlined" />
              <Chip
                icon={<AccessTimeIcon />}
                label={
                  draftFromTime && draftUntilTime
                    ? formatDisplayRange(draftFromTime, draftUntilTime)
                    : t('home.quickSearch.noRangeSelected')
                }
                variant="outlined"
              />
              <Chip label={formatDurationLabel(durationMinutes)} variant="outlined" />
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleSubmit}
              disabled={isSubmitting}
              fullWidth
              sx={{
                minHeight: 56,
                fontWeight: 600,
              }}
            >
              {isSubmitting ? t('home.quickSearch.searching') : t('home.quickSearch.search')}
            </Button>
          </Stack>
        </Paper>

        <Collapse
          in={showWarning}
          timeout={280}
          sx={{
            mt: '-35px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              pt: 6,
              pb: 2,
              borderBottomLeftRadius: 25,
              borderBottomRightRadius: 25,
              background:
                'linear-gradient(180deg, rgba(255,193,7,0.98) 0%, rgba(255,213,79,0.98) 100%)',
              color: 'rgba(60,40,0,0.96)',
              boxShadow:
                '0px 24px 22px rgba(0,0,0,0.34), 0px 10px 18px rgba(120,90,0,0.20)',
              borderTop: '1px solid rgba(120,90,0,0.22)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <WarningAmberRoundedIcon sx={{ mt: '2px' }} />
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.25 }}>
                  {warningTitle}
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  {warningMessage}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Collapse>

        <Popover
          open={isTimePickerOpen}
          anchorEl={timePickerAnchorEl}
          onClose={() => closeTimePicker(true)}
          disableScrollLock
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{
            sx: {
              mt: 1,
              width: { xs: 'min(94vw, 380px)', sm: 380 },
              maxWidth: '94vw',
              borderRadius: 3,
              boxShadow: 6,
            },
          }}
        >
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack spacing={1.75}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('home.quickSearch.selectTimeRange')}
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={date}
                  icon={<EventOutlinedIcon />}
                  variant="outlined"
                />
                {pickerBounds && (
                  <>
                    <Chip
                      size="small"
                      label={formatDisplayRange(pickerBounds.fromKey, pickerBounds.toKey)}
                      icon={<AccessTimeIcon />}
                      variant="outlined"
                      color="primary"
                    />
                    <Chip
                      size="small"
                      label={formatDurationLabel(pickerPreviewDuration)}
                      variant="outlined"
                    />
                  </>
                )}
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 0.35,
                }}
              >
                {timeBoxes.map((box) => {
                  const isStart = !!pickerBounds && box.key === pickerBounds.fromKey;
                  const isEnd = !!pickerBounds && box.key === pickerBounds.toKey;
                  const isInRange =
                    !!pickerBounds &&
                    box.minuteOfDay > pickerBounds.fromMinutes &&
                    box.minuteOfDay < pickerBounds.toMinutes;

                  return (
                    <Button
                      key={box.key}
                      variant="outlined"
                      onClick={() => handleTimeBoxClick(box.key)}
                      onMouseEnter={() => {
                        if (!pickerStartTime || !!pickerEndTime) {
                          return;
                        }
                        setPickerHoverTime(box.key);
                      }}
                      onMouseLeave={() => {
                        if (!pickerEndTime) {
                          setPickerHoverTime('');
                        }
                      }}
                      sx={{
                        minWidth: 0,
                        minHeight: 34,
                        px: 0.25,
                        py: 0.15,
                        borderRadius: 0,
                        textTransform: 'none',
                        borderColor:
                          isStart || isEnd || isInRange ? 'primary.main' : 'divider',
                        bgcolor: isStart || isEnd
                          ? 'primary.main'
                          : isInRange
                            ? 'rgba(46, 125, 50, 0.18)'
                            : 'background.paper',
                        color: isStart || isEnd ? 'primary.contrastText' : 'text.primary',
                        '&:hover': {
                          bgcolor: isStart || isEnd
                            ? 'primary.dark'
                            : isInRange
                              ? 'rgba(46, 125, 50, 0.24)'
                              : 'action.hover',
                          borderColor: 'primary.main',
                        },
                        ...(isStart && {
                          borderTopLeftRadius: '999px',
                          borderBottomLeftRadius: '999px',
                        }),
                        ...(isEnd && {
                          borderTopRightRadius: '999px',
                          borderBottomRightRadius: '999px',
                        }),
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          lineHeight: 1,
                          fontWeight: isStart || isEnd || isInRange ? 700 : 400,
                        }}
                      >
                        {box.label}
                      </Typography>
                    </Button>
                  );
                })}
              </Box>

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => closeTimePicker(false)}>
                  {t('home.quickSearch.cancel')}
                </Button>
                <Button size="small" variant="contained" onClick={() => closeTimePicker(true)}>
                  {t('home.quickSearch.ok')}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
}