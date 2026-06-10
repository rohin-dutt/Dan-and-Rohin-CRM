import type { Person } from "@/types"

// The schema has no photo column today; this keeps one tolerant lookup in
// case avatar fields are added later instead of casting in every screen.
export function personImageUrl(person: Pick<Person, "id">): string | null {
  const maybe = person as { photo_url?: string | null; avatar_url?: string | null; image_url?: string | null }
  return maybe.photo_url ?? maybe.avatar_url ?? maybe.image_url ?? null
}
