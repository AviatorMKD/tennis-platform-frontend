import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClubWeatherHourDto } from '../../../api/discovery.api';
import type { TimeBox, CourtSurfaceSelectionColors } from '../utils/discoveryTime';
import {
    formatDisplayRange,
    formatDurationLabel,
    getBoundaryAvailableCount,
    getNowMinutesForBusinessDay,
    getSelectionBounds,
    getTodayIsoDate,
} from '../utils/discoveryTime';

export type CourtTimelinePreviewState = {
    hasActivePreview: boolean;
    isValid: boolean;
    reason: 'overlap' | 'duration_not_allowed' | 'too_long' | null;
};

export type CourtTimelinePreviewRangeState = {
    hasActivePreview: boolean;
    fromKey: string;
    toKey: string;
    durationMinutes: number;
};

type CourtTimelineSelectorProps = {
    date: string;
    timeBoxes: TimeBox[];
    clubOpenMinutes: number;
    clubCloseMinutes: number;
    selectedStartTime: string;
    selectedEndTime: string;
    getEffectiveAvailableCount: (key: string) => number;
    onSelectionChange: (nextStart: string, nextEnd: string) => void;
    maxAllowedDurationMinutes?: number;
    allowedDurations?: number[];
    onPreviewStateChange?: (state: CourtTimelinePreviewState) => void;
    onPreviewRangeChange?: (state: CourtTimelinePreviewRangeState) => void;
    showHeaderSummary?: boolean;
    selectionColors?: CourtSurfaceSelectionColors;
    weatherHours?: ClubWeatherHourDto[];
};

export function CourtTimelineSelector({
    date,
    timeBoxes,
    clubOpenMinutes,
    clubCloseMinutes,
    selectedStartTime,
    selectedEndTime,
    getEffectiveAvailableCount,
    onSelectionChange,
    maxAllowedDurationMinutes,
    allowedDurations,
    onPreviewStateChange,
    onPreviewRangeChange,
    showHeaderSummary = true,
    selectionColors,
    weatherHours = [],
}: CourtTimelineSelectorProps) {
    const committedSelectionKey = `${selectedStartTime}|${selectedEndTime}`;

    const [pendingStartTime, setPendingStartTime] = useState('');
    const [hoverTime, setHoverTime] = useState('');
    const [pendingSelectionKey, setPendingSelectionKey] = useState(committedSelectionKey);

    const lastPreviewStateRef = useRef<CourtTimelinePreviewState | null>(null);
    const lastPreviewRangeRef = useRef<CourtTimelinePreviewRangeState | null>(null);

    const activeColors: CourtSurfaceSelectionColors = selectionColors ?? {
        solid: 'rgb(37, 86, 155)',
        soft: 'rgba(37, 86, 155, 0.18)',
        softer: 'rgba(37, 86, 155, 0.12)',
        contrastText: '#ffffff',
    };

    const weatherByHour = useMemo(() => {
        const map = new Map<number, ClubWeatherHourDto>();

        weatherHours.forEach((hour) => {
            map.set(hour.hour, hour);
        });

        return map;
    }, [weatherHours]);

    const weatherHourBoxes = useMemo(() => {
        const boxes: Array<{
            key: string;
            hour: number;
            label: string;
            weather: ClubWeatherHourDto | undefined;
        }> = [];

        for (let minute = clubOpenMinutes; minute < clubCloseMinutes; minute += 60) {
            const hour = Math.floor(minute / 60);
            const label = `${String(hour).padStart(2, '0')}:00`;

            boxes.push({
                key: label,
                hour,
                label,
                weather: weatherByHour.get(hour),
            });
        }

        return boxes;
    }, [clubOpenMinutes, clubCloseMinutes, weatherByHour]);

    const isPendingStateActive = pendingSelectionKey === committedSelectionKey;

    const effectivePendingStartTime = isPendingStateActive ? pendingStartTime : '';
    const effectiveHoverTime = isPendingStateActive ? hoverTime : '';

    const previewEndTime = effectivePendingStartTime
        ? effectiveHoverTime || effectivePendingStartTime
        : selectedEndTime;

    const previewBounds = useMemo(() => {
        if (effectivePendingStartTime) {
            return getSelectionBounds(effectivePendingStartTime, previewEndTime);
        }

        return getSelectionBounds(selectedStartTime, selectedEndTime);
    }, [effectivePendingStartTime, previewEndTime, selectedStartTime, selectedEndTime]);

    const committedBounds = useMemo(() => {
        return getSelectionBounds(selectedStartTime, selectedEndTime);
    }, [selectedStartTime, selectedEndTime]);

    const previewDuration = previewBounds.toMinutes - previewBounds.fromMinutes;

    const isBoundaryDisabled = (box: TimeBox) => {
        const isToday = date === getTodayIsoDate();
        const nowMinutes = getNowMinutesForBusinessDay();
        const isPast = isToday && box.minuteOfDay < nowMinutes;

        const boundaryAvailableCount = getBoundaryAvailableCount(
            box.key,
            clubOpenMinutes,
            clubCloseMinutes,
            getEffectiveAvailableCount
        );

        return isPast || boundaryAvailableCount <= 0;
    };

    const previewHasUnavailableOverlap = useMemo(() => {
        if (!effectivePendingStartTime || previewDuration <= 0) {
            return false;
        }

        return timeBoxes.some((box) => {
            if (
                box.minuteOfDay < previewBounds.fromMinutes ||
                box.minuteOfDay >= previewBounds.toMinutes
            ) {
                return false;
            }

            if (box.minuteOfDay >= clubCloseMinutes) {
                return false;
            }

            return getEffectiveAvailableCount(box.key) <= 0;
        });
    }, [
        effectivePendingStartTime,
        previewDuration,
        previewBounds.fromMinutes,
        previewBounds.toMinutes,
        timeBoxes,
        clubCloseMinutes,
        getEffectiveAvailableCount,
    ]);

    const previewNotAllowedDuration =
        !!effectivePendingStartTime &&
        previewDuration > 0 &&
        Array.isArray(allowedDurations) &&
        allowedDurations.length > 0 &&
        !allowedDurations.includes(previewDuration);

    const previewExceedsMaxDuration =
        !!effectivePendingStartTime &&
        previewDuration > 0 &&
        !previewNotAllowedDuration &&
        typeof maxAllowedDurationMinutes === 'number' &&
        maxAllowedDurationMinutes > 0 &&
        previewDuration > maxAllowedDurationMinutes;

    const previewIsInvalid =
        previewHasUnavailableOverlap || previewNotAllowedDuration || previewExceedsMaxDuration;

    const hasActivePreview = !!effectivePendingStartTime && previewDuration > 0;

    useEffect(() => {
        if (!onPreviewStateChange) {
            return;
        }

        const nextState: CourtTimelinePreviewState = !hasActivePreview
            ? {
                  hasActivePreview: false,
                  isValid: true,
                  reason: null,
              }
            : {
                  hasActivePreview: true,
                  isValid: !previewIsInvalid,
                  reason: previewHasUnavailableOverlap
                      ? 'overlap'
                      : previewNotAllowedDuration
                        ? 'duration_not_allowed'
                        : previewExceedsMaxDuration
                          ? 'too_long'
                          : null,
              };

        const previousState = lastPreviewStateRef.current;
        const isSameState =
            previousState?.hasActivePreview === nextState.hasActivePreview &&
            previousState?.isValid === nextState.isValid &&
            previousState?.reason === nextState.reason;

        if (isSameState) {
            return;
        }

        lastPreviewStateRef.current = nextState;
        onPreviewStateChange(nextState);
    }, [
        hasActivePreview,
        onPreviewStateChange,
        previewExceedsMaxDuration,
        previewHasUnavailableOverlap,
        previewIsInvalid,
        previewNotAllowedDuration,
    ]);

    useEffect(() => {
        if (!onPreviewRangeChange) {
            return;
        }

        const nextRange: CourtTimelinePreviewRangeState = hasActivePreview
            ? {
                  hasActivePreview: true,
                  fromKey: previewBounds.fromKey,
                  toKey: previewBounds.toKey,
                  durationMinutes: previewDuration,
              }
            : {
                  hasActivePreview: false,
                  fromKey: committedBounds.fromKey,
                  toKey: committedBounds.toKey,
                  durationMinutes: committedBounds.toMinutes - committedBounds.fromMinutes,
              };

        const previousRange = lastPreviewRangeRef.current;
        const isSameRange =
            previousRange?.hasActivePreview === nextRange.hasActivePreview &&
            previousRange?.fromKey === nextRange.fromKey &&
            previousRange?.toKey === nextRange.toKey &&
            previousRange?.durationMinutes === nextRange.durationMinutes;

        if (isSameRange) {
            return;
        }

        lastPreviewRangeRef.current = nextRange;
        onPreviewRangeChange(nextRange);
    }, [
        committedBounds.fromKey,
        committedBounds.fromMinutes,
        committedBounds.toKey,
        committedBounds.toMinutes,
        hasActivePreview,
        onPreviewRangeChange,
        previewBounds.fromKey,
        previewBounds.toKey,
        previewDuration,
    ]);

    const handleBoundaryClick = (boxKey: string) => {
        const clickedBox = timeBoxes.find((box) => box.key === boxKey);
        if (!clickedBox) {
            return;
        }

        if (isBoundaryDisabled(clickedBox)) {
            return;
        }

        if (!effectivePendingStartTime) {
            setPendingSelectionKey(committedSelectionKey);
            setPendingStartTime(boxKey);
            setHoverTime('');
            return;
        }

        if (effectivePendingStartTime === boxKey) {
            setPendingStartTime('');
            setHoverTime('');
            setPendingSelectionKey(committedSelectionKey);
            return;
        }

        const normalized = getSelectionBounds(effectivePendingStartTime, boxKey);
        const normalizedDuration = normalized.toMinutes - normalized.fromMinutes;

        const normalizedHasUnavailableOverlap = timeBoxes.some((timeBox) => {
            if (
                timeBox.minuteOfDay < normalized.fromMinutes ||
                timeBox.minuteOfDay >= normalized.toMinutes
            ) {
                return false;
            }

            if (timeBox.minuteOfDay >= clubCloseMinutes) {
                return false;
            }

            return getEffectiveAvailableCount(timeBox.key) <= 0;
        });

        const normalizedNotAllowedDuration =
            Array.isArray(allowedDurations) &&
            allowedDurations.length > 0 &&
            !allowedDurations.includes(normalizedDuration);

        const normalizedExceedsMaxDuration =
            !normalizedNotAllowedDuration &&
            typeof maxAllowedDurationMinutes === 'number' &&
            maxAllowedDurationMinutes > 0 &&
            normalizedDuration > maxAllowedDurationMinutes;

        if (
            normalizedHasUnavailableOverlap ||
            normalizedNotAllowedDuration ||
            normalizedExceedsMaxDuration
        ) {
            return;
        }

        onSelectionChange(normalized.fromKey, normalized.toKey);

        setPendingSelectionKey(committedSelectionKey);
        setPendingStartTime('');
        setHoverTime('');
    };

    const renderWeatherCell = (
        weather: ClubWeatherHourDto | undefined,
        key: string,
        label: string
    ) => (
        <Box
            key={key}
            title={
                weather
                    ? `${label} · ${weather.conditionText} · ${Math.round(
                          weather.tempC
                      )}°C · Rain ${weather.chanceOfRain}% · Wind ${Math.round(
                          weather.windKph
                      )} km/h`
                    : `${label} · Weather unavailable`
            }
            sx={{
                minHeight: 38,
                px: 0.75,
                py: 0.35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.45,
                bgcolor: 'rgba(248,250,252,0.92)',
            }}
        >
            {weather?.iconUrl && (
                <Box
                    component="img"
                    src={weather.iconUrl}
                    alt={weather.conditionText || 'Weather'}
                    sx={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                    }}
                />
            )}

            <Typography
                variant="caption"
                sx={{
                    fontWeight: 800,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                }}
            >
                {weather ? `${Math.round(weather.tempC)}°` : '--'}
            </Typography>

            {weather && weather.chanceOfRain >= 30 && (
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        color: 'info.main',
                    }}
                >
                    {weather.chanceOfRain}%
                </Typography>
            )}

            {weather && weather.windKph >= 25 && (
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        color: 'warning.dark',
                    }}
                >
                    {Math.round(weather.windKph)}k
                </Typography>
            )}
        </Box>
    );

    const renderSlotButton = (box: TimeBox) => {
        const isStart = box.key === previewBounds.fromKey;
        const isEnd = box.key === previewBounds.toKey;
        const isInRange =
            box.minuteOfDay > previewBounds.fromMinutes &&
            box.minuteOfDay < previewBounds.toMinutes;

        const isCommittedStart = box.key === committedBounds.fromKey;
        const isCommittedEnd = box.key === committedBounds.toKey;
        const isPendingStart = effectivePendingStartTime === box.key;

        const isToday = date === getTodayIsoDate();
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
            isPast && !isLastBoundaryBox && !isStart && !isEnd && !isInRange;

        const isBoundaryOnlyNeutral =
            isLastBoundaryBox && !isStart && !isEnd && !isInRange;

        const isNeutralUnavailable =
            isUnavailable && !isLastBoundaryBox && !isStart && !isEnd && !isInRange;

        const isInvalidRangeBody = previewIsInvalid && isInRange && !isStart && !isEnd;
        const isInvalidRangeEdge = previewIsInvalid && (isStart || isEnd);

        const weather = weatherByHour.get(Math.floor(box.minuteOfDay / 60));

        return (
            <Button
                key={box.key}
                variant="outlined"
                disabled={isDisabled}
                onClick={() => handleBoundaryClick(box.key)}
                onMouseEnter={() => {
                    if (!effectivePendingStartTime || isDisabled) {
                        return;
                    }

                    setPendingSelectionKey(committedSelectionKey);
                    setHoverTime(box.key);
                }}
                onMouseLeave={() => {
                    if (effectivePendingStartTime) {
                        setHoverTime('');
                    }
                }}
                sx={{
                    minWidth: 0,
                    width: '100%',
                    minHeight: { xs: weatherHours.length > 0 ? 44 : 34, md: 40 },
                    px: { xs: 0.25, md: 0.4 },
                    py: { xs: 0.15, md: 0.35 },
                    borderRadius: 0,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    borderColor: isPendingStart
                        ? activeColors.solid
                        : isInvalidRangeEdge
                          ? 'error.main'
                          : isBoundaryOnlyNeutral
                            ? 'rgba(185,185,185,0.45)'
                            : isPastOnly
                              ? 'rgba(190,190,190,0.55)'
                              : isNeutralUnavailable
                                ? 'rgba(160,160,160,0.55)'
                                : isStart || isEnd || isInRange
                                  ? activeColors.solid
                                  : 'divider',
                    bgcolor: isPendingStart
                        ? activeColors.softer
                        : isInvalidRangeEdge
                          ? 'error.main'
                          : isInvalidRangeBody
                            ? 'rgba(211, 47, 47, 0.18)'
                            : isBoundaryOnlyNeutral
                              ? 'rgba(225,225,225,0.20)'
                              : isPastOnly
                                ? 'rgba(210,210,210,0.16)'
                                : isNeutralUnavailable
                                  ? 'rgba(180,180,180,0.24)'
                                  : isStart || isEnd
                                    ? activeColors.solid
                                    : isInRange
                                      ? activeColors.soft
                                      : '#ffffff',
                    color: isPendingStart
                        ? activeColors.solid
                        : isInvalidRangeEdge
                          ? 'error.contrastText'
                          : isBoundaryOnlyNeutral
                            ? 'rgba(120,120,120,0.95)'
                            : isPastOnly
                              ? 'rgba(110,110,110,0.95)'
                              : isNeutralUnavailable
                                ? 'rgba(70,70,70,0.95)'
                                : isStart || isEnd
                                  ? activeColors.contrastText
                                  : 'text.primary',
                    '&:hover': {
                        bgcolor: isPendingStart
                            ? activeColors.soft
                            : isInvalidRangeEdge
                              ? 'error.dark'
                              : isInvalidRangeBody
                                ? 'rgba(211, 47, 47, 0.24)'
                                : isBoundaryOnlyNeutral
                                  ? 'rgba(225,225,225,0.20)'
                                  : isPastOnly
                                    ? 'rgba(210,210,210,0.16)'
                                    : isNeutralUnavailable
                                      ? 'rgba(180,180,180,0.24)'
                                      : isStart || isEnd
                                        ? activeColors.solid
                                        : isInRange
                                          ? activeColors.soft
                                          : '#ffffff',
                        borderColor: isPendingStart
                            ? activeColors.solid
                            : isInvalidRangeEdge
                              ? 'error.main'
                              : isBoundaryOnlyNeutral
                                ? 'rgba(185,185,185,0.45)'
                                : isPastOnly
                                  ? 'rgba(190,190,190,0.55)'
                                  : isNeutralUnavailable
                                    ? 'rgba(160,160,160,0.55)'
                                    : isStart || isEnd || isInRange
                                      ? activeColors.solid
                                      : activeColors.solid,
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
                    ...(isCommittedStart && {
                        boxShadow: `inset 0 0 0 1px ${activeColors.soft}`,
                    }),
                    ...(isCommittedEnd && {
                        boxShadow: `inset 0 0 0 1px ${activeColors.soft}`,
                    }),
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: { xs: 0.15, md: 0 },
                        lineHeight: 1,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            lineHeight: 1,
                            fontWeight:
                                isPendingStart || isStart || isEnd || isInRange
                                    ? 700
                                    : 500,
                            fontSize: { xs: '0.75rem', md: '0.72rem' },
                        }}
                    >
                        {box.label}
                    </Typography>

                    {weatherHours.length > 0 && weather && (
                        <Box
                            sx={{
                                display: { xs: 'flex', md: 'none' },
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.15,
                                mt: 0.25,
                            }}
                        >
                            {weather.iconUrl && (
                                <Box
                                    component="img"
                                    src={weather.iconUrl}
                                    alt={weather.conditionText || 'Weather'}
                                    sx={{
                                        width: 18,
                                        height: 18,
                                        flexShrink: 0,
                                    }}
                                />
                            )}

                            <Typography
                                variant="caption"
                                sx={{
                                    lineHeight: 1,
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                }}
                            >
                                {Math.round(weather.tempC)}°
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Button>
        );
    };

    return (
        <Stack spacing={0}>
            {showHeaderSummary && (
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Court timeline
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                            size="small"
                            label={formatDisplayRange(previewBounds.fromKey, previewBounds.toKey)}
                            color={
                                previewIsInvalid
                                    ? 'error'
                                    : effectivePendingStartTime
                                      ? 'default'
                                      : 'primary'
                            }
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={formatDurationLabel(previewDuration)}
                            color={previewIsInvalid ? 'error' : 'default'}
                            variant="outlined"
                        />
                        {effectivePendingStartTime && (
                            <Chip
                                size="small"
                                label={
                                    previewHasUnavailableOverlap
                                        ? 'Overlap detected'
                                        : previewNotAllowedDuration
                                          ? 'Duration not allowed'
                                          : previewExceedsMaxDuration
                                            ? 'Too long'
                                            : 'Select end time'
                                }
                                color={previewIsInvalid ? 'error' : 'primary'}
                                variant="filled"
                            />
                        )}
                    </Stack>
                </Stack>
            )}

            {weatherHours.length > 0 && weatherHourBoxes.length > 0 && (
                <Box
                    sx={{
                        display: { xs: 'none', md: 'grid' },
                        gridTemplateColumns: `repeat(${Math.max(
                            weatherHourBoxes.length,
                            1
                        )}, minmax(0, 1fr))`,
                        gap: 0,
                        width: '100%',
                        overflow: 'hidden',
                        bgcolor: 'rgba(248,250,252,0.92)',
                        borderTopLeftRadius: 10,
                        borderTopRightRadius: 10,
                        mb: 0,
                    }}
                >
                    {weatherHourBoxes.map((item) =>
                        renderWeatherCell(item.weather, item.key, item.label)
                    )}
                </Box>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(4, minmax(0, 1fr))',
                        sm: 'repeat(6, minmax(0, 1fr))',
                        md: `repeat(${Math.max(timeBoxes.length, 1)}, minmax(0, 1fr))`,
                    },
                    gap: { xs: 0.35, md: 0 },
                    width: '100%',
                }}
            >
                {timeBoxes.map((box) => renderSlotButton(box))}
            </Box>
        </Stack>
    );
}