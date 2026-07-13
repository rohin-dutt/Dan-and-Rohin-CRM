// Display formatting for date strings coming from Supabase rows.
// Keep these UI-oriented helpers separate from the portable date logic in
// @roots/shared so screens share one implementation.

// Birthdays saved without a known year use this placeholder year; display
// code must render those as month + day only.
export const YEARLESS_BIRTHDAY_YEAR = 1900

export function formatBirthday(value: string | null | undefined): string {
  if (!value) return "Not set"
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  const withYear = date.getFullYear() !== YEARLESS_BIRTHDAY_YEAR
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date)
}

export function formatCompactDate(value: string | null | undefined): string {
  if (!value) return "Not set"
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export function formatTimelineDate(value: string | null | undefined): string {
  if (!value) return "No date"
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export function formatShortMonthDay(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000))
}

// "Today" / "1 day ago" / "12 days ago" / "Not yet" — person detail stat strip.
export function formatDaysAgo(value: string | null | undefined): string {
  const days = daysSince(value)
  if (days == null) return "Not yet"
  if (days === 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

// "Last talked 12 days ago" / "No interaction yet" — dashboard rows.
export function formatLastTalkedLine(value: string | null | undefined): string {
  const days = daysSince(value)
  if (days == null) return "No interaction yet"
  if (days === 0) return "Last talked today"
  return `Last talked ${days} ${days === 1 ? "day" : "days"} ago`
}
