import dayjs, { type Dayjs } from 'dayjs';
import { getBusinessTodayDate, getBusinessTodayIsoDate } from '../../../shared/utils/dateTime';

export type IndoorFilter = '' | 'true' | 'false';

export type TimeBox = {
    key: string;
    label: string;
    minuteOfDay: number;
};

export type CourtPriceRuleLite = {
    id?: number;
    courtId?: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    price: number;
    currency: string;
    isActive: boolean;
};

export type CourtSelectionPriceResult = {
    price: number | null;
    currency: string | null;
};

type SurfacePreviewKey = 'clay' | 'hard' | 'grass';

export type CourtSurfaceSelectionColors = {
    solid: string;
    soft: string;
    softer: string;
    contrastText: string;
};

export function getTodayIsoDate(): string {
    return getBusinessTodayIsoDate();
}

export function getRoundedTimeString(stepMinutes = 30): string {
    const now = getBusinessTodayDate();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const roundedMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
    const hours = Math.floor((roundedMinutes % (24 * 60)) / 60);
    const minutes = roundedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
}

export function formatDurationLabel(minutes: number): string {
    if (minutes <= 0) return '0 min';

    if (minutes % 60 === 0) {
        const hours = minutes / 60;
        return `${hours}h`;
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours === 0) {
        return `${remainder} min`;
    }

    return `${hours}h ${remainder}m`;
}

export function buildDiscoveryQueryString(params: {
    date: string;
    startLocalTime?: string;
    durationMinutes?: number;
    surfaceType?: string;
    isIndoor?: boolean;
}): string {
    const searchParams = new URLSearchParams();

    searchParams.set('date', params.date);

    if (params.startLocalTime) {
        searchParams.set('startLocalTime', params.startLocalTime);
    }

    if (typeof params.durationMinutes === 'number') {
        searchParams.set('durationMinutes', String(params.durationMinutes));
    }

    if (params.surfaceType) {
        searchParams.set('surfaceType', params.surfaceType);
    }

    if (typeof params.isIndoor === 'boolean') {
        searchParams.set('isIndoor', String(params.isIndoor));
    }

    return searchParams.toString();
}

export function parseTimeStringToMinutes(value: string): number {
    if (value === '24:00') {
        return 24 * 60;
    }

    const [hourPart, minutePart] = value.split(':');
    const hours = Number(hourPart ?? '0');
    const minutes = Number(minutePart ?? '0');

    return hours * 60 + minutes;
}

export function formatMinutesToKey(value: number): string {
    const normalized = Math.max(0, Math.min(24 * 60, value));

    if (normalized === 24 * 60) {
        return '24:00';
    }

    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;

    return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

export function formatMinutesToLabel(value: number): string {
    if (value === 24 * 60) {
        return '00:00';
    }

    const hours = Math.floor(value / 60);
    const minutes = value % 60;

    return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`;
}

export function addMinutesToTimeString(value: string, minutes: number): string {
    return formatMinutesToKey(parseTimeStringToMinutes(value) + minutes);
}

export function getPreviousTimeKey(timeKey: string, minutes: number): string {
    return formatMinutesToKey(parseTimeStringToMinutes(timeKey) - minutes);
}

export function formatDisplayRange(fromTime: string, untilTime: string): string {
    const fromLabel = fromTime === '24:00' ? '00:00' : fromTime;
    const untilLabel = untilTime === '24:00' ? '00:00' : untilTime;

    return `${fromLabel} – ${untilLabel}`;
}

export function getSelectableDateBounds() {
    const today = dayjs(getTodayIsoDate()).startOf('day');
    const lastDay = today.add(13, 'day');

    return { today, lastDay };
}

export function isDateWithinNext14Days(value: Dayjs | null): boolean {
    if (!value) return false;

    const { today, lastDay } = getSelectableDateBounds();
    const normalized = value.startOf('day');

    return !normalized.isBefore(today) && !normalized.isAfter(lastDay);
}

export function tryBuildPrefillUntil(
    startLocalTime: string | null,
    durationMinutes: number,
    fallbackIntervalMinutes: number
): string {
    if (!startLocalTime) return '';

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return addMinutesToTimeString(startLocalTime, fallbackIntervalMinutes);
    }

    return addMinutesToTimeString(startLocalTime, durationMinutes);
}

export function buildTimeBoxes(
    intervalMinutes: number,
    openMinutes: number,
    closeMinutes: number
): TimeBox[] {
    const boxes: TimeBox[] = [];

    for (let minutes = openMinutes; minutes <= closeMinutes; minutes += intervalMinutes) {
        boxes.push({
            key: formatMinutesToKey(minutes),
            label: formatMinutesToLabel(minutes),
            minuteOfDay: minutes,
        });
    }

    return boxes;
}

export function getSelectionBounds(startKey: string, endKey: string) {
    const startMinutes = parseTimeStringToMinutes(startKey);
    const endMinutes = parseTimeStringToMinutes(endKey);

    return {
        fromMinutes: Math.min(startMinutes, endMinutes),
        toMinutes: Math.max(startMinutes, endMinutes),
        fromKey: formatMinutesToKey(Math.min(startMinutes, endMinutes)),
        toKey: formatMinutesToKey(Math.max(startMinutes, endMinutes)),
    };
}

export function getNowMinutesForBusinessDay(): number {
    const now = getBusinessTodayDate();
    return now.getHours() * 60 + now.getMinutes();
}

export function clampTimeToWindow(
    timeKey: string,
    openMinutes: number,
    closeMinutes: number
): string {
    const minutes = parseTimeStringToMinutes(timeKey);
    const clamped = Math.max(openMinutes, Math.min(closeMinutes, minutes));

    return formatMinutesToKey(clamped);
}

export function isTimeWithinWindow(
    timeKey: string,
    openMinutes: number,
    closeMinutes: number
): boolean {
    const minutes = parseTimeStringToMinutes(timeKey);
    return minutes >= openMinutes && minutes <= closeMinutes;
}

export function getFirstFutureSelectableTime(
    candidateStartTimes: string[],
    draftDate: string
): string {
    if (!candidateStartTimes.length) return '';

    const isToday = draftDate === getTodayIsoDate();
    if (!isToday) {
        return candidateStartTimes[0] ?? '';
    }

    const nowMinutes = getNowMinutesForBusinessDay();
    const firstFuture = candidateStartTimes.find(
        (time) => parseTimeStringToMinutes(time) >= nowMinutes
    );

    return firstFuture ?? candidateStartTimes[0] ?? '';
}

export function getBoundaryAvailableCount(
    timeKey: string,
    openMinutes: number,
    closeMinutes: number,
    getEffectiveAvailableCount: (key: string) => number
): number {
    const minutes = parseTimeStringToMinutes(timeKey);

    const isOpenBoundary = minutes === openMinutes;
    const isCloseBoundary = minutes === closeMinutes;

    if (isOpenBoundary) {
        return getEffectiveAvailableCount(timeKey);
    }

    if (isCloseBoundary) {
        return getEffectiveAvailableCount(getPreviousTimeKey(timeKey, 30));
    }

    const previousCount = getEffectiveAvailableCount(getPreviousTimeKey(timeKey, 30));
    const nextCount = getEffectiveAvailableCount(timeKey);

    return Math.max(previousCount, nextCount);
}

export function buildDiscreteTimeKeysInRange(
    startKey: string,
    endKey: string,
    stepMinutes: number
): string[] {
    const startMinutes = parseTimeStringToMinutes(startKey);
    const endMinutes = parseTimeStringToMinutes(endKey);

    if (
        !Number.isFinite(startMinutes) ||
        !Number.isFinite(endMinutes) ||
        stepMinutes <= 0 ||
        endMinutes <= startMinutes
    ) {
        return [];
    }

    const keys: string[] = [];

    for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMinutes) {
        keys.push(formatMinutesToKey(minutes));
    }

    return keys;
}

export function parseAllowedDurations(value?: string | null): number[] {
    if (!value) {
        return [];
    }

    return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0)
        .sort((left, right) => left - right);
}

export function calculateCourtSelectionPrice(params: {
    date: string;
    startKey: string;
    endKey: string;
    rules: CourtPriceRuleLite[];
}): CourtSelectionPriceResult {
    const { date, startKey, endKey, rules } = params;

    const bounds = getSelectionBounds(startKey, endKey);
    if (bounds.toMinutes <= bounds.fromMinutes) {
        return { price: null, currency: null };
    }

    const parsedDate = dayjs(date, 'YYYY-MM-DD', true);
    if (!parsedDate.isValid()) {
        return { price: null, currency: null };
    }

    const dayOfWeek = parsedDate.day();

    const activeRules = rules
        .filter((rule) => rule.isActive && rule.dayOfWeek === dayOfWeek)
        .filter((rule) => rule.durationMinutes > 0)
        .filter((rule) => Number.isFinite(rule.price))
        .sort((left, right) => {
            const startCompare =
                parseTimeStringToMinutes(left.startTime) - parseTimeStringToMinutes(right.startTime);

            if (startCompare !== 0) {
                return startCompare;
            }

            return parseTimeStringToMinutes(left.endTime) - parseTimeStringToMinutes(right.endTime);
        });

    if (!activeRules.length) {
        return { price: null, currency: null };
    }

    const currencies = Array.from(
        new Set(
            activeRules
                .map((rule) => rule.currency?.trim())
                .filter((value): value is string => !!value)
                .map((value) => value.toUpperCase())
        )
    );

    if (currencies.length !== 1) {
        return { price: null, currency: null };
    }

    const boundaries = new Set<number>([bounds.fromMinutes, bounds.toMinutes]);

    activeRules.forEach((rule) => {
        const ruleStart = parseTimeStringToMinutes(rule.startTime);
        const ruleEnd = parseTimeStringToMinutes(rule.endTime);

        if (ruleStart > bounds.fromMinutes && ruleStart < bounds.toMinutes) {
            boundaries.add(ruleStart);
        }

        if (ruleEnd > bounds.fromMinutes && ruleEnd < bounds.toMinutes) {
            boundaries.add(ruleEnd);
        }
    });

    const orderedBoundaries = Array.from(boundaries).sort((left, right) => left - right);

    if (orderedBoundaries.length < 2) {
        return { price: null, currency: null };
    }

    let total = 0;

    for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
        const segmentStart = orderedBoundaries[index];
        const segmentEnd = orderedBoundaries[index + 1];

        if (segmentEnd <= segmentStart) {
            continue;
        }

        const coveringRule = activeRules.find((rule) => {
            const ruleStart = parseTimeStringToMinutes(rule.startTime);
            const ruleEnd = parseTimeStringToMinutes(rule.endTime);

            return ruleStart <= segmentStart && ruleEnd >= segmentEnd;
        });

        if (!coveringRule || coveringRule.durationMinutes <= 0) {
            return { price: null, currency: null };
        }

        const segmentMinutes = segmentEnd - segmentStart;
        const ratePerMinute = coveringRule.price / coveringRule.durationMinutes;
        total += ratePerMinute * segmentMinutes;
    }

    return {
        price: Math.round(total * 100) / 100,
        currency: currencies[0],
    };
}

export function mapSurfaceTypeToSurfaceKey(
    surfaceType: string | null | undefined
): SurfacePreviewKey | null {
    if (!surfaceType) {
        return null;
    }

    const normalized = surfaceType.trim().toLowerCase();

    if (normalized === 'clay') {
        return 'clay';
    }

    if (
        normalized === 'hard' ||
        normalized === 'acrylic' ||
        normalized === 'carpet' ||
        normalized === 'synthetic'
    ) {
        return 'hard';
    }

    if (
        normalized === 'grass' ||
        normalized === 'artificial grass' ||
        normalized === 'artificialgrass'
    ) {
        return 'grass';
    }

    return null;
}

export function getSurfacePreviewImagePath(
    surfaceType: string | null | undefined
): string | null {
    const key = mapSurfaceTypeToSurfaceKey(surfaceType);

    if (!key) {
        return null;
    }

    switch (key) {
        case 'clay':
            return '/media/court-types/clay.png';
        case 'hard':
            return '/media/court-types/hard.png';
        case 'grass':
            return '/media/court-types/grass.png';
        default:
            return null;
    }
}

export function getCourtHeroImagePath(
    surfaceType: string | null | undefined
): string | null {
    const key = mapSurfaceTypeToSurfaceKey(surfaceType);

    if (!key) {
        return null;
    }

    switch (key) {
        case 'clay':
            return '/media/court-hero/clay.jpg';
        case 'hard':
            return '/media/court-hero/hard.jpg';
        case 'grass':
            return '/media/court-hero/grass.jpg';
        default:
            return null;
    }
}

export function getCourtSurfaceSelectionColors(
    surfaceType: string | null | undefined
): CourtSurfaceSelectionColors {
    const key = mapSurfaceTypeToSurfaceKey(surfaceType);

    switch (key) {
        case 'clay':
            return {
                solid: 'rgb(194, 78, 26)',
                soft: 'rgba(194, 78, 26, 0.18)',
                softer: 'rgba(194, 78, 26, 0.12)',
                contrastText: '#ffffff',
            };
        case 'grass':
            return {
                solid: 'rgb(78, 101, 16)',
                soft: 'rgba(78, 101, 16, 0.18)',
                softer: 'rgba(78, 101, 16, 0.12)',
                contrastText: '#ffffff',
            };
        case 'hard':
            return {
                solid: 'rgb(37, 86, 155)',
                soft: 'rgba(37, 86, 155, 0.18)',
                softer: 'rgba(37, 86, 155, 0.12)',
                contrastText: '#ffffff',
            };
        default:
            return {
                solid: 'rgb(37, 86, 155)',
                soft: 'rgba(37, 86, 155, 0.18)',
                softer: 'rgba(37, 86, 155, 0.12)',
                contrastText: '#ffffff',
            };
    }
}