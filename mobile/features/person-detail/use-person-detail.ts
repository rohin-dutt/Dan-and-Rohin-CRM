import { useCallback, useEffect, useMemo, useState } from "react"
import { DeviceEventEmitter } from "react-native"
import { useFocusEffect } from "expo-router"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForPerson } from "@/lib/important-moments"
import { loadPersonNotesForPerson } from "@/lib/person-notes"
import { getFollowUpState, isTouchPoint, todayInputValue } from "@roots/shared"
import { FOLLOW_UP_COMPLETED_TYPE, getTagFromJoin, type PersonTagRow } from "./helpers"
import type { ImportantMoment, Interaction, Person, PersonNote, Tag } from "@/types"

// Data loading and mutations for the person detail screen. Every mutation
// checks the returned Supabase error and surfaces it through `error`.
export function usePersonDetail(id: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [personNotes, setPersonNotes] = useState<PersonNote[]>([])
  const [importantMoments, setImportantMoments] = useState<ImportantMoment[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [followUpUpdating, setFollowUpUpdating] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [personRes, interactionsRes, tagsRes, loadedMoments, loadedNotes] = await Promise.all([
        supabase.from("people").select("*").eq("id", id).single(),
        supabase
          .from("interactions")
          .select("*")
          .eq("person_id", id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("person_tags").select("tag_id, tags(*)").eq("person_id", id),
        loadImportantMomentsForPerson(id),
        loadPersonNotesForPerson(id),
      ])
      if (personRes.error) throw personRes.error
      if (interactionsRes.error) throw interactionsRes.error
      if (tagsRes.error) throw tagsRes.error
      setPerson(personRes.data)
      setInteractions(interactionsRes.data ?? [])
      setImportantMoments(loadedMoments)
      setPersonNotes(loadedNotes)
      setTags(
        ((tagsRes.data ?? []) as PersonTagRow[])
          .map(getTagFromJoin)
          .filter((tag): tag is Tag => tag != null),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load person")
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  // The log-interaction / add-note sheets are modals (no navigation focus
  // change), so refresh on their events too.
  useEffect(() => {
    const interactionSub = DeviceEventEmitter.addListener("interactionAdded", load)
    const noteSub = DeviceEventEmitter.addListener("noteAdded", load)
    return () => {
      interactionSub.remove()
      noteSub.remove()
    }
  }, [load])

  const deletePerson = useCallback(async (): Promise<boolean> => {
    const { error: deleteError } = await supabase.from("people").delete().eq("id", id)
    if (deleteError) {
      setError(deleteError.message)
      return false
    }
    return true
  }, [id])

  // Marks a follow-up done. When `countAsInteraction` is true, also logs a
  // "follow up completed" interaction dated today via the shared RPC, which
  // moves last_contacted_at to today (pushing the next cadence due date to
  // today + contact_frequency_days). When false, last_contacted_at is left
  // untouched so the cadence due date stays where it was.
  const completeFollowUp = useCallback(
    async (interactionId: string, countAsInteraction: boolean) => {
      if (followUpUpdating) return
      setFollowUpUpdating(true)
      try {
        const { error: updateError } = await supabase
          .from("interactions")
          .update({ follow_up_status: "done" })
          .eq("id", interactionId)
        if (updateError) {
          setError(updateError.message)
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
            setError(rpcError.message)
            return
          }
        }
        // Lets the dashboard and people list refresh their buckets right away.
        DeviceEventEmitter.emit("interactionAdded")
        await load()
      } finally {
        setFollowUpUpdating(false)
      }
    },
    [followUpUpdating, id, load],
  )

  // "Delete" permanently removes the follow-up from the interaction without
  // removing the interaction itself from the timeline.
  const deleteFollowUp = useCallback(
    async (interactionId: string) => {
      if (followUpUpdating) return
      setFollowUpUpdating(true)
      try {
        const { error: updateError } = await supabase
          .from("interactions")
          .update({ follow_up_needed: false, follow_up_status: "open", follow_up_date: null })
          .eq("id", interactionId)
        if (updateError) {
          setError(updateError.message)
          return
        }
        await load()
      } finally {
        setFollowUpUpdating(false)
      }
    },
    [followUpUpdating, load],
  )

  const updatePersonNote = useCallback(async (noteId: string, body: string) => {
    const trimmed = body.trim()
    if (!trimmed) return
    const { data, error: noteError } = await supabase
      .from("person_notes")
      .update({ body: trimmed, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .select("*")
      .single()
    if (noteError) {
      setError(noteError.message)
      return
    }
    setPersonNotes((prev) => prev.map((note) => (note.id === noteId ? data : note)))
  }, [])

  const deletePersonNote = useCallback(async (noteId: string) => {
    const { error: noteError } = await supabase.from("person_notes").delete().eq("id", noteId)
    if (noteError) {
      setError(noteError.message)
      return
    }
    setPersonNotes((prev) => prev.filter((note) => note.id !== noteId))
  }, [])

  const openFollowUps = useMemo(
    () => interactions.filter((i) => isTouchPoint(i) && i.follow_up_needed && getFollowUpState(i) !== "done"),
    [interactions],
  )

  const completedFollowUps = useMemo(
    () => interactions.filter((i) => isTouchPoint(i) && i.follow_up_needed && getFollowUpState(i) === "done"),
    [interactions],
  )

  const touchPointInteractions = useMemo(() => interactions.filter(isTouchPoint), [interactions])

  return {
    loading,
    error,
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
