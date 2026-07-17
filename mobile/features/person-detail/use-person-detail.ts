import { useCallback, useMemo, useState } from "react"
import { DeviceEventEmitter } from "react-native"
import { supabase } from "@/lib/supabase"
import { PEOPLE_CHANGED_EVENT } from "@/lib/onboarding-status"
import { useCrmData } from "@/features/crm-data/CrmDataProvider"
import { getFollowUpState, isTouchPoint, todayInputValue } from "@roots/shared"
import { FOLLOW_UP_COMPLETED_TYPE } from "./helpers"

// Person details are selected from the shared CRM snapshot. Mutations keep the
// snapshot current immediately and only perform a full refresh when the server
// may have changed derived fields such as last_contacted_at.
export function usePersonDetail(id: string) {
  const {
    snapshot,
    loading: crmLoading,
    refreshing,
    refreshError,
    refresh,
    updateSnapshot,
  } = useCrmData()
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [followUpUpdating, setFollowUpUpdating] = useState(false)

  const person = useMemo(
    () => snapshot?.people.find((candidate) => candidate.id === id) ?? null,
    [id, snapshot?.people],
  )
  const interactions = useMemo(
    () => snapshot?.interactions.filter((interaction) => interaction.person_id === id) ?? [],
    [id, snapshot?.interactions],
  )
  const personNotes = useMemo(
    () => snapshot?.personNotes.filter((note) => note.person_id === id) ?? [],
    [id, snapshot?.personNotes],
  )
  const importantMoments = useMemo(
    () => snapshot?.importantMoments.filter((moment) => moment.person_id === id) ?? [],
    [id, snapshot?.importantMoments],
  )
  const tags = useMemo(() => {
    if (!snapshot) return []
    const assignedIds = new Set(
      snapshot.personTags
        .filter((link) => link.person_id === id)
        .map((link) => link.tag_id),
    )
    return snapshot.tags.filter((tag) => assignedIds.has(tag.id))
  }, [id, snapshot])

  const deletePerson = useCallback(async (): Promise<boolean> => {
    const { error: deleteError } = await supabase.from("people").delete().eq("id", id)
    if (deleteError) {
      setMutationError(deleteError.message)
      return false
    }

    updateSnapshot((current) => ({
      ...current,
      people: current.people.filter((candidate) => candidate.id !== id),
      interactions: current.interactions.filter((interaction) => interaction.person_id !== id),
      personNotes: current.personNotes.filter((note) => note.person_id !== id),
      importantMoments: current.importantMoments.filter((moment) => moment.person_id !== id),
      personTags: current.personTags.filter((link) => link.person_id !== id),
    }))
    DeviceEventEmitter.emit(PEOPLE_CHANGED_EVENT)
    return true
  }, [id, updateSnapshot])

  const setCachedFollowUpStatus = useCallback(
    (interactionId: string, status: "open" | "done" | "snoozed") => {
      updateSnapshot((current) => ({
        ...current,
        interactions: current.interactions.map((interaction) =>
          interaction.id === interactionId
            ? { ...interaction, follow_up_status: status }
            : interaction,
        ),
      }))
    },
    [updateSnapshot],
  )

  const completeFollowUp = useCallback(
    async (interactionId: string, countAsInteraction: boolean) => {
      if (followUpUpdating) return
      const previousStatus =
        interactions.find((interaction) => interaction.id === interactionId)?.follow_up_status ??
        "open"

      setMutationError(null)
      setCachedFollowUpStatus(interactionId, "done")
      setFollowUpUpdating(true)
      try {
        const { error: updateError } = await supabase
          .from("interactions")
          .update({ follow_up_status: "done" })
          .eq("id", interactionId)
        if (updateError) {
          setCachedFollowUpStatus(interactionId, previousStatus)
          setMutationError(updateError.message)
          return
        }

        if (countAsInteraction) {
          const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
            p_person_id: id,
            p_type: FOLLOW_UP_COMPLETED_TYPE,
            p_date: todayInputValue(),
            p_notes: null,
            p_follow_up_needed: false,
            p_follow_up_date: null,
          })
          if (rpcError) {
            setCachedFollowUpStatus(interactionId, previousStatus)
            setMutationError(rpcError.message)
            return
          }
        }

        await refresh()
      } finally {
        setFollowUpUpdating(false)
      }
    },
    [followUpUpdating, id, interactions, refresh, setCachedFollowUpStatus],
  )

  const deleteFollowUp = useCallback(
    async (interactionId: string) => {
      if (followUpUpdating) return
      setFollowUpUpdating(true)
      setMutationError(null)
      try {
        const { error: updateError } = await supabase
          .from("interactions")
          .update({ follow_up_needed: false, follow_up_status: "open", follow_up_date: null })
          .eq("id", interactionId)
        if (updateError) {
          setMutationError(updateError.message)
          return
        }

        updateSnapshot((current) => ({
          ...current,
          interactions: current.interactions.map((interaction) =>
            interaction.id === interactionId
              ? {
                  ...interaction,
                  follow_up_needed: false,
                  follow_up_status: "open",
                  follow_up_date: null,
                }
              : interaction,
          ),
        }))
      } finally {
        setFollowUpUpdating(false)
      }
    },
    [followUpUpdating, updateSnapshot],
  )

  const updatePersonNote = useCallback(
    async (noteId: string, body: string) => {
      const trimmed = body.trim()
      if (!trimmed) return
      const previousBody = personNotes.find((note) => note.id === noteId)?.body

      setMutationError(null)
      updateSnapshot((current) => ({
        ...current,
        personNotes: current.personNotes.map((note) =>
          note.id === noteId ? { ...note, body: trimmed } : note,
        ),
      }))

      const { data, error: noteError } = await supabase
        .from("person_notes")
        .update({ body: trimmed, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .select("*")
        .single()
      if (noteError) {
        if (previousBody != null) {
          updateSnapshot((current) => ({
            ...current,
            personNotes: current.personNotes.map((note) =>
              note.id === noteId ? { ...note, body: previousBody } : note,
            ),
          }))
        }
        setMutationError(noteError.message)
        return
      }

      updateSnapshot((current) => ({
        ...current,
        personNotes: current.personNotes.map((note) => (note.id === noteId ? data : note)),
      }))
    },
    [personNotes, updateSnapshot],
  )

  const deletePersonNote = useCallback(
    async (noteId: string) => {
      const { error: noteError } = await supabase.from("person_notes").delete().eq("id", noteId)
      if (noteError) {
        setMutationError(noteError.message)
        return
      }
      updateSnapshot((current) => ({
        ...current,
        personNotes: current.personNotes.filter((note) => note.id !== noteId),
      }))
    },
    [updateSnapshot],
  )

  const openFollowUps = useMemo(
    () =>
      interactions.filter(
        (interaction) =>
          isTouchPoint(interaction) &&
          interaction.follow_up_needed &&
          getFollowUpState(interaction) !== "done",
      ),
    [interactions],
  )

  const completedFollowUps = useMemo(
    () =>
      interactions.filter(
        (interaction) =>
          isTouchPoint(interaction) &&
          interaction.follow_up_needed &&
          getFollowUpState(interaction) === "done",
      ),
    [interactions],
  )

  const touchPointInteractions = useMemo(
    () => interactions.filter(isTouchPoint),
    [interactions],
  )

  return {
    loading: crmLoading || (!person && refreshing),
    error: mutationError ?? refreshError,
    person,
    personNotes,
    importantMoments,
    tags,
    openFollowUps,
    completedFollowUps,
    touchPointInteractions,
    followUpUpdating,
    deletePerson,
    completeFollowUp,
    deleteFollowUp,
    updatePersonNote,
    deletePersonNote,
  }
}
