import type { Interaction as SharedInteraction } from "@roots/shared"

export type { Person, PersonNote, ImportantMoment, Tag, PersonTag, Settings } from "@roots/shared"

// interactions.group_id exists in the database but not in the shared type;
// it is optional so shared helpers keep accepting plain interactions.
export type Interaction = SharedInteraction & { group_id?: string | null }

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
