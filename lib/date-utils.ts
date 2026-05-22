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

export function todayInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
