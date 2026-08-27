import type { Interaction as SharedInteraction, Person as SharedPerson } from "@roots/shared"

export type { PersonNote, ImportantMoment, Tag, PersonTag, Settings } from "@roots/shared"

// people.photo_path and interactions.group_id/photo_path exist in the
// database but not in the shared types; they are optional so shared helpers
// keep accepting plain rows.
export type Person = SharedPerson & { photo_path?: string | null }
export type Interaction = SharedInteraction & {
  group_id?: string | null
  photo_path?: string | null
}

export type Group = {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export type GroupMember = {
  group_id: string
  person_id: string
}
