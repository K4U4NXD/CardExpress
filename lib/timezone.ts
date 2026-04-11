const APP_TIMEZONE = "America/Sao_Paulo";

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

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
