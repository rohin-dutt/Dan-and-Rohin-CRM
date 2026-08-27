import { useCallback, useMemo, useState } from "react"
import { useCrmData } from "@/features/crm-data/CrmDataProvider"
import {
  dedupeGroupInteractions,
  deleteGroup as deleteGroupRow,
  setGroupMembers,
} from "@/lib/group-data"
import { isTouchPoint } from "@roots/shared"
import type { Interaction, Person } from "@/types"

// Group details are selected from the shared CRM snapshot, mirroring
// usePersonDetail. Mutations write to Supabase and rely on the
// GROUPS_CHANGED_EVENT refresh to bring the snapshot current.
export function useGroupDetail(id: string) {
  const { snapshot, loading: crmLoading, refreshing, refreshError } = useCrmData()
  const [mutationError, setMutationError] = useState<string | null>(null)

  const group = useMemo(
    () => snapshot?.groups.find((candidate) => candidate.id === id) ?? null,
    [id, snapshot?.groups],
  )

  const memberIds = useMemo(
    () =>
      (snapshot?.groupMembers ?? [])
        .filter((member) => member.group_id === id)
        .map((member) => member.person_id),
    [id, snapshot?.groupMembers],
  )

  const members: Person[] = useMemo(() => {
    const idSet = new Set(memberIds)
    return (snapshot?.people ?? [])
      .filter((person) => idSet.has(person.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [memberIds, snapshot?.people])

  // One entry per hangout: the write path creates one identical row per
  // member, so rows sharing (date, type, notes) collapse to one.
  const timelineInteractions: Interaction[] = useMemo(() => {
    const groupInteractions = (snapshot?.interactions ?? []).filter(
      (interaction) => interaction.group_id === id && isTouchPoint(interaction),
    )
    return dedupeGroupInteractions(
      [...groupInteractions].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))),
    )
  }, [id, snapshot?.interactions])

  const deleteGroup = useCallback(async (): Promise<boolean> => {
    setMutationError(null)
    try {
      await deleteGroupRow(id)
      return true
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : "Failed to delete group")
      return false
    }
  }, [id])

  const saveMembers = useCallback(
    async (nextPersonIds: string[]): Promise<boolean> => {
      setMutationError(null)
      try {
        await setGroupMembers({ groupId: id, currentPersonIds: memberIds, nextPersonIds })
        return true
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : "Failed to update members")
        return false
      }
    },
    [id, memberIds],
  )

  return {
    loading: crmLoading || (!group && refreshing),
    error: mutationError ?? refreshError,
    group,
    members,
    memberIds,
    timelineInteractions,
    deleteGroup,
    saveMembers,
  }
}
