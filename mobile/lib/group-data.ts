import { DeviceEventEmitter } from "react-native"
import { supabase } from "@/lib/supabase"
import type { Interaction } from "@/types"

export const GROUPS_CHANGED_EVENT = "groupsChanged"

// Creates a group and its member links. The two writes are separate Supabase
// calls (same caveat as createPersonWithRelations): a member-insert failure
// leaves an empty group behind, which the user can still edit or delete.
export async function createGroup(input: {
  userId: string
  name: string
  personIds: string[]
}): Promise<string> {
  const { data: created, error: insertError } = await supabase
    .from("groups")
    .insert({ user_id: input.userId, name: input.name.trim() })
    .select("id")
    .single()
  if (insertError) throw insertError

  const groupId = created.id as string
  if (input.personIds.length > 0) {
    const { error: membersError } = await supabase
      .from("group_members")
      .insert(input.personIds.map((personId) => ({ group_id: groupId, person_id: personId })))
    if (membersError) {
      DeviceEventEmitter.emit(GROUPS_CHANGED_EVENT)
      throw membersError
    }
  }

  DeviceEventEmitter.emit(GROUPS_CHANGED_EVENT)
  return groupId
}

// Replaces a group's member list by diffing against the current one, so
// unchanged links keep their original rows.
export async function setGroupMembers(input: {
  groupId: string
  currentPersonIds: string[]
  nextPersonIds: string[]
}): Promise<void> {
  const current = new Set(input.currentPersonIds)
  const next = new Set(input.nextPersonIds)
  const toAdd = input.nextPersonIds.filter((id) => !current.has(id))
  const toRemove = input.currentPersonIds.filter((id) => !next.has(id))

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", input.groupId)
      .in("person_id", toRemove)
    if (removeError) throw removeError
  }

  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from("group_members")
      .insert(toAdd.map((personId) => ({ group_id: input.groupId, person_id: personId })))
    if (addError) throw addError
  }

  DeviceEventEmitter.emit(GROUPS_CHANGED_EVENT)
}

// Deletes the group row only. group_members cascade-delete via the foreign
// key and interactions keep history with group_id set to null (both handled
// by the migration).
export async function deleteGroup(groupId: string): Promise<void> {
  const { error: deleteError } = await supabase.from("groups").delete().eq("id", groupId)
  if (deleteError) throw deleteError
  DeviceEventEmitter.emit(GROUPS_CHANGED_EVENT)
}

// Logs a group hangout as one interaction row per member, each tagged with
// group_id. The group timeline queries by group_id and each member's personal
// timeline by person_id, so both work off the same rows. Reuses the
// create_interaction_and_touch_person RPC per member so follow-up auto-close
// and last_contacted_at behave exactly like an individual chat, then stamps
// group_id on the returned row.
//
// Returns the id of the first row created: a hangout photo is stored once and
// its photo_path set only on that row (dedupeGroupInteractions surfaces it on
// the group timeline), never duplicated across the per-member rows.
export async function logGroupHangout(input: {
  groupId: string
  personIds: string[]
  type: string
  date: string
  notes: string | null
  followUpNeeded: boolean
  followUpDate: string | null
  followUpNote: string | null
}): Promise<{ firstInteractionId: string | null }> {
  let firstInteractionId: string | null = null
  for (const personId of input.personIds) {
    const { data: interactionId, error: rpcError } = await supabase.rpc(
      "create_interaction_and_touch_person",
      {
        p_person_id: personId,
        p_type: input.type,
        p_date: input.date,
        p_notes: input.notes,
        p_follow_up_needed: input.followUpNeeded,
        p_follow_up_date: input.followUpNeeded ? input.followUpDate : null,
        p_follow_up_note: input.followUpNeeded ? input.followUpNote : null,
      },
    )
    if (rpcError) throw rpcError

    const { error: linkError } = await supabase
      .from("interactions")
      .update({ group_id: input.groupId })
      .eq("id", interactionId as string)
    if (linkError) throw linkError

    if (firstInteractionId == null) firstInteractionId = interactionId as string
  }

  DeviceEventEmitter.emit("interactionAdded")
  return { firstInteractionId }
}

// A hangout writes one identical row per member, so the group timeline keeps
// only one entry per (date, type, notes) batch. Only one row of a batch can
// carry a photo_path, so that row wins the dedupe and the photo shows on the
// group timeline no matter the row order.
export function dedupeGroupInteractions(interactions: Interaction[]): Interaction[] {
  const keptIndexByKey = new Map<string, number>()
  const deduped: Interaction[] = []
  for (const interaction of interactions) {
    const key = `${interaction.date}|${interaction.type}|${interaction.notes ?? ""}`
    const keptIndex = keptIndexByKey.get(key)
    if (keptIndex == null) {
      keptIndexByKey.set(key, deduped.length)
      deduped.push(interaction)
    } else if (!deduped[keptIndex].photo_path && interaction.photo_path) {
      deduped[keptIndex] = interaction
    }
  }
  return deduped
}
