export const BUSINESS_TIME_ZONE = 'Europe/Skopje';

// --- CORE CONVERSIONS ---

export function toUtcIsoString(localDate: Date): string {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const seconds = localDate.getSeconds();
  const milliseconds = localDate.getMilliseconds();

  const naiveUtcMs = Date.UTC(year, month, day, hours, minutes, seconds, milliseconds);

  const offsetMinutes = getTimeZoneOffsetMinutesForUtcDate(
    new Date(naiveUtcMs),
    BUSINESS_TIME_ZONE
  );

  let correctedUtcMs = naiveUtcMs - offsetMinutes * 60_000;

  const recalculatedOffsetMinutes = getTimeZoneOffsetMinutesForUtcDate(
    new Date(correctedUtcMs),
    BUSINESS_TIME_ZONE
  );

  if (recalculatedOffsetMinutes !== offsetMinutes) {
    correctedUtcMs = naiveUtcMs - recalculatedOffsetMinutes * 60_000;
  }

  return new Date(correctedUtcMs).toISOString();
}

export function fromUtcToLocalDate(utcValue: string): Date {
  const parsed = new Date(utcValue);

  if (Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return buildPseudoLocalDateFromUtc(parsed, BUSINESS_TIME_ZONE);
}

export function getBusinessNowDate(): Date {
  return fromUtcToLocalDate(new Date().toISOString());
}

export function getBusinessTodayDate(): Date {
  return startOfPseudoLocalDay(getBusinessNowDate());
}

export function getBusinessTodayIsoDate(): string {
  const today = getBusinessTodayDate();
  return formatDateOnly(today);
}

// --- INPUT HELPERS ---

export function formatLocalShortDate(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = normalizeToBusinessPseudoLocalDate(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function toLocalDateTimeInputValue(utcValue?: string | null): string {
  if (!utcValue) return '';

  const local = fromUtcToLocalDate(utcValue);

  if (Number.isNaN(local.getTime())) {
    return '';
  }

  const year = local.getFullYear();
  const month = `${local.getMonth() + 1}`.padStart(2, '0');
  const day = `${local.getDate()}`.padStart(2, '0');
  const hours = `${local.getHours()}`.padStart(2, '0');
  const minutes = `${local.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromLocalDateTimeInputValue(localValue: string): string {
  if (!localValue) {
    return '';
  }

  const [datePart, timePart] = localValue.split('T');

  if (!datePart || !timePart) {
    return '';
  }

  const [yearText, monthText, dayText] = datePart.split('-');
  const [hourText, minuteText] = timePart.split(':');

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return '';
  }

  const pseudoLocalDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  return toUtcIsoString(pseudoLocalDate);
}

// --- FORMATTERS ---

export function formatLocalDateTime(value: string | Date) {
  const date = normalizeToBusinessPseudoLocalDate(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatLocalTime(value: string | Date) {
  const date = normalizeToBusinessPseudoLocalDate(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatLocalDate(value: string | Date) {
  const date = normalizeToBusinessPseudoLocalDate(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}

export function formatDateTimeLong24(date: Date) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// --- INTERNAL HELPERS ---

function normalizeToBusinessPseudoLocalDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return buildPseudoLocalDateFromUtc(parsed, BUSINESS_TIME_ZONE);
}

function buildPseudoLocalDateFromUtc(utcDate: Date, timeZone: string): Date {
  const parts = getZonedDateParts(utcDate, timeZone);

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    utcDate.getMilliseconds()
  );
}

function getTimeZoneOffsetMinutesForUtcDate(utcDate: Date, timeZone: string): number {
  const zoned = getZonedDateParts(utcDate, timeZone);

  const asIfUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
    0
  );

  return (asIfUtc - utcDate.getTime()) / 60_000;
}

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function startOfPseudoLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}