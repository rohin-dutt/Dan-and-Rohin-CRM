const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDisplayDate(value: string | Date): Date {
  if (typeof value !== "string") return value;

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value);
  if (!dateOnlyMatch) return new Date(value);

  const [, year, month, day] = dateOnlyMatch;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return new Date(Number.NaN);
  }

  return date;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "Never";
  const normalized =
    typeof value === "string" && value.includes("T") ? value.slice(0, 10) : value;
  const date = parseDisplayDate(normalized);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return "Not set";
  const normalized =
    typeof value === "string" && value.includes("T") ? value.slice(0, 10) : value;
  const date = parseDisplayDate(normalized);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatBirthdayDate(
  value: string | Date | null | undefined
): string {
  if (!value) return "Not set";
  const normalized =
    typeof value === "string" && value.includes("T") ? value.slice(0, 10) : value;
  const date = parseDisplayDate(normalized);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateString(value: string): Date | null {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

export function formatFullDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function todayInputValue(): string {
  return toLocalDateString(new Date());
}
