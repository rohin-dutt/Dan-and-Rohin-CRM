export const PRESET_TAGS = [
  { name: "Family", color: "#2563EB" },
  { name: "Friend", color: "#16A34A" },
  { name: "Close Friend", color: "#7C3AED" },
  { name: "Colleague", color: "#D97706" },
  { name: "Mentor", color: "#0891B2" },
  { name: "Recruiter", color: "#DB2777" },
  { name: "University", color: "#6366F1" },
  { name: "Work", color: "#EA580C" },
  { name: "High Priority", color: "#DC2626" },
  { name: "Reconnect", color: "#059669" },
];

export const CUSTOM_TAG_COLORS = [
  "#2563EB",
  "#16A34A",
  "#7C3AED",
  "#D97706",
  "#DC2626",
  "#DB2777",
  "#0891B2",
  "#EA580C",
];

export function getTrimmedFormValue(formData: FormData, key: string): string {
  return ((formData.get(key) as string | null) ?? "").trim();
}

export function getOptionalFormValue(
  formData: FormData,
  key: string
): string | null {
  const value = getTrimmedFormValue(formData, key);
  return value === "" ? null : value;
}
