export type BirthdayParts = {
  month: number | null;
  day: number | null;
  year: number | null;
};

type BirthdaySource = {
  birthday_month?: number | null;
  birthday_day?: number | null;
  birthday_year?: number | null;
  birthday?: string | Date | null;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function isValidDateParts(month: number, day: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidBirthdayParts(parts: BirthdayParts): boolean {
  if (parts.month == null && parts.day == null && parts.year == null) return true;
  if (parts.month == null || parts.day == null) return false;
  if (!Number.isInteger(parts.month) || !Number.isInteger(parts.day)) return false;
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31) return false;
  if (parts.year != null && (!Number.isInteger(parts.year) || parts.year < 1)) return false;
  return isValidDateParts(parts.month, parts.day, parts.year ?? 2000);
}

export function normalizeBirthdayParts(parts: BirthdayParts): BirthdayParts {
  const normalized = {
    month: parts.month ?? null,
    day: parts.day ?? null,
    year: parts.year ?? null,
  };
  return isValidBirthdayParts(normalized) ? normalized : { month: null, day: null, year: null };
}

export function parseBirthdayDate(value: string | Date | null | undefined): BirthdayParts {
  if (!value) return { month: null, day: null, year: null };

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { month: null, day: null, year: null };
    return {
      month: value.getMonth() + 1,
      day: value.getDate(),
      year: value.getFullYear(),
    };
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.includes("T") ? value.slice(0, 10) : value);
  if (!dateOnly) return { month: null, day: null, year: null };

  const [, year, month, day] = dateOnly;
  const parts = {
    month: Number(month),
    day: Number(day),
    year: Number(year),
  };
  return isValidBirthdayParts(parts) ? parts : { month: null, day: null, year: null };
}

export function getBirthdayParts(source: BirthdaySource): BirthdayParts {
  const explicit = normalizeBirthdayParts({
    month: source.birthday_month ?? null,
    day: source.birthday_day ?? null,
    year: source.birthday_year ?? null,
  });

  if (explicit.month != null && explicit.day != null) return explicit;
  return parseBirthdayDate(source.birthday);
}

export function birthdayPartsToLegacyDate(parts: BirthdayParts): string | null {
  const normalized = normalizeBirthdayParts(parts);
  if (normalized.month == null || normalized.day == null || normalized.year == null) return null;
  return [
    String(normalized.year).padStart(4, "0"),
    String(normalized.month).padStart(2, "0"),
    String(normalized.day).padStart(2, "0"),
  ].join("-");
}

export function formatBirthdayParts(
  parts: BirthdayParts,
  options: { shortMonth?: boolean } = {}
): string {
  const normalized = normalizeBirthdayParts(parts);
  if (normalized.month == null || normalized.day == null) return "Not set";

  const monthNames = options.shortMonth ? SHORT_MONTH_NAMES : MONTH_NAMES;
  const monthName = monthNames[normalized.month - 1] ?? "";
  const base = `${monthName} ${normalized.day}`;
  return normalized.year != null ? `${base}, ${normalized.year}` : base;
}

export function getNextBirthdayDate(
  parts: BirthdayParts,
  todayValue: Date = new Date()
): { nextDate: Date; daysUntil: number } | null {
  const normalized = normalizeBirthdayParts(parts);
  if (normalized.month == null || normalized.day == null) return null;

  const today = new Date(todayValue);
  if (Number.isNaN(today.getTime())) return null;
  today.setHours(0, 0, 0, 0);

  let nextDate = new Date(today.getFullYear(), normalized.month - 1, normalized.day);
  if (nextDate.getMonth() !== normalized.month - 1) {
    nextDate = new Date(today.getFullYear(), 1, 29);
  }
  if (nextDate < today) {
    nextDate = new Date(today.getFullYear() + 1, normalized.month - 1, normalized.day);
    if (nextDate.getMonth() !== normalized.month - 1) {
      nextDate = new Date(today.getFullYear() + 1, 1, 29);
    }
  }

  return {
    nextDate,
    daysUntil: Math.ceil((nextDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
  };
}
