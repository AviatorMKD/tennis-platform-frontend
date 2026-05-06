import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type MouseEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import type {
  ClubDayOccupancyBlockDto,
  ClubDayOccupancyBookingDto,
  CourtAvailabilityDetailDto,
} from '../../../api/discovery.api';
import { apiClient } from '../../../api/client';
import {
    getClubBookingDiscovery,
    getClubDayOccupancy,
    getClubTimeGrid,
    getClubWeatherTimeline,
} from '../../../api/discovery.api';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';
import { formatLocalShortDate, toUtcIsoString } from '../../../shared/utils/dateTime';
import { ClubHeroSection } from '../components/ClubHeroSection';
import { CourtBookingRow } from '../components/CourtBookingRow';
import { ClubInfoTab } from '../components/ClubInfoTab';
import {
  addMinutesToTimeString,
  buildTimeBoxes,
  clampTimeToWindow,
  formatDisplayRange,
  formatDurationLabel,
  formatMinutesToKey,
  getBoundaryAvailableCount,
  getFirstFutureSelectableTime,
  getNowMinutesForBusinessDay,
  getSelectableDateBounds,
  getSelectionBounds,
  getTodayIsoDate,
  isDateWithinNext14Days,
  isTimeWithinWindow,
  parseAllowedDurations,
  parseTimeStringToMinutes,
  tryBuildPrefillUntil,
  type CourtPriceRuleLite,
  type IndoorFilter,
} from '../utils/discoveryTime';

type CourtPriceRuleDto = {
  id: number;
  courtId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdUtc: string;
};

async function getCourtPriceRulesByCourt(courtId: number): Promise<CourtPriceRuleDto[]> {
  const response = await apiClient.get<CourtPriceRuleDto[]>(
    `/api/CourtPriceRules/by-court/${courtId}`
  );

  return response.data;
}

function buildPseudoLocalDate(dateIso: string, timeText: string) {
  const [yearText, monthText, dayText] = dateIso.split('-');
  const [hourText, minuteText] = timeText.split(':');

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function overlapsUtcRange(
  slotStartUtcIso: string,
  slotEndUtcIso: string,
  rangeStartUtcIso: string,
  rangeEndUtcIso: string
) {
  const slotStartMs = new Date(slotStartUtcIso).getTime();
  const slotEndMs = new Date(slotEndUtcIso).getTime();
  const rangeStartMs = new Date(rangeStartUtcIso).getTime();
  const rangeEndMs = new Date(rangeEndUtcIso).getTime();

  if (
    !Number.isFinite(slotStartMs) ||
    !Number.isFinite(slotEndMs) ||
    !Number.isFinite(rangeStartMs) ||
    !Number.isFinite(rangeEndMs)
  ) {
    return false;
  }

  return slotStartMs < rangeEndMs && slotEndMs > rangeStartMs;
}

export function ClubBookingPage() {
  const { clubId } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const parsedClubId = Number(clubId);
  const isValidClubId = Number.isInteger(parsedClubId) && parsedClubId > 0;

  const prefillDate = searchParams.get('date') || getTodayIsoDate();
  const prefillStartLocalTime = searchParams.get('startLocalTime');
  const prefillDurationMinutes = Number(searchParams.get('durationMinutes') || 60);
  const prefillSurfaceType = searchParams.get('surfaceType') || '';
  const prefillIsIndoor = (searchParams.get('isIndoor') as IndoorFilter) || '';

  const [draftDate, setDraftDate] = useState(prefillDate);
  const [draftFromTimeRaw, setDraftFromTimeRaw] = useState(prefillStartLocalTime || '');
  const [draftUntilTimeRaw, setDraftUntilTimeRaw] = useState(
    tryBuildPrefillUntil(prefillStartLocalTime, prefillDurationMinutes, 30)
  );
  const [draftSurfaceType, setDraftSurfaceType] = useState(prefillSurfaceType);
  const [draftIsIndoor, setDraftIsIndoor] = useState<IndoorFilter>(prefillIsIndoor);

  const [appliedDate, setAppliedDate] = useState(prefillDate);
  const [appliedFromTime, setAppliedFromTime] = useState(prefillStartLocalTime || '');
  const [appliedDurationMinutes, setAppliedDurationMinutes] = useState(
    Number.isFinite(prefillDurationMinutes) && prefillDurationMinutes > 0
      ? prefillDurationMinutes
      : 60
  );
  const [appliedSurfaceType, setAppliedSurfaceType] = useState(prefillSurfaceType);
  const [appliedIsIndoor, setAppliedIsIndoor] = useState<IndoorFilter>(prefillIsIndoor);

  const [selectionError, setSelectionError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [timePickerAnchorEl, setTimePickerAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [pickerStartTime, setPickerStartTime] = useState('');
  const [pickerEndTime, setPickerEndTime] = useState('');
  const [pickerHoverTime, setPickerHoverTime] = useState('');

  const isTimePickerOpen = Boolean(timePickerAnchorEl);

  const timeGridQuery = useQuery({
    queryKey: ['club-time-grid', parsedClubId, draftDate],
    queryFn: () =>
      getClubTimeGrid(parsedClubId, {
        date: draftDate,
      }),
    enabled: isValidClubId && !!draftDate,
    placeholderData: (previousData) => previousData,
  });

  const baseSlotMinutes = timeGridQuery.data?.clubBaseSlotMinutes ?? 30;

  const timeGridMap = useMemo(() => {
    const map = new Map<string, number>();

    (timeGridQuery.data?.slots ?? []).forEach((slot) => {
      map.set(slot.startLocalTime, slot.availableCourtCount);
    });

    return map;
  }, [timeGridQuery.data]);

  const clubOpenMinutes = useMemo(() => {
    const slotKeys = Array.from(timeGridMap.keys());
    if (!slotKeys.length) {
      return 0;
    }

    return Math.min(...slotKeys.map(parseTimeStringToMinutes));
  }, [timeGridMap]);

  const clubCloseMinutes = useMemo(() => {
    const slotKeys = Array.from(timeGridMap.keys());
    if (!slotKeys.length) {
      return 24 * 60;
    }

    const lastStartMinute = Math.max(...slotKeys.map(parseTimeStringToMinutes));
    return lastStartMinute + 30;
  }, [timeGridMap]);

  const timeBoxes = useMemo(
    () => buildTimeBoxes(30, clubOpenMinutes, clubCloseMinutes),
    [clubOpenMinutes, clubCloseMinutes]
  );

  const getEffectiveAvailableCount = (timeKey: string) => {
    return timeGridMap.get(timeKey) ?? 0;
  };

  const selectableStartTimes = useMemo(() => {
    return timeBoxes
      .filter((box) => {
        if (!isTimeWithinWindow(box.key, clubOpenMinutes, clubCloseMinutes)) {
          return false;
        }

        if (box.minuteOfDay === clubCloseMinutes) {
          return false;
        }

        return (timeGridMap.get(box.key) ?? 0) > 0;
      })
      .map((box) => box.key);
  }, [timeBoxes, clubOpenMinutes, clubCloseMinutes, timeGridMap]);

  const firstSelectableTime = useMemo(() => {
    const fromGrid = getFirstFutureSelectableTime(selectableStartTimes, draftDate);
    return fromGrid || formatMinutesToKey(clubOpenMinutes);
  }, [selectableStartTimes, draftDate, clubOpenMinutes]);

  const fallbackStartTime = useMemo(() => {
    const preferred =
      draftFromTimeRaw ||
      prefillStartLocalTime ||
      selectableStartTimes[0] ||
      firstSelectableTime ||
      formatMinutesToKey(clubOpenMinutes);

    return clampTimeToWindow(preferred, clubOpenMinutes, clubCloseMinutes);
  }, [
    draftFromTimeRaw,
    prefillStartLocalTime,
    selectableStartTimes,
    firstSelectableTime,
    clubOpenMinutes,
    clubCloseMinutes,
  ]);

  const draftFromTime = useMemo(() => {
    const source = draftFromTimeRaw || fallbackStartTime;
    return clampTimeToWindow(source, clubOpenMinutes, clubCloseMinutes);
  }, [draftFromTimeRaw, fallbackStartTime, clubOpenMinutes, clubCloseMinutes]);

  const draftUntilTime = useMemo(() => {
    const rawUntil =
      draftUntilTimeRaw ||
      (draftFromTime
        ? tryBuildPrefillUntil(draftFromTime, prefillDurationMinutes, baseSlotMinutes)
        : '');

    if (!rawUntil) return '';

    return clampTimeToWindow(rawUntil, clubOpenMinutes, clubCloseMinutes);
  }, [
    draftUntilTimeRaw,
    draftFromTime,
    prefillDurationMinutes,
    baseSlotMinutes,
    clubOpenMinutes,
    clubCloseMinutes,
  ]);

  const draftDurationMinutes = useMemo(() => {
    if (!draftFromTime || !draftUntilTime) return 0;

    return Math.max(
      0,
      Math.abs(
        parseTimeStringToMinutes(draftUntilTime) - parseTimeStringToMinutes(draftFromTime)
      )
    );
  }, [draftFromTime, draftUntilTime]);

  const effectiveAppliedFromTime = useMemo(() => {
    const source =
      appliedFromTime ||
      draftFromTime ||
      selectableStartTimes[0] ||
      firstSelectableTime ||
      formatMinutesToKey(clubOpenMinutes);

    return clampTimeToWindow(source, clubOpenMinutes, clubCloseMinutes);
  }, [
    appliedFromTime,
    draftFromTime,
    selectableStartTimes,
    firstSelectableTime,
    clubOpenMinutes,
    clubCloseMinutes,
  ]);

  const effectiveAppliedDurationMinutes = useMemo(() => {
    if (appliedDurationMinutes > 0) {
      const maxAllowed =
        clubCloseMinutes - parseTimeStringToMinutes(effectiveAppliedFromTime);
      return Math.max(baseSlotMinutes, Math.min(appliedDurationMinutes, maxAllowed));
    }

    if (draftDurationMinutes > 0) {
      const maxAllowed =
        clubCloseMinutes - parseTimeStringToMinutes(effectiveAppliedFromTime);
      return Math.max(baseSlotMinutes, Math.min(draftDurationMinutes, maxAllowed));
    }

    return Math.min(
      baseSlotMinutes,
      Math.max(0, clubCloseMinutes - parseTimeStringToMinutes(effectiveAppliedFromTime))
    );
  }, [
    appliedDurationMinutes,
    draftDurationMinutes,
    baseSlotMinutes,
    clubCloseMinutes,
    effectiveAppliedFromTime,
  ]);

  const hasExplicitPrefill =
    !!prefillStartLocalTime &&
    Number.isFinite(prefillDurationMinutes) &&
    prefillDurationMinutes > 0;

  const shouldAutoUseDraftCriteria =
    !hasExplicitPrefill &&
    !!timeGridQuery.data &&
    !timeGridQuery.isLoading &&
    !timeGridQuery.isFetching &&
    !!draftDate &&
    !!draftFromTime &&
    draftDurationMinutes > 0;

  const resolvedAppliedDate = shouldAutoUseDraftCriteria ? draftDate : appliedDate;
  const resolvedAppliedFromTime = shouldAutoUseDraftCriteria
    ? draftFromTime
    : effectiveAppliedFromTime;
  const resolvedAppliedDurationMinutes = shouldAutoUseDraftCriteria
    ? draftDurationMinutes
    : effectiveAppliedDurationMinutes;
  const resolvedAppliedSurfaceType = shouldAutoUseDraftCriteria
    ? draftSurfaceType
    : appliedSurfaceType;
  const resolvedAppliedIsIndoor = shouldAutoUseDraftCriteria
    ? draftIsIndoor
    : appliedIsIndoor;

  const appliedUntilTime = useMemo(() => {
    if (!resolvedAppliedFromTime || !resolvedAppliedDurationMinutes) return '';
    return addMinutesToTimeString(
      resolvedAppliedFromTime,
      resolvedAppliedDurationMinutes
    );
  }, [resolvedAppliedFromTime, resolvedAppliedDurationMinutes]);

  const discoveryQuery = useQuery({
    queryKey: [
      'club-booking-discovery',
      parsedClubId,
      resolvedAppliedDate,
      resolvedAppliedFromTime,
      resolvedAppliedDurationMinutes,
      resolvedAppliedSurfaceType,
      resolvedAppliedIsIndoor,
    ],
    queryFn: () =>
      getClubBookingDiscovery(parsedClubId, {
        date: resolvedAppliedDate,
        startLocalTime: resolvedAppliedFromTime,
        durationMinutes: resolvedAppliedDurationMinutes,
        surfaceType: resolvedAppliedSurfaceType || undefined,
        isIndoor:
          resolvedAppliedIsIndoor === ''
            ? undefined
            : resolvedAppliedIsIndoor === 'true',
      }),
    enabled:
      isValidClubId &&
      !!resolvedAppliedDate &&
      !!resolvedAppliedFromTime &&
      Number.isFinite(resolvedAppliedDurationMinutes) &&
      resolvedAppliedDurationMinutes > 0,
    placeholderData: (previousData) => previousData,
  });

  const occupancyQuery = useQuery({
    queryKey: ['club-day-occupancy', parsedClubId, resolvedAppliedDate],
    queryFn: () =>
      getClubDayOccupancy(parsedClubId, {
        date: resolvedAppliedDate,
      }),
    enabled: isValidClubId && !!resolvedAppliedDate,
    placeholderData: (previousData) => previousData,
  });

    const isWeatherDateSupported = useMemo(() => {
  if (!resolvedAppliedDate) {
    return false;
  }

  const today = dayjs().startOf('day');
  const selected = dayjs(resolvedAppliedDate).startOf('day');

  return selected.isSame(today) || selected.isSame(today.add(1, 'day')) || selected.isSame(today.add(2, 'day'));
}, [resolvedAppliedDate]);

const weatherQuery = useQuery({
  queryKey: ['club-weather-timeline', parsedClubId, resolvedAppliedDate],
  queryFn: () =>
    getClubWeatherTimeline(parsedClubId, {
      date: resolvedAppliedDate,
    }),
  enabled: isValidClubId && !!resolvedAppliedDate && isWeatherDateSupported,
  placeholderData: (previousData) => previousData,
});

  const discovery = discoveryQuery.data;

  const priceRuleCourtIds = useMemo(() => {
    return Array.from(
      new Set((discovery?.courts ?? []).map((court) => court.courtId))
    ).sort((left, right) => left - right);
  }, [discovery]);

  const courtPriceRulesQuery = useQuery({
    queryKey: ['club-court-price-rules', parsedClubId, priceRuleCourtIds.join(',')],
    queryFn: async () => {
      const pairs = await Promise.all(
        priceRuleCourtIds.map(async (courtId) => {
          const rules = await getCourtPriceRulesByCourt(courtId);
          return [courtId, rules] as const;
        })
      );

      const result: Record<number, CourtPriceRuleLite[]> = {};

      pairs.forEach(([courtId, rules]) => {
        result[courtId] = rules.map((rule) => ({
          id: rule.id,
          courtId: rule.courtId,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime.slice(0, 5),
          endTime: rule.endTime.slice(0, 5),
          durationMinutes: rule.durationMinutes,
          price: rule.price,
          currency: rule.currency,
          isActive: rule.isActive,
        }));
      });

      return result;
    },
    enabled: isValidClubId && priceRuleCourtIds.length > 0,
    placeholderData: (previousData) => previousData,
  });

  const courtSlotAvailabilityMap = useMemo(() => {
    const map = new Map<number, Map<string, number>>();

    if (!occupancyQuery.data || !discovery) {
      return map;
    }

    const occupancyItems: Array<ClubDayOccupancyBookingDto | ClubDayOccupancyBlockDto> = [
      ...occupancyQuery.data.bookings.filter(
        (booking) => booking.status.trim().toLowerCase() !== 'cancelled'
      ),
      ...occupancyQuery.data.blocks,
    ];

    discovery.courts.forEach((court) => {
      const slotMap = new Map<string, number>();

      timeBoxes.forEach((box) => {
        if (box.minuteOfDay >= clubCloseMinutes) {
          return;
        }

        const slotStartLocal = buildPseudoLocalDate(resolvedAppliedDate, box.key);
        const slotEndLocal = addMinutes(slotStartLocal, occupancyQuery.data.slotMinutes || 30);

        const slotStartUtcIso = toUtcIsoString(slotStartLocal);
        const slotEndUtcIso = toUtcIsoString(slotEndLocal);

        const overlaps = occupancyItems.some((item) => {
          if (item.courtId !== court.courtId) {
            return false;
          }

          return overlapsUtcRange(
            slotStartUtcIso,
            slotEndUtcIso,
            item.startUtc,
            item.endUtc
          );
        });

        slotMap.set(box.key, overlaps ? 0 : 1);
      });

      map.set(court.courtId, slotMap);
    });

    return map;
  }, [
    resolvedAppliedDate,
    clubCloseMinutes,
    discovery,
    occupancyQuery.data,
    timeBoxes,
  ]);

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

  const searchRenderKey = useMemo(
    () =>
      [
        resolvedAppliedDate,
        resolvedAppliedFromTime,
        resolvedAppliedDurationMinutes,
        resolvedAppliedSurfaceType || 'any-surface',
        resolvedAppliedIsIndoor || 'any-indoor',
      ].join('|'),
    [
      resolvedAppliedDate,
      resolvedAppliedFromTime,
      resolvedAppliedDurationMinutes,
      resolvedAppliedSurfaceType,
      resolvedAppliedIsIndoor,
    ]
  );

  const refreshAfterBookingCreated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['club-booking-discovery', parsedClubId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['club-time-grid', parsedClubId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['club-day-occupancy', parsedClubId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['my-bookings'],
      }),
    ]);
  };

  if (!isValidClubId) {
    return <ErrorState message="Invalid club ID." />;
  }

  if (!timeGridQuery.data && timeGridQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (timeGridQuery.isError) {
    return <ErrorState message="Failed to load club time options." />;
  }

  if (!discoveryQuery.data && discoveryQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (discoveryQuery.isError) {
    return <ErrorState message="Failed to load club booking discovery page." />;
  }

  if (!discovery) {
    return <ErrorState message="Club discovery data not found." />;
  }

  const sortedCourts = [...discovery.courts].sort(
    (left: CourtAvailabilityDetailDto, right: CourtAvailabilityDetailDto) =>
      left.sortOrder - right.sortOrder || left.courtId - right.courtId
  );

  const showNoStartTimesMessage =
    !timeGridQuery.isFetching &&
    !timeGridQuery.isError &&
    !selectableStartTimes.length &&
    draftDate === resolvedAppliedDate &&
    discovery.courts.length === 0;

  const handleApply = () => {
    setSelectionError('');

    if (!draftDate) {
      setSelectionError('Select a date.');
      return;
    }

    if (!draftFromTime) {
      setSelectionError('Select a start time.');
      return;
    }

    if (!draftUntilTime) {
      setSelectionError('Select an end time.');
      return;
    }

    if (!isTimeWithinWindow(draftFromTime, clubOpenMinutes, clubCloseMinutes)) {
      setSelectionError('Selected start time is outside club operating hours.');
      return;
    }

    if (!isTimeWithinWindow(draftUntilTime, clubOpenMinutes, clubCloseMinutes)) {
      setSelectionError('Selected end time is outside club operating hours.');
      return;
    }

    if (!Number.isFinite(draftDurationMinutes) || draftDurationMinutes <= 0) {
      setSelectionError('Selected duration must be greater than zero.');
      return;
    }

    const normalized = getSelectionBounds(draftFromTime, draftUntilTime);

    const normalizedStartAvailableCount = getEffectiveAvailableCount(normalized.fromKey);
    if (normalizedStartAvailableCount <= 0) {
      setSelectionError('Selected start time is not physically available.');
      return;
    }

    const normalizedEndBoundaryAvailableCount = getBoundaryAvailableCount(
      normalized.toKey,
      clubOpenMinutes,
      clubCloseMinutes,
      getEffectiveAvailableCount
    );

    if (normalizedEndBoundaryAvailableCount <= 0) {
      setSelectionError('Selected end time is not physically available.');
      return;
    }

    setAppliedDate(draftDate);
    setAppliedFromTime(
      clampTimeToWindow(normalized.fromKey, clubOpenMinutes, clubCloseMinutes)
    );
    setAppliedDurationMinutes(normalized.toMinutes - normalized.fromMinutes);
    setAppliedSurfaceType(draftSurfaceType);
    setAppliedIsIndoor(draftIsIndoor);
  };

  const openTimePicker = (event: MouseEvent<HTMLButtonElement>) => {
    const defaultStart = clampTimeToWindow(
      draftFromTime || firstSelectableTime || formatMinutesToKey(clubOpenMinutes),
      clubOpenMinutes,
      clubCloseMinutes
    );

    const defaultEnd = clampTimeToWindow(
      draftUntilTime ||
        tryBuildPrefillUntil(defaultStart, prefillDurationMinutes, baseSlotMinutes) ||
        addMinutesToTimeString(defaultStart, baseSlotMinutes),
      clubOpenMinutes,
      clubCloseMinutes
    );

    setPickerStartTime(defaultStart);
    setPickerEndTime(defaultEnd);
    setPickerHoverTime('');
    setTimePickerAnchorEl(event.currentTarget);
  };

  const closeTimePicker = (commit = true) => {
    if (commit && pickerStartTime && pickerEffectiveEndTime) {
      const normalized = getSelectionBounds(pickerStartTime, pickerEffectiveEndTime);
      const normalizedStartAvailableCount = getEffectiveAvailableCount(normalized.fromKey);

      const normalizedEndBoundaryAvailableCount = getBoundaryAvailableCount(
        normalized.toKey,
        clubOpenMinutes,
        clubCloseMinutes,
        getEffectiveAvailableCount
      );

      if (
        normalized.fromKey !== normalized.toKey &&
        normalizedStartAvailableCount > 0 &&
        normalizedEndBoundaryAvailableCount > 0
      ) {
        setDraftFromTimeRaw(
          clampTimeToWindow(normalized.fromKey, clubOpenMinutes, clubCloseMinutes)
        );
        setDraftUntilTimeRaw(
          clampTimeToWindow(normalized.toKey, clubOpenMinutes, clubCloseMinutes)
        );
      }
    }

    setTimePickerAnchorEl(null);
    setPickerHoverTime('');
  };

  const handleTimeBoxClick = (boxKey: string) => {
    const box = timeBoxes.find((item) => item.key === boxKey);
    if (!box) {
      return;
    }

    const isToday = draftDate === getTodayIsoDate();
    const nowMinutes = getNowMinutesForBusinessDay();
    const isPast = isToday && box.minuteOfDay < nowMinutes;

    const boundaryAvailableCount = getBoundaryAvailableCount(
      box.key,
      clubOpenMinutes,
      clubCloseMinutes,
      getEffectiveAvailableCount
    );

    const isUnavailable = boundaryAvailableCount <= 0;

    if (isPast || isUnavailable) {
      return;
    }

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

  const heroSearchPanel = (
    <Paper
      elevation={8}
      sx={{
  width: '100%',
  borderRadius: { xs: 4, md: 3 },
  p: { xs: 2, md: 3 },
  bgcolor: '#f7f7f7',
  color: 'text.primary',
  boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
}}
    >
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            Find your slot in this club
          </Typography>
          <Typography color="text.secondary">
            Adjust the date, time range, and court preferences.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.75,
          }}
        >
          <DatePicker
            label="Date"
            value={dayjs(draftDate)}
            onChange={(newValue) => {
              if (!newValue || !isDateWithinNext14Days(newValue)) {
                return;
              }

              setDraftDate(newValue.format('YYYY-MM-DD'));
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
              borderColor: 'success.light',
              color: 'success.dark',
              bgcolor: 'common.white',
              '&:hover': {
                bgcolor: 'grey.50',
              },
            }}
          >
            {draftFromTime && draftUntilTime
              ? formatDisplayRange(draftFromTime, draftUntilTime)
              : 'Select time range'}
          </Button>

          <FormControl fullWidth>
            <InputLabel id="club-surface-label">Surface</InputLabel>
            <Select
              labelId="club-surface-label"
              value={draftSurfaceType}
              label="Surface"
              onChange={(event) => setDraftSurfaceType(event.target.value)}
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
              value={draftIsIndoor}
              label="Indoor / Outdoor"
              onChange={(event) => setDraftIsIndoor(event.target.value as IndoorFilter)}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Indoor</MenuItem>
              <MenuItem value="false">Outdoor</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            icon={<EventOutlinedIcon />}
            label={formatLocalShortDate(draftDate)}
            variant="outlined"
          />
          <Chip
            icon={<AccessTimeIcon />}
            label={
              draftFromTime && draftUntilTime
                ? formatDisplayRange(draftFromTime, draftUntilTime)
                : 'No range selected'
            }
            variant="outlined"
          />
          <Chip
            label={
              draftDurationMinutes > 0
                ? formatDurationLabel(draftDurationMinutes)
                : 'No duration'
            }
            variant="outlined"
          />
        </Stack>

        <Button
          variant="contained"
          size="large"
          startIcon={<SearchIcon />}
          onClick={handleApply}
          sx={{
            minHeight: 56,
            borderRadius: 3,
            fontWeight: 800,
          }}
        >
          Search matching courts
        </Button>
      </Stack>
    </Paper>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
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
      <ClubHeroSection club={discovery.club} rightContent={heroSearchPanel} />
    </Container>
  </Box>

  <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
    <Stack spacing={3.5}>
            <Box
  sx={{
    display: 'flex',
    justifyContent: 'center',
  }}
>
  <Box
    sx={{
      display: 'inline-flex',
      p: 0.5,
      borderRadius: '999px',
      bgcolor: 'grey.200',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
    }}
  >
    <Tabs
      value={activeTab}
      onChange={(_, nextValue) => setActiveTab(nextValue)}
      variant="standard"
      TabIndicatorProps={{
        sx: {
          display: 'none',
        },
      }}
      sx={{
        minHeight: 0,
        '& .MuiTabs-flexContainer': {
          gap: 0.5,
        },
        '& .MuiTab-root': {
          minHeight: 44,
          px: { xs: 2, sm: 3 },
          py: 0.75,
          borderRadius: '999px',
          textTransform: 'none',
          fontWeight: 800,
          color: 'text.secondary',
          transition: 'all 0.18s ease',
          zIndex: 1,
        },
		'& .MuiTab-root:hover': {
		  bgcolor: 'rgba(46,125,50,0.08)',
		},
		'& .MuiTab-root.Mui-selected:hover': {
		  bgcolor: 'success.dark',
          color: '#ffffff',
		},
		'& .MuiTab-root.Mui-selected': {
		  color: '#ffffff',
		  bgcolor: 'success.main',
		  boxShadow: '0 2px 8px rgba(46,125,50,0.35)',
		},
      }}
    >
      <Tab label="Matching courts" />
      <Tab label="Club details" />
    </Tabs>
  </Box>
</Box>

            {activeTab === 0 && (
            <>

            <Box
              sx={{
                px: { xs: 0.5, sm: 0 },
                py: { xs: 0.25, sm: 0.5 },
              }}
            >
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={{ xs: 1.25, lg: 2 }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', lg: 'flex-start' }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    Matching courts
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 0.25,
                      maxWidth: { xs: '100%', lg: '78ch' },
                    }}
                  >
                    Each row inherits the selected slot, but its timeline follows that court’s own occupancy for the selected day.
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{
                    width: { xs: '100%', lg: 'auto' },
                    justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                    alignItems: 'center',
                    rowGap: 1,
                    columnGap: 1,
                    flexShrink: 0,
                    maxWidth: { xs: '100%', lg: '48%' },
                  }}
                >
                  <Chip
                    icon={<EventOutlinedIcon />}
                    label={formatLocalShortDate(resolvedAppliedDate)}
                    variant="outlined"
                  />

                  <Chip
                    icon={<AccessTimeIcon />}
                    label={
                      resolvedAppliedFromTime && appliedUntilTime
                        ? formatDisplayRange(resolvedAppliedFromTime, appliedUntilTime)
                        : 'No applied range'
                    }
                    variant="outlined"
                  />

                  <Chip
                    label={formatDurationLabel(resolvedAppliedDurationMinutes)}
                    variant="outlined"
                  />

                  {resolvedAppliedSurfaceType && (
                    <Chip label={resolvedAppliedSurfaceType} variant="outlined" />
                  )}

                  {resolvedAppliedIsIndoor !== '' && (
                    <Chip
                      label={resolvedAppliedIsIndoor === 'true' ? 'Indoor' : 'Outdoor'}
                      variant="outlined"
                    />
                  )}

                  <Chip
                    label={`${discovery.courts.length} matching courts`}
                    color={discovery.courts.length > 0 ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Stack>
              </Stack>
            </Box>

            {selectionError && <Alert severity="warning">{selectionError}</Alert>}

            {showNoStartTimesMessage && (
              <Alert severity="info">
                No available start times were found for the selected day within club operating
                hours.
              </Alert>
            )}

            {timeGridQuery.isFetching && (
              <Alert severity="info">Refreshing club time grid...</Alert>
            )}

            {occupancyQuery.isFetching && (
              <Alert severity="info">Refreshing court occupancy timelines...</Alert>
            )}

            {weatherQuery.isFetching && (
                <Alert severity="info">Refreshing weather timeline...</Alert>
            )}

            {weatherQuery.isError && (
                <Alert severity="warning">
                    Weather timeline could not be loaded. Court availability is not affected.
                </Alert>
            )}

            {occupancyQuery.isError && (
              <Alert severity="warning">
                Court-specific occupancy could not be loaded. Timelines are temporarily falling
                back to shared club availability.
              </Alert>
            )}

            {discoveryQuery.isFetching && (
              <Alert severity="info">Refreshing court availability...</Alert>
            )}

            {!discoveryQuery.isLoading && discovery.courts.length === 0 && (
              <Alert severity="info">
                No courts match the applied date, time range, and filters for this club.
              </Alert>
            )}

            <Stack spacing={2.5}>
              {sortedCourts.map((court) => {
                const courtSlotMap = courtSlotAvailabilityMap.get(court.courtId);
                const courtAllowedDurations = parseAllowedDurations(court.allowedDurations);
                const courtPriceRules = courtPriceRulesQuery.data?.[court.courtId] ?? [];

                const getCourtSpecificAvailableCount = (timeKey: string) => {
                  if (courtSlotMap) {
                    return courtSlotMap.get(timeKey) ?? 0;
                  }

                  return (timeGridMap.get(timeKey) ?? 0) > 0 ? 1 : 0;
                };

                return (
                    <CourtBookingRow
                        key={`${searchRenderKey}-${court.courtId}`}
                        clubId={discovery.club.clubId}
                        date={resolvedAppliedDate}
                        inheritedStartLocalTime={resolvedAppliedFromTime}
                        inheritedDurationMinutes={resolvedAppliedDurationMinutes}
                        court={court}
                        timeBoxes={timeBoxes}
                        clubOpenMinutes={clubOpenMinutes}
                        clubCloseMinutes={clubCloseMinutes}
                        getEffectiveAvailableCount={getCourtSpecificAvailableCount}
                        onBookingCreated={refreshAfterBookingCreated}
                        allowedDurations={courtAllowedDurations}
                        courtPriceRules={courtPriceRules}
                        playerRequirementCutoffHours={discovery.club.playerRequirementCutoffHours}
                        weatherHours={isWeatherDateSupported ? weatherQuery.data?.hours ?? [] : []}
                        maxAllowedDurationMinutes={
                            courtAllowedDurations.length > 0
                                ? Math.max(...courtAllowedDurations)
                                : discovery.suggestedDurations.length > 0
                                    ? Math.max(...discovery.suggestedDurations)
                                    : undefined
                        }
                    />
                );
              })}
          </Stack>
          </>
        )}

        {activeTab === 1 && <ClubInfoTab club={discovery.club} />}
          </Stack>
        </Container>

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
                Select time range
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  size="small"
                  label={formatLocalShortDate(draftDate)}
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

                  const isToday = draftDate === getTodayIsoDate();
                  const nowMinutes = getNowMinutesForBusinessDay();
                  const isPast = isToday && box.minuteOfDay < nowMinutes;

                  const isLastBoundaryBox = box.minuteOfDay === clubCloseMinutes;

                  const boundaryAvailableCount = getBoundaryAvailableCount(
                    box.key,
                    clubOpenMinutes,
                    clubCloseMinutes,
                    getEffectiveAvailableCount
                  );

                  const isUnavailable = boundaryAvailableCount <= 0;
                  const isDisabled = isPast || isUnavailable;

                  const isPastOnly =
                    isPast &&
                    !isLastBoundaryBox &&
                    !isStart &&
                    !isEnd &&
                    !isInRange;

                  const isBoundaryOnlyNeutral =
                    isLastBoundaryBox &&
                    !isStart &&
                    !isEnd &&
                    !isInRange;

                  const isNeutralUnavailable =
                    isUnavailable &&
                    !isLastBoundaryBox &&
                    !isStart &&
                    !isEnd &&
                    !isInRange;

                  return (
                    <Button
                      key={box.key}
                      variant="outlined"
                      disabled={isDisabled}
                      onClick={() => handleTimeBoxClick(box.key)}
                      onMouseEnter={() => {
                        if (!pickerStartTime || !!pickerEndTime || isDisabled) {
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
                        borderColor: isBoundaryOnlyNeutral
                          ? 'rgba(185,185,185,0.45)'
                          : isPastOnly
                            ? 'rgba(190,190,190,0.55)'
                            : isNeutralUnavailable
                              ? 'rgba(160,160,160,0.55)'
                              : isStart || isEnd || isInRange
                                ? 'primary.main'
                                : 'divider',
                        bgcolor: isBoundaryOnlyNeutral
                          ? 'rgba(225,225,225,0.20)'
                          : isPastOnly
                            ? 'rgba(210,210,210,0.16)'
                            : isNeutralUnavailable
                              ? 'rgba(180,180,180,0.24)'
                              : isStart || isEnd
                                ? 'primary.main'
                                : isInRange
                                  ? 'rgba(46, 125, 50, 0.18)'
                                  : '#ffffff',
                        color: isBoundaryOnlyNeutral
                          ? 'rgba(120,120,120,0.95)'
                          : isPastOnly
                            ? 'rgba(110,110,110,0.95)'
                            : isNeutralUnavailable
                              ? 'rgba(70,70,70,0.95)'
                              : isStart || isEnd
                                ? 'primary.contrastText'
                                : 'text.primary',
                        '&:hover': {
                          bgcolor: isBoundaryOnlyNeutral
                            ? 'rgba(225,225,225,0.20)'
                            : isPastOnly
                              ? 'rgba(210,210,210,0.16)'
                              : isNeutralUnavailable
                                ? 'rgba(180,180,180,0.24)'
                                : isStart || isEnd
                                  ? 'primary.dark'
                                  : isInRange
                                    ? 'rgba(46, 125, 50, 0.24)'
                                    : '#ffffff',
                          borderColor: isBoundaryOnlyNeutral
                            ? 'rgba(185,185,185,0.45)'
                            : isPastOnly
                              ? 'rgba(190,190,190,0.55)'
                              : isNeutralUnavailable
                                ? 'rgba(160,160,160,0.55)'
                                : isStart || isEnd || isInRange
                                  ? 'primary.main'
                                  : 'primary.main',
                        },
                        '&.Mui-disabled': {
                          borderColor: isBoundaryOnlyNeutral
                            ? 'rgba(185,185,185,0.45)'
                            : isPastOnly
                              ? 'rgba(190,190,190,0.55)'
                              : 'rgba(160,160,160,0.55)',
                          bgcolor: isBoundaryOnlyNeutral
                            ? 'rgba(225,225,225,0.20)'
                            : isPastOnly
                              ? 'rgba(210,210,210,0.16)'
                              : 'rgba(180,180,180,0.24)',
                          color: isBoundaryOnlyNeutral
                            ? 'rgba(120,120,120,0.95)'
                            : isPastOnly
                              ? 'rgba(110,110,110,0.95)'
                              : 'rgba(70,70,70,0.95)',
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
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={() => closeTimePicker(true)}>
                  Ok
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
}