export const CONTACT_FREQUENCY_OPTIONS = [
  { label: "Every week", value: 7 },
  { label: "Every 2 weeks", value: 14 },
  { label: "Every month", value: 30 },
  { label: "Every 3 months", value: 90 },
  { label: "Every 6 months", value: 180 },
  { label: "Once a year", value: 365 },
] as const

export function frequencyLabel(days: number): string {
  return (
    CONTACT_FREQUENCY_OPTIONS.find((option) => option.value === days)?.label ??
    `Every ${days} days`
  )
}

export function formatFrequency(days: number | null | undefined): string {
  if (!days) return "Not set"
  return frequencyLabel(days)
}
