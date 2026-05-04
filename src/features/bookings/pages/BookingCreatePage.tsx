import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  createBooking,
  getBookingsByCourt,
  getInvitationCandidateCount,
} from '../../../api/bookings.api';
import { getCourtById } from '../../../api/courts.api';
import {
  getBlocksByCourtId,
  getPriceRulesByCourtId,
  getScheduleRulesByCourtId,
  type CourtPriceRuleDto,
  type CourtScheduleRuleDto,
} from '../../../api/operatorCourtManagement.api';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingScreen } from '../../../shared/components/LoadingScreen';
import { extractApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatLocalDate,
  formatLocalTime,
  fromUtcToLocalDate,
  getBusinessTodayDate,
  toUtcIsoString,
} from '../../../shared/utils/dateTime';
import { formatCurrency } from '../../../shared/utils/formatCurrency';

type BookingRangeStatus =
  | { isValid: true }
  | { isValid: false; reason: string };

type TimeCellStatus = 'available' | 'booked' | 'blocked';

type TimeCell = {
  key: string;
  index: number;
  start: Date;
  end: Date;
  label: string;
  status: TimeCellStatus;
};

type OccupancyRange = {
  start: Date;
  end: Date;
  status: string | null;
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeLabel(date: Date) {
  return formatLocalTime(date);
}

function formatDayButtonPrimary(date: Date) {
  return date.toLocaleDateString([], {
    weekday: 'short',
  });
}

function formatDayButtonSecondary(date: Date) {
  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
  });
}

function parseTimeStringToMinutes(value: string) {
  const [hourPart, minutePart] = value.split(':');
  const hours = Number(hourPart ?? '0');
  const minutes = Number(minutePart ?? '0');

  return hours * 60 + minutes;
}

function buildLocalDateWithMinutes(day: Date, minutesFromMidnight: number) {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;

  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function getMatchingScheduleRulesForDay(
  rules: CourtScheduleRuleDto[],
  selectedDay: Date
) {
  const dayOfWeek = selectedDay.getDay();

  return rules
    .filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek)
    .sort(
      (a, b) =>
        parseTimeStringToMinutes(a.openTime) - parseTimeStringToMinutes(b.openTime)
    );
}

function parseAllowedDurations(
  rule: CourtScheduleRuleDto,
  fallbackBaseSlotMinutes: number
) {
  const raw = rule.allowedDurations?.trim();

  if (!raw) {
    return [fallbackBaseSlotMinutes];
  }

  const values = raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

  return values.length > 0 ? values : [fallbackBaseSlotMinutes];
}

function getSmallestIntervalMinutes(rules: CourtScheduleRuleDto[]) {
  const values: number[] = [];

  for (const rule of rules) {
    values.push(rule.baseSlotMinutes);
    values.push(...parseAllowedDurations(rule, rule.baseSlotMinutes));
  }

  if (values.length === 0) return null;

  return Math.min(...values);
}

function getMatchingPriceRule(
  rules: CourtPriceRuleDto[],
  selectedDay: Date,
  start: Date,
  end: Date,
  durationMinutes: number
) {
  const dayOfWeek = selectedDay.getDay();
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  return rules.find((rule) => {
    if (!rule.isActive) return false;
    if (rule.dayOfWeek !== dayOfWeek) return false;
    if (rule.durationMinutes !== durationMinutes) return false;

    const ruleStart = parseTimeStringToMinutes(rule.startTime);
    const ruleEnd = parseTimeStringToMinutes(rule.endTime);

    return startMinutes >= ruleStart && endMinutes <= ruleEnd;
  });
}

function buildSelectableDays() {
  const today = startOfLocalDay(getBusinessTodayDate());

  return Array.from({ length: 14 }, (_, index) => {
    const day = addMinutes(today, index * 24 * 60);
    return startOfLocalDay(day);
  });
}

function renderPrice(price: number | null, currency: string | null) {
  if (price == null) return 'Undefined';
  return formatCurrency(price, currency);
}

function getSubmissionCurrency(currency: string | null) {
  return currency ?? 'UNDEFINED';
}

function getStatusLabel(status: TimeCellStatus) {
  switch (status) {
    case 'available':
      return 'Open';
    case 'booked':
      return 'Booked';
    case 'blocked':
    default:
      return 'Blocked';
  }
}

function getStatusTooltip(status: TimeCellStatus, start: Date, end: Date) {
  const range = `${formatTimeLabel(start)}–${formatTimeLabel(end)}`;

  switch (status) {
    case 'available':
      return `Available · ${range}`;
    case 'booked':
      return `Booked · ${range}`;
    case 'blocked':
    default:
      return `Blocked · ${range}`;
  }
}

function getPreviewState(
  isRangeInvalidPreview: boolean,
  isSelectedStart: boolean,
  isSelectedEnd: boolean,
  isInSelectedRange: boolean
): 'normal' | 'selected-edge' | 'selected-range' | 'invalid-preview' {
  if (isSelectedStart || isSelectedEnd) {
    return 'selected-edge';
  }

  if (isInSelectedRange && isRangeInvalidPreview) {
    return 'invalid-preview';
  }

  if (isInSelectedRange) {
    return 'selected-range';
  }

  return 'normal';
}

function getCellButtonStyles(
  status: TimeCellStatus,
  previewState: 'normal' | 'selected-edge' | 'selected-range' | 'invalid-preview'
) {
  const base = {
    minWidth: 82,
    minHeight: 78,
    borderRadius: 3,
    textTransform: 'none' as const,
    alignItems: 'stretch',
    borderWidth: 1,
  };

  if (previewState === 'selected-edge') {
    return {
      ...base,
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      borderColor: 'primary.main',
      '&:hover': {
        bgcolor: 'primary.dark',
      },
    };
  }

  if (previewState === 'selected-range') {
    return {
      ...base,
      bgcolor: 'primary.50',
      color: 'primary.dark',
      borderColor: 'primary.main',
      '&:hover': {
        bgcolor: 'primary.100',
      },
    };
  }

  if (previewState === 'invalid-preview') {
    return {
      ...base,
      bgcolor: 'error.50',
      color: 'error.dark',
      borderColor: 'error.main',
      '&:hover': {
        bgcolor: 'error.100',
      },
    };
  }

  switch (status) {
    case 'available':
      return {
        ...base,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      };
    case 'booked':
      return {
        ...base,
        bgcolor: 'warning.50',
        color: 'warning.dark',
        borderColor: 'warning.light',
      };
    case 'blocked':
    default:
      return {
        ...base,
        bgcolor: 'error.50',
        color: 'error.dark',
        borderColor: 'error.light',
      };
  }
}

function isBookingOccupying(status: string | null) {
  const normalized = (status ?? '').trim().toLowerCase();
  return normalized !== 'cancelled';
}

function getRangeStatus(
  start: Date,
  end: Date,
  blocks: { startUtc: string; endUtc: string }[],
  bookings: OccupancyRange[]
): TimeCellStatus {
  const isBlocked = blocks.some((block) => {
    const blockStart = fromUtcToLocalDate(block.startUtc);
    const blockEnd = fromUtcToLocalDate(block.endUtc);
    return rangesOverlap(start, end, blockStart, blockEnd);
  });

  if (isBlocked) {
    return 'blocked';
  }

  const isBooked = bookings.some((booking) => {
    if (!isBookingOccupying(booking.status)) {
      return false;
    }

    return rangesOverlap(start, end, booking.start, booking.end);
  });

  return isBooked ? 'booked' : 'available';
}

function areCellsContinuous(cells: TimeCell[], intervalMinutes: number) {
  if (cells.length === 0) return false;
  if (cells.length === 1) return true;

  const intervalMs = intervalMinutes * 60_000;

  for (let index = 1; index < cells.length; index += 1) {
    const previous = cells[index - 1];
    const current = cells[index];

    if (current.start.getTime() - previous.start.getTime() !== intervalMs) {
      return false;
    }

    if (previous.end.getTime() !== current.start.getTime()) {
      return false;
    }
  }

  return true;
}

function tryParsePrefillDate(value: string | null) {
  if (!value) return null;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfLocalDay(parsed);
}

export function BookingCreatePage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const courtId = Number(searchParams.get('courtId'));

  const prefillDate = tryParsePrefillDate(searchParams.get('date'));
  const prefillStartLocalTime = searchParams.get('startLocalTime');
  const prefillDurationMinutes = Number(searchParams.get('durationMinutes'));

  const selectableDays = useMemo(() => buildSelectableDays(), []);
  const prefillDayKey = useMemo(() => {
    if (!prefillDate) return null;
    const matchesSelectableDay = selectableDays.some(
      (day) => formatDateKey(day) === formatDateKey(prefillDate)
    );
    return matchesSelectableDay ? formatDateKey(prefillDate) : null;
  }, [prefillDate, selectableDays]);

  const firstDayKey = selectableDays.length > 0 ? formatDateKey(selectableDays[0]) : null;

  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    prefillDayKey ?? firstDayKey ?? ''
  );
  const [selectedStartCellKey, setSelectedStartCellKey] = useState<string | null>(null);
  const [selectedEndCellKey, setSelectedEndCellKey] = useState<string | null>(null);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [hasUserTouchedSelection, setHasUserTouchedSelection] = useState(false);

  const [needsPlayers, setNeedsPlayers] = useState(false);
  const [minPlayers, setMinPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [experienceRange, setExperienceRange] = useState<number[]>([1, 5]);

  const [partnerCostSharing, setPartnerCostSharing] = useState(false);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const courtQuery = useQuery({
    queryKey: ['court', courtId],
    queryFn: () => getCourtById(courtId),
    enabled: Number.isFinite(courtId) && courtId > 0,
  });

  const schedulesQuery = useQuery({
    queryKey: ['booking-schedule-rules', courtId],
    queryFn: () => getScheduleRulesByCourtId(courtId),
    enabled: Number.isFinite(courtId) && courtId > 0,
  });

  const pricesQuery = useQuery({
    queryKey: ['booking-price-rules', courtId],
    queryFn: () => getPriceRulesByCourtId(courtId),
    enabled: Number.isFinite(courtId) && courtId > 0,
  });

  const blocksQuery = useQuery({
    queryKey: ['booking-blocks', courtId],
    queryFn: () => getBlocksByCourtId(courtId),
    enabled: Number.isFinite(courtId) && courtId > 0,
  });

  const bookingsQuery = useQuery({
    queryKey: ['booking-court-bookings', courtId],
    queryFn: () => getBookingsByCourt(courtId),
    enabled: Number.isFinite(courtId) && courtId > 0,
  });

  const candidateCountQuery = useQuery({
    queryKey: ['booking-candidate-count', needsPlayers, experienceRange[0], experienceRange[1]],
    queryFn: () =>
      getInvitationCandidateCount({
        minimumExperienceLevel: experienceRange[0],
        maximumExperienceLevel: experienceRange[1],
      }),
    enabled: needsPlayers,
  });

  const candidateCount = needsPlayers ? (candidateCountQuery.data?.count ?? null) : null;

  const selectedDay = useMemo(() => {
    return selectableDays.find((day) => formatDateKey(day) === selectedDayKey) ?? null;
  }, [selectableDays, selectedDayKey]);

  const bookingRanges = useMemo<OccupancyRange[]>(() => {
    return (bookingsQuery.data ?? []).map((booking) => ({
      start: fromUtcToLocalDate(booking.startUtc),
      end: fromUtcToLocalDate(booking.endUtc),
      status: booking.status,
    }));
  }, [bookingsQuery.data]);

  const selectedDayRules = useMemo(() => {
    if (!selectedDay) return [];
    return getMatchingScheduleRulesForDay(schedulesQuery.data ?? [], selectedDay);
  }, [schedulesQuery.data, selectedDay]);

  const smallestIntervalMinutes = useMemo(() => {
    return getSmallestIntervalMinutes(selectedDayRules);
  }, [selectedDayRules]);

  const timeCells = useMemo(() => {
    if (!selectedDay || selectedDayRules.length === 0 || !smallestIntervalMinutes) {
      return [] as TimeCell[];
    }

    const blocks = blocksQuery.data ?? [];
    const cells: TimeCell[] = [];
    const renderedStartMinutes = new Set<number>();

    for (const rule of selectedDayRules) {
      const ruleOpen = parseTimeStringToMinutes(rule.openTime);
      const ruleClose = parseTimeStringToMinutes(rule.closeTime);

      for (
        let startMinutes = ruleOpen;
        startMinutes + smallestIntervalMinutes <= ruleClose;
        startMinutes += smallestIntervalMinutes
      ) {
        if (renderedStartMinutes.has(startMinutes)) {
          continue;
        }

        renderedStartMinutes.add(startMinutes);

        const cellStart = buildLocalDateWithMinutes(selectedDay, startMinutes);
        const cellEnd = addMinutes(cellStart, smallestIntervalMinutes);

        cells.push({
          key: `${formatDateKey(selectedDay)}-${startMinutes}`,
          index: cells.length,
          start: cellStart,
          end: cellEnd,
          label: formatTimeLabel(cellStart),
          status: getRangeStatus(cellStart, cellEnd, blocks, bookingRanges),
        });
      }
    }

    return cells
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((cell, index) => ({
        ...cell,
        index,
      }));
  }, [selectedDay, selectedDayRules, smallestIntervalMinutes, blocksQuery.data, bookingRanges]);

  const prefilledSelection = useMemo(() => {
    if (!selectedDay || timeCells.length === 0 || !smallestIntervalMinutes) {
      return null;
    }

    if (!prefillStartLocalTime || !Number.isFinite(prefillDurationMinutes) || prefillDurationMinutes <= 0) {
      return null;
    }

    const startCell = timeCells.find(
      (cell) => cell.label === prefillStartLocalTime && cell.status === 'available'
    );

    if (!startCell) {
      return null;
    }

    const prefillStart = startCell.start;
    const prefillEnd = addMinutes(prefillStart, prefillDurationMinutes);

    const expectedCellCount = prefillDurationMinutes / smallestIntervalMinutes;
    if (!Number.isInteger(expectedCellCount)) {
      return null;
    }

    const matchingCells = timeCells.filter(
      (cell) =>
        cell.start.getTime() >= prefillStart.getTime() &&
        cell.end.getTime() <= prefillEnd.getTime()
    );

    if (matchingCells.length !== expectedCellCount) {
      return null;
    }

    if (!areCellsContinuous(matchingCells, smallestIntervalMinutes)) {
      return null;
    }

    if (matchingCells.some((cell) => cell.status !== 'available')) {
      return null;
    }

    const blocks = blocksQuery.data ?? [];
    const actualRangeStatus = getRangeStatus(
      prefillStart,
      prefillEnd,
      blocks,
      bookingRanges
    );

    if (actualRangeStatus !== 'available') {
      return null;
    }

    const hasMatchingRule = selectedDayRules.some((rule) => {
      const ruleOpen = buildLocalDateWithMinutes(
        selectedDay,
        parseTimeStringToMinutes(rule.openTime)
      );
      const ruleClose = buildLocalDateWithMinutes(
        selectedDay,
        parseTimeStringToMinutes(rule.closeTime)
      );
      const allowedDurations = parseAllowedDurations(rule, rule.baseSlotMinutes);

      return (
        prefillStart >= ruleOpen &&
        prefillEnd <= ruleClose &&
        allowedDurations.includes(prefillDurationMinutes)
      );
    });

    if (!hasMatchingRule) {
      return null;
    }

    return {
      startCellKey: startCell.key,
      endCellKey: matchingCells[matchingCells.length - 1].key,
    };
  }, [
    selectedDay,
    timeCells,
    smallestIntervalMinutes,
    prefillStartLocalTime,
    prefillDurationMinutes,
    blocksQuery.data,
    bookingRanges,
    selectedDayRules,
  ]);

  const effectiveSelectedStartCellKey = hasUserTouchedSelection
    ? selectedStartCellKey
    : (prefilledSelection?.startCellKey ?? selectedStartCellKey);

  const effectiveSelectedEndCellKey = hasUserTouchedSelection
    ? selectedEndCellKey
    : (prefilledSelection?.endCellKey ?? selectedEndCellKey);

  const selectedStartCell = useMemo(() => {
    if (timeCells.length === 0) return null;
    return timeCells.find((cell) => cell.key === effectiveSelectedStartCellKey) ?? null;
  }, [timeCells, effectiveSelectedStartCellKey]);

  const selectedEndCell = useMemo(() => {
    if (timeCells.length === 0) return null;
    return timeCells.find((cell) => cell.key === effectiveSelectedEndCellKey) ?? null;
  }, [timeCells, effectiveSelectedEndCellKey]);

  const hoveredCell = useMemo(() => {
    if (!hoveredCellKey) return null;
    return timeCells.find((cell) => cell.key === hoveredCellKey) ?? null;
  }, [hoveredCellKey, timeCells]);

  const previewEndCell = useMemo(() => {
    if (!selectedStartCell) return null;
    return hoveredCell ?? selectedEndCell;
  }, [selectedStartCell, hoveredCell, selectedEndCell]);

  const effectiveRangeStart = useMemo(() => {
    if (!selectedStartCell || !previewEndCell) return null;
    return selectedStartCell.start <= previewEndCell.start
      ? selectedStartCell.start
      : previewEndCell.start;
  }, [selectedStartCell, previewEndCell]);

  const effectiveRangeEnd = useMemo(() => {
    if (!selectedStartCell || !previewEndCell) return null;
    return selectedStartCell.end >= previewEndCell.end
      ? selectedStartCell.end
      : previewEndCell.end;
  }, [selectedStartCell, previewEndCell]);

  const effectiveRangeCells = useMemo(() => {
    if (!effectiveRangeStart || !effectiveRangeEnd) return [] as TimeCell[];

    return timeCells.filter(
      (cell) =>
        cell.start.getTime() >= effectiveRangeStart.getTime() &&
        cell.end.getTime() <= effectiveRangeEnd.getTime()
    );
  }, [timeCells, effectiveRangeStart, effectiveRangeEnd]);

  const effectiveDurationMinutes = useMemo(() => {
    if (!effectiveRangeStart || !effectiveRangeEnd) return null;
    return Math.round((effectiveRangeEnd.getTime() - effectiveRangeStart.getTime()) / 60_000);
  }, [effectiveRangeStart, effectiveRangeEnd]);

  const effectiveRangeStatus = useMemo<BookingRangeStatus>(() => {
    if (!selectedStartCell || !previewEndCell || !selectedDay || !smallestIntervalMinutes) {
      return { isValid: false, reason: 'Select a start and end slot.' };
    }

    if (!effectiveRangeStart || !effectiveRangeEnd || !effectiveDurationMinutes) {
      return { isValid: false, reason: 'Selected range is incomplete.' };
    }

    if (effectiveRangeCells.length === 0) {
      return { isValid: false, reason: 'Selected range is empty.' };
    }

    const expectedCellCount = effectiveDurationMinutes / smallestIntervalMinutes;

    if (!Number.isInteger(expectedCellCount) || effectiveRangeCells.length !== expectedCellCount) {
      return {
        isValid: false,
        reason: 'Selected range crosses a non-operational gap.',
      };
    }

    if (!areCellsContinuous(effectiveRangeCells, smallestIntervalMinutes)) {
      return {
        isValid: false,
        reason: 'Selected range must be continuous.',
      };
    }

    const blocks = blocksQuery.data ?? [];
    const actualRangeStatus = getRangeStatus(
      effectiveRangeStart,
      effectiveRangeEnd,
      blocks,
      bookingRanges
    );

    if (actualRangeStatus !== 'available') {
      return {
        isValid: false,
        reason: 'Selected range includes blocked or booked time.',
      };
    }

    const hasMatchingRule = selectedDayRules.some((rule) => {
      const ruleOpen = buildLocalDateWithMinutes(
        selectedDay,
        parseTimeStringToMinutes(rule.openTime)
      );
      const ruleClose = buildLocalDateWithMinutes(
        selectedDay,
        parseTimeStringToMinutes(rule.closeTime)
      );
      const allowedDurations = parseAllowedDurations(rule, rule.baseSlotMinutes);

      return (
        effectiveRangeStart >= ruleOpen &&
        effectiveRangeEnd <= ruleClose &&
        allowedDurations.includes(effectiveDurationMinutes)
      );
    });

    if (!hasMatchingRule) {
      return {
        isValid: false,
        reason: 'Selected duration is not allowed by the schedule rules.',
      };
    }

    return { isValid: true };
  }, [
    selectedStartCell,
    previewEndCell,
    selectedDay,
    selectedDayRules,
    smallestIntervalMinutes,
    effectiveRangeStart,
    effectiveRangeEnd,
    effectiveRangeCells,
    effectiveDurationMinutes,
    blocksQuery.data,
    bookingRanges,
  ]);

  const isPreviewingRange = !!selectedStartCell && !!previewEndCell;
  const isRangeInvalidPreview = isPreviewingRange && !effectiveRangeStatus.isValid;

  const selectedPriceRule = useMemo(() => {
    if (
      !selectedDay ||
      !effectiveRangeStart ||
      !effectiveRangeEnd ||
      !effectiveDurationMinutes
    ) {
      return null;
    }

    return (
      getMatchingPriceRule(
        pricesQuery.data ?? [],
        selectedDay,
        effectiveRangeStart,
        effectiveRangeEnd,
        effectiveDurationMinutes
      ) ?? null
    );
  }, [
    pricesQuery.data,
    selectedDay,
    effectiveRangeStart,
    effectiveRangeEnd,
    effectiveDurationMinutes,
  ]);

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (
        !effectiveRangeStart ||
        !effectiveRangeEnd ||
        !effectiveDurationMinutes ||
        !selectedEndCell ||
        !effectiveRangeStatus.isValid
      ) {
        throw new Error('Please select a valid slot range.');
      }

      return createBooking({
        courtId,
        startUtc: toUtcIsoString(effectiveRangeStart),
        endUtc: toUtcIsoString(effectiveRangeEnd),
        bookedPrice: selectedPriceRule?.price ?? 0,
        currency: getSubmissionCurrency(selectedPriceRule?.currency ?? null),
        needsAdditionalPlayers: needsPlayers,
        minimumPlayersRequired: needsPlayers ? minPlayers : 1,
        maximumPlayersAllowed: needsPlayers ? maxPlayers : 1,
        playerRequirementDeadlineUtc: null,
        autoCancelIfPlayerRequirementNotMet: false,
        partnerCostSharing,
        minimumExperienceLevel: needsPlayers ? experienceRange[0] : null,
        maximumExperienceLevel: needsPlayers ? experienceRange[1] : null,
        autoInviteMatchingPlayers: needsPlayers,
        notes: notes.trim() || null,
      });
    },
    onSuccess: async (result) => {
      setSuccess(`Booking created. Status: ${result.status}`);
      setError('');
      setHasUserTouchedSelection(true);
      setSelectedStartCellKey(null);
      setSelectedEndCellKey(null);
      setHoveredCellKey(null);

      await queryClient.invalidateQueries({
        queryKey: ['booking-court-bookings', courtId],
      });

      await queryClient.refetchQueries({
        queryKey: ['booking-court-bookings', courtId],
        exact: true,
      });
    },
    onError: (err) => {
      setSuccess('');
      setError(extractApiErrorMessage(err));
    },
  });

  const isLoading =
    courtQuery.isLoading ||
    schedulesQuery.isLoading ||
    pricesQuery.isLoading ||
    blocksQuery.isLoading ||
    bookingsQuery.isLoading;

  if (isLoading) return <LoadingScreen />;

  if (
    courtQuery.isError ||
    schedulesQuery.isError ||
    pricesQuery.isError ||
    blocksQuery.isError ||
    bookingsQuery.isError ||
    !courtQuery.data
  ) {
    return <ErrorState message="Failed to load booking setup." />;
  }

  const court = courtQuery.data;

  const clearSelection = () => {
    setHasUserTouchedSelection(true);
    setSelectedStartCellKey(null);
    setSelectedEndCellKey(null);
    setHoveredCellKey(null);
    setError('');
    setSuccess('');
  };

  const handleCellClick = (cell: TimeCell) => {
    setHasUserTouchedSelection(true);
    setError('');
    setSuccess('');

    if (cell.status !== 'available') {
      setError(
        `${cell.label} is ${getStatusLabel(cell.status).toLowerCase()} and cannot be selected.`
      );
      return;
    }

    if (effectiveSelectedStartCellKey && effectiveSelectedEndCellKey) {
      setSelectedStartCellKey(cell.key);
      setSelectedEndCellKey(null);
      setHoveredCellKey(null);
      return;
    }

    if (!effectiveSelectedStartCellKey) {
      setSelectedStartCellKey(cell.key);
      setSelectedEndCellKey(null);
      setHoveredCellKey(null);
      return;
    }

    if (effectiveSelectedStartCellKey === cell.key) {
      clearSelection();
      return;
    }

    setSelectedEndCellKey(cell.key);
    setHoveredCellKey(null);
  };

  const handleCreateBooking = async () => {
    setError('');
    setSuccess('');

    if (!effectiveRangeStart || !effectiveRangeEnd || !effectiveDurationMinutes || !selectedEndCell) {
      setError('Please select a valid slot range.');
      return;
    }

    if (!effectiveRangeStatus.isValid) {
      setError(effectiveRangeStatus.reason);
      return;
    }

    if (needsPlayers) {
      if (minPlayers < 1) {
        setError('Minimum players cannot be lower than 1.');
        return;
      }

      if (maxPlayers < minPlayers) {
        setError('Maximum players cannot be lower than minimum players.');
        return;
      }
    }

    await createBookingMutation.mutateAsync();
  };

  return (
    <Box sx={{ maxWidth: 1360, mx: 'auto', p: 3 }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 4,
            background:
              'linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(25,118,210,0.03) 100%)',
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">
              Court Booking
            </Typography>

            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {court.name}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={court.surfaceType || 'Surface not specified'} variant="outlined" />
              <Chip label={court.isIndoor ? 'Indoor' : 'Outdoor'} variant="outlined" />
              <Chip
                label={court.isActive ? 'Active court' : 'Inactive court'}
                color={court.isActive ? 'success' : 'default'}
              />
            </Stack>

            <Typography variant="body1" color="text.secondary">
              Select a day, then choose a start and end slot. Pending and confirmed bookings both
              occupy the timeline, and newly created bookings refresh immediately after success.
            </Typography>
          </Stack>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Select Day
              </Typography>

              <Box sx={{ overflowX: 'auto', pb: 1 }}>
                <Stack direction="row" spacing={1.25} sx={{ minWidth: 'max-content' }}>
                  {selectableDays.map((day) => {
                    const key = formatDateKey(day);
                    const isSelected = key === selectedDayKey;

                    return (
                      <Button
                        key={key}
                        variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() => {
                          setSelectedDayKey(key);
                          setHasUserTouchedSelection(false);
                          setSelectedStartCellKey(null);
                          setSelectedEndCellKey(null);
                          setHoveredCellKey(null);
                          setError('');
                          setSuccess('');
                        }}
                        sx={{
                          minWidth: 110,
                          borderRadius: 3,
                          py: 1.5,
                        }}
                      >
                        <Stack spacing={0.25} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatDayButtonPrimary(day)}
                          </Typography>
                          <Typography variant="caption">
                            {formatDayButtonSecondary(day)}
                          </Typography>
                        </Stack>
                      </Button>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Timeline
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip size="small" label="Available" variant="outlined" />
                  <Chip size="small" label="Booked" color="warning" variant="outlined" />
                  <Chip size="small" label="Blocked" color="error" variant="outlined" />
                  <Chip size="small" label="Selected" color="primary" variant="outlined" />
                  <Chip size="small" label="Invalid Preview" color="error" variant="outlined" />
                </Stack>
              </Stack>

              {!selectedDay ? (
                <Alert severity="info">Select a day to continue.</Alert>
              ) : timeCells.length === 0 ? (
                <Alert severity="warning">
                  No schedule window exists for the selected day.
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Click one available cell for the start, then hover or click another available
                    cell for the end. The preview uses the same rules as final booking validation.
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, minmax(0, 1fr))',
                        sm: 'repeat(4, minmax(0, 1fr))',
                        md: 'repeat(6, minmax(0, 1fr))',
                        lg: 'repeat(8, minmax(0, 1fr))',
                      },
                      gap: 1.25,
                    }}
                  >
                    {timeCells.map((cell) => {
                      const isSelectedStart = cell.key === selectedStartCell?.key;
                      const isSelectedEnd = cell.key === selectedEndCell?.key;
                      const isInSelectedRange = effectiveRangeCells.some(
                        (selectedCell) => selectedCell.key === cell.key
                      );

                      const previewState = getPreviewState(
                        isRangeInvalidPreview,
                        isSelectedStart,
                        isSelectedEnd,
                        isInSelectedRange
                      );

                      return (
                        <Tooltip
                          key={cell.key}
                          title={getStatusTooltip(cell.status, cell.start, cell.end)}
                          arrow
                        >
                          <Box>
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => handleCellClick(cell)}
                              onMouseEnter={() => {
                                if (effectiveSelectedStartCellKey && cell.status === 'available') {
                                  setHoveredCellKey(cell.key);
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredCellKey(null);
                              }}
                              sx={getCellButtonStyles(cell.status, previewState)}
                            >
                              <Stack spacing={0.25} alignItems="center">
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 700, lineHeight: 1.2 }}
                                >
                                  {cell.label}
                                </Typography>
                                <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                                  {getStatusLabel(cell.status)}
                                </Typography>
                              </Stack>
                            </Button>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>

                  <Divider />

                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Range Selection
                      </Typography>

                      {!selectedStartCell && (
                        <Typography variant="body2" color="text.secondary">
                          Choose a start slot.
                        </Typography>
                      )}

                      {selectedStartCell && !previewEndCell && (
                        <Typography variant="body2" color="text.secondary">
                          Start selected at {formatTimeLabel(selectedStartCell.start)}. Hover or click
                          an end slot.
                        </Typography>
                      )}

                      {selectedStartCell && previewEndCell && (
                        <Typography variant="body2" color="text.secondary">
                          {effectiveRangeStatus.isValid
                            ? 'Previewed range is valid.'
                            : effectiveRangeStatus.reason}
                        </Typography>
                      )}
                    </Stack>

                    <Button variant="outlined" onClick={clearSelection}>
                      Clear selection
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '1.15fr 0.85fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Players Setup
                  </Typography>

                  <Tooltip
                    title="Minimum Players includes yourself. If set to 1, the booking can be confirmed immediately by your own participation, while invitations may still be sent to other players."
                    arrow
                    placement="top"
                  >
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <FormControlLabel
                  control={
                    <Switch
                      checked={needsPlayers}
                      onChange={(e) => {
                        setNeedsPlayers(e.target.checked);
                        setError('');
                        setSuccess('');
                      }}
                    />
                  }
                  label="Needs Additional Players"
                />

                {needsPlayers && (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="Minimum Players"
                        type="number"
                        value={minPlayers}
                        onChange={(e) => setMinPlayers(Number(e.target.value))}
                        helperText="Includes yourself"
                        fullWidth
                      />

                      <TextField
                        label="Maximum Players"
                        type="number"
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        fullWidth
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Experience Range: {experienceRange[0]} - {experienceRange[1]}
                      </Typography>

                      <Slider
                        value={experienceRange}
                        onChange={(_, value) => setExperienceRange(value as number[])}
                        min={1}
                        max={5}
                        step={1}
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Matching Candidates
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {candidateCountQuery.isLoading
                            ? 'Checking…'
                            : candidateCount == null
                              ? 'Not available'
                              : `${candidateCount} matching players`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Matching-player invitations remain system-driven for now.
                        </Typography>
                      </Stack>
                    </Paper>
                  </>
                )}

                <Divider />

                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Additional Details
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={partnerCostSharing}
                      onChange={(e) => setPartnerCostSharing(e.target.checked)}
                    />
                  }
                  label="Partner Cost Sharing"
                />

                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 4, position: { xl: 'sticky' }, top: { xl: 24 } }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Booking Summary
                </Typography>

                {!effectiveRangeStart || !effectiveRangeEnd || !effectiveDurationMinutes ? (
                  <Alert severity="info">
                    Select a valid start and end slot to see the booking summary.
                  </Alert>
                ) : (
                  <>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Date:</strong> {formatLocalDate(effectiveRangeStart)}
                      </Typography>

                      <Typography variant="body2">
                        <strong>Start:</strong> {formatTimeLabel(effectiveRangeStart)}
                      </Typography>

                      <Typography variant="body2">
                        <strong>End:</strong> {formatTimeLabel(effectiveRangeEnd)}
                      </Typography>

                      <Typography variant="body2">
                        <strong>Duration:</strong> {effectiveDurationMinutes} minutes
                      </Typography>

                      <Typography variant="body2">
                        <strong>Price:</strong>{' '}
                        {renderPrice(
                          selectedPriceRule?.price ?? null,
                          selectedPriceRule?.currency ?? null
                        )}
                      </Typography>

                      <Typography variant="body2">
                        <strong>Status Preview:</strong>{' '}
                        {needsPlayers && minPlayers > 1 ? 'Pending' : 'Confirmed'}
                      </Typography>

                      {!effectiveRangeStatus.isValid && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          {effectiveRangeStatus.reason}
                        </Alert>
                      )}
                    </Stack>

                    <Divider />

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={needsPlayers ? 'Needs players' : 'Solo/ready'}
                        color={needsPlayers ? 'warning' : 'success'}
                        variant="outlined"
                      />
                      <Chip
                        label={`Min ${needsPlayers ? minPlayers : 1}`}
                        variant="outlined"
                      />
                      <Chip
                        label={`Max ${needsPlayers ? maxPlayers : 1}`}
                        variant="outlined"
                      />
                    </Stack>
                  </>
                )}

                <Button
                  variant="contained"
                  size="large"
                  onClick={() => void handleCreateBooking()}
                  disabled={
                    createBookingMutation.isPending ||
                    !effectiveRangeStart ||
                    !effectiveRangeEnd ||
                    !effectiveDurationMinutes ||
                    !selectedEndCell ||
                    !effectiveRangeStatus.isValid
                  }
                >
                  {createBookingMutation.isPending ? 'Creating Booking...' : 'Create Booking'}
                </Button>

                <Button component={RouterLink} to="/clubs" variant="outlined">
                  Back
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}