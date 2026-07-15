import type { Ionicons } from "@expo/vector-icons"

// Single source of truth for the Friend/Family/Professional relationship
// categories and the tag each one maps to when a person is saved.
export const RELATIONSHIP_CATEGORIES = [
  { label: "Friend", tagName: "Friend", tagColor: "#16A34A", icon: "people-outline" },
  { label: "Family", tagName: "Family", tagColor: "#2563EB", icon: "home-outline" },
  { label: "Professional", tagName: "Professional", tagColor: "#D97706", icon: "briefcase-outline" },
] as const satisfies ReadonlyArray<{
  label: string
  tagName: string
  tagColor: string
  icon: keyof typeof Ionicons.glyphMap
}>

export type RelationshipCategory = (typeof RELATIONSHIP_CATEGORIES)[number]
export type RelationshipCategoryLabel = RelationshipCategory["label"]

export function findRelationshipCategory(
  label: string | null | undefined,
): RelationshipCategory | null {
  return RELATIONSHIP_CATEGORIES.find((category) => category.label === label) ?? null
}
