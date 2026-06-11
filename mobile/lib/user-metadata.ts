// Supabase auth user_metadata can carry the display name under several keys
// depending on how the account was created.
export function displayNameFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  return typeof metadata?.full_name === "string"
    ? metadata.full_name
    : typeof metadata?.name === "string"
      ? metadata.name
      : typeof metadata?.display_name === "string"
        ? metadata.display_name
        : ""
}

export function firstNameFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string {
  return displayNameFromMetadata(metadata).trim().split(/\s+/)[0] || "there"
}
