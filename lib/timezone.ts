const APP_TIMEZONE = "America/Sao_Paulo";

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type ServiceTimeParts = {
  hour: number;
  minute: number;
  hhmm: string;
};

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

export type ServicePeriodRange = {
  startIso: string;
  endIso: string;
  openingTimeHHMM: string;
  closingTimeHHMM: string;
  spansOvernight: boolean;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getOffsetInMilliseconds(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone);
  const equivalentUtcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return equivalentUtcTimestamp - date.getTime();
}

function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const parts = getZonedDateParts(date, timeZone);
  const utcMidnight = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);

  const offsetFirstPass = getOffsetInMilliseconds(new Date(utcMidnight), timeZone);
  const candidateTimestamp = utcMidnight - offsetFirstPass;
  const offsetSecondPass = getOffsetInMilliseconds(new Date(candidateTimestamp), timeZone);

  return new Date(utcMidnight - offsetSecondPass);
}

function toServiceTimeParts(rawValue: string | null | undefined): ServiceTimeParts | null {
  if (!rawValue) {
    return null;
  }

  const match = rawValue.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return {
    hour,
    minute,
    hhmm: `${match[1]}:${match[2]}`,
  };
}

function toMinutes(parts: ServiceTimeParts) {
  return parts.hour * 60 + parts.minute;
}

function shiftLocalDate(referenceDate: Date, dayOffset: number, timeZone: string): LocalDateParts {
  const referenceParts = getZonedDateParts(referenceDate, timeZone);
  const shiftedNoon = new Date(
    Date.UTC(referenceParts.year, referenceParts.month - 1, referenceParts.day + dayOffset, 12, 0, 0),
  );
  const shiftedParts = getZonedDateParts(shiftedNoon, timeZone);

  return {
    year: shiftedParts.year,
    month: shiftedParts.month,
    day: shiftedParts.day,
  };
}

function zonedDateTimeToUtcDate(date: LocalDateParts, hour: number, minute: number, timeZone: string): Date {
  const utcGuess = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  const firstOffset = getOffsetInMilliseconds(new Date(utcGuess), timeZone);
  const firstCandidate = utcGuess - firstOffset;
  const secondOffset = getOffsetInMilliseconds(new Date(firstCandidate), timeZone);

  return new Date(utcGuess - secondOffset);
}

export function getTodayRangeInSaoPaulo(referenceDate = new Date()): {
  startOfTodayIso: string;
  startOfTomorrowIso: string;
} {
  const startOfToday = startOfDayInTimeZone(referenceDate, APP_TIMEZONE);

  const referenceParts = getZonedDateParts(referenceDate, APP_TIMEZONE);
  const tomorrowNoonUtc = new Date(
    Date.UTC(referenceParts.year, referenceParts.month - 1, referenceParts.day + 1, 12, 0, 0),
  );
  const startOfTomorrow = startOfDayInTimeZone(tomorrowNoonUtc, APP_TIMEZONE);

  return {
    startOfTodayIso: startOfToday.toISOString(),
    startOfTomorrowIso: startOfTomorrow.toISOString(),
  };
}

export function getCurrentWeekRangeInSaoPaulo(referenceDate = new Date()): {
  startOfWeekIso: string;
  startOfNextWeekIso: string;
} {
  const referenceParts = getZonedDateParts(referenceDate, APP_TIMEZONE);
  const referenceNoonUtc = new Date(
    Date.UTC(referenceParts.year, referenceParts.month - 1, referenceParts.day, 12, 0, 0),
  );
  const weekday = referenceNoonUtc.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;

  const mondayNoonUtc = new Date(
    Date.UTC(referenceParts.year, referenceParts.month - 1, referenceParts.day - daysSinceMonday, 12, 0, 0),
  );
  const nextMondayNoonUtc = new Date(
    Date.UTC(referenceParts.year, referenceParts.month - 1, referenceParts.day - daysSinceMonday + 7, 12, 0, 0),
  );

  const startOfWeek = startOfDayInTimeZone(mondayNoonUtc, APP_TIMEZONE);
  const startOfNextWeek = startOfDayInTimeZone(nextMondayNoonUtc, APP_TIMEZONE);

  return {
    startOfWeekIso: startOfWeek.toISOString(),
    startOfNextWeekIso: startOfNextWeek.toISOString(),
  };
}

export function isWithinServiceHoursInSaoPaulo(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  referenceDate = new Date(),
): boolean | null {
  const opening = toServiceTimeParts(openingTime);
  const closing = toServiceTimeParts(closingTime);

  if (!opening || !closing) {
    return null;
  }

  const openingMinutes = toMinutes(opening);
  const closingMinutes = toMinutes(closing);
  if (openingMinutes === closingMinutes) {
    return null;
  }

  const referenceParts = getZonedDateParts(referenceDate, APP_TIMEZONE);
  const nowMinutes = referenceParts.hour * 60 + referenceParts.minute;

  if (openingMinutes < closingMinutes) {
    return nowMinutes >= openingMinutes && nowMinutes < closingMinutes;
  }

  return nowMinutes >= openingMinutes || nowMinutes < closingMinutes;
}

export function getCurrentServicePeriodRangeInSaoPaulo(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  referenceDate = new Date(),
): ServicePeriodRange | null {
  const opening = toServiceTimeParts(openingTime);
  const closing = toServiceTimeParts(closingTime);

  if (!opening || !closing) {
    return null;
  }

  const openingMinutes = toMinutes(opening);
  const closingMinutes = toMinutes(closing);
  if (openingMinutes === closingMinutes) {
    return null;
  }

  const referenceParts = getZonedDateParts(referenceDate, APP_TIMEZONE);
  const nowMinutes = referenceParts.hour * 60 + referenceParts.minute;
  const spansOvernight = openingMinutes > closingMinutes;

  let startOffset = 0;
  let endOffset = 0;

  if (spansOvernight) {
    if (nowMinutes < closingMinutes) {
      startOffset = -1;
      endOffset = 0;
    } else {
      startOffset = 0;
      endOffset = 1;
    }
  }

  const startDate = shiftLocalDate(referenceDate, startOffset, APP_TIMEZONE);
  const endDate = shiftLocalDate(referenceDate, endOffset, APP_TIMEZONE);
  const startDateTime = zonedDateTimeToUtcDate(startDate, opening.hour, opening.minute, APP_TIMEZONE);
  const endDateTime = zonedDateTimeToUtcDate(endDate, closing.hour, closing.minute, APP_TIMEZONE);

  return {
    startIso: startDateTime.toISOString(),
    endIso: endDateTime.toISOString(),
    openingTimeHHMM: opening.hhmm,
    closingTimeHHMM: closing.hhmm,
    spansOvernight,
  };
}

export function getMillisecondsUntilNextServiceStatusChangeInSaoPaulo(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
  referenceDate = new Date(),
): number | null {
  const opening = toServiceTimeParts(openingTime);
  const closing = toServiceTimeParts(closingTime);

  if (!opening || !closing) {
    return null;
  }

  const openingMinutes = toMinutes(opening);
  const closingMinutes = toMinutes(closing);
  if (openingMinutes === closingMinutes) {
    return null;
  }

  const referenceParts = getZonedDateParts(referenceDate, APP_TIMEZONE);
  const nowMinutes = referenceParts.hour * 60 + referenceParts.minute;
  const spansOvernight = openingMinutes > closingMinutes;

  let targetOffset = 0;
  let targetHour = opening.hour;
  let targetMinute = opening.minute;

  if (!spansOvernight) {
    if (nowMinutes < openingMinutes) {
      targetHour = opening.hour;
      targetMinute = opening.minute;
      targetOffset = 0;
    } else if (nowMinutes < closingMinutes) {
      targetHour = closing.hour;
      targetMinute = closing.minute;
      targetOffset = 0;
    } else {
      targetHour = opening.hour;
      targetMinute = opening.minute;
      targetOffset = 1;
    }
  } else if (nowMinutes < closingMinutes) {
    targetHour = closing.hour;
    targetMinute = closing.minute;
    targetOffset = 0;
  } else if (nowMinutes < openingMinutes) {
    targetHour = opening.hour;
    targetMinute = opening.minute;
    targetOffset = 0;
  } else {
    targetHour = closing.hour;
    targetMinute = closing.minute;
    targetOffset = 1;
  }

  const targetDate = shiftLocalDate(referenceDate, targetOffset, APP_TIMEZONE);
  const targetDateTime = zonedDateTimeToUtcDate(targetDate, targetHour, targetMinute, APP_TIMEZONE);
  const diffMs = targetDateTime.getTime() - referenceDate.getTime();

  if (diffMs > 0) {
    return diffMs;
  }

  return 60 * 1000;
}

export function formatDateShortInSaoPaulo(value: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(toDate(value));
}

export function formatTimeShortInSaoPaulo(value: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(value));
}

export function formatDateTimeShortInSaoPaulo(value: Date | string): string {
  return `${formatDateShortInSaoPaulo(value)} às ${formatTimeShortInSaoPaulo(value)}`;
}
