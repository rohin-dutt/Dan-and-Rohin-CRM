import { useCallback, useEffect, useMemo, useState } from "react"
import { DeviceEventEmitter, Share, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { EmptyPanel, IconTile, PersonAvatar, SectionTitle, SoftCard, StatusDot } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForUser } from "@/lib/important-moments"
import { loadPersonNotesForPeople } from "@/lib/person-notes"
import { personImageUrl } from "@/lib/person-display"
import { firstNameFromMetadata } from "@/lib/user-metadata"
import { formatLastTalkedLine, formatShortMonthDay } from "@/lib/format-dates"
import type { ImportantMoment, Person, PersonNote, Settings } from "@/types"
import { colors, fonts } from "@/constants/theme"
import { getTotalContacts, getTotalInteractions, isTouchPoint } from "@roots/shared"
import {
  buildDashboardModel,
  DASHBOARD_INTERACTION_COLUMNS,
  statusDotForPerson,
  type DashboardInteraction,
} from "@/features/dashboard/derive"
import { MetricCard, SummaryDivider, SummaryStat } from "@/features/dashboard/components"

function getGreeting(firstName: string): string {
  const hour = new Date().getHours()
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return `${time}, ${firstName}`
}

export default function DashboardScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [interactions, setInteractions] = useState<DashboardInteraction[]>([])
  const [personNotes, setPersonNotes] = useState<PersonNote[]>([])
  const [importantMoments, setImportantMoments] = useState<ImportantMoment[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [firstName, setFirstName] = useState("there")

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user.id
      setFirstName(firstNameFromMetadata(session.user.user_metadata))

      const [peopleRes, settingsRes, loadedMoments] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", userId),
        supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
        loadImportantMomentsForUser(userId),
      ])

      if (peopleRes.error) throw peopleRes.error
      const loadedPeople = peopleRes.data ?? []
      setPeople(loadedPeople)
      setSettings(settingsRes.data ?? null)
      setImportantMoments(loadedMoments)

      if (loadedPeople.length > 0) {
        const personIds = loadedPeople.map((person) => person.id)
        const [{ data: loadedInteractions, error: interactionsError }, loadedNotes] = await Promise.all([
          supabase
            .from("interactions")
            .select(DASHBOARD_INTERACTION_COLUMNS)
            .in("person_id", personIds),
          loadPersonNotesForPeople(personIds),
        ])
        if (interactionsError) throw interactionsError
        setInteractions(loadedInteractions ?? [])
        setPersonNotes(loadedNotes)
      } else {
        setInteractions([])
        setPersonNotes([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.")
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  useEffect(() => {
    const noteSub = DeviceEventEmitter.addListener("noteAdded", load)
    const interactionSub = DeviceEventEmitter.addListener("interactionAdded", load)
    return () => {
      noteSub.remove()
      interactionSub.remove()
    }
  }, [load])

  const dashboard = useMemo(
    () => buildDashboardModel({ people, interactions, personNotes, importantMoments }),
    [importantMoments, interactions, people, personNotes],
  )

  const inviteFriend = useCallback(async () => {
    try {
      await Share.share({
        message:
          "Hey! I've been using Roots to stay close to the people who matter most to me. Thought you might like it — check it out at useroots.app",
      })
    } catch {
      // user dismissed share sheet
    }
  }, [])

  if (loading) return <LoadingState />

  return (
    <Screen>
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-start">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                style={{ fontFamily: fonts.heading, color: colors.forest }}
                className="text-[32px] leading-[38px]"
              >
                Roots
              </Text>
              <View className="ml-2 mt-1">
                <Ionicons name="leaf-outline" size={24} color={colors.sage} />
              </View>
            </View>
            <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-1 text-[15px]">
              {getGreeting(firstName)}
            </Text>
            {settings?.current_streak ? (
              <Text style={{ fontFamily: fonts.medium, color: colors.amber }} className="mt-1 text-sm">
                {settings.current_streak} day streak 🔥
              </Text>
            ) : (
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                Start your streak — log a chat today 🌱
              </Text>
            )}
            <TouchableOpacity
              onPress={inviteFriend}
              accessibilityRole="button"
              accessibilityLabel="Invite a friend"
              activeOpacity={0.76}
              className="mt-3 flex-row items-center rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
            >
              <Ionicons name="share-outline" size={18} color={colors.forest} />
              <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="ml-2 flex-1 text-sm">
                Invite a friend
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {error ? (
        <View className="px-5">
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {people.length === 0 ? (
        <EmptyPanel
          title="No people yet"
          body="Add someone you want to stay in touch with to start building your relationship dashboard."
        />
      ) : (
        <>
          <View className="mt-5 flex-row gap-3 px-5">
            <MetricCard
              icon="alert-circle"
              value={dashboard.overdueList.length}
              label="Overdue"
              onPress={() => router.push("/people?status=overdue")}
            />
            <MetricCard
              icon="time"
              value={dashboard.dueThisWeekList.length}
              label="Due This Week"
              tone="amber"
              onPress={() => router.push("/people?status=due_this_week")}
            />
            <MetricCard
              icon="calendar-outline"
              value={dashboard.comingUpList.length}
              label="Coming Up"
              tone="blue"
              onPress={() => router.push("/people?status=coming_up")}
            />
          </View>

          <SoftCard className="mx-5 mt-5 p-5">
            <SectionTitle
              title="People to follow up with"
              actionLabel="View all"
              onAction={() => router.push("/people?status=overdue&status=due_this_week")}
            />
            {dashboard.followUps.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                No follow-ups need attention right now.
              </Text>
            ) : (
              dashboard.followUps.map((person, index) => (
                <View key={person.id}>
                  {index > 0 ? <View className="my-4 h-px bg-stone-200" /> : null}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${person.name}`}
                    onPress={() => router.push(`/people/${person.id}`)}
                    activeOpacity={0.76}
                    className="flex-row items-center"
                  >
                    <View className="mr-3 items-center">
                      <StatusDot status={statusDotForPerson(person)} />
                    </View>
                    <PersonAvatar name={person.name} imageUrl={personImageUrl(person)} size={44} />
                    <View className="ml-4 flex-1">
                      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                        {person.name}
                      </Text>
                      {(person.relationship_type ?? person.company) ? (
                        <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-0.5 text-sm">
                          {person.relationship_type ?? person.company}
                        </Text>
                      ) : null}
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                        {formatLastTalkedLine(person.last_contacted_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
            {dashboard.followUpExtraCount > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${dashboard.followUpExtraCount} more follow-ups`}
                onPress={() => router.push("/people?status=overdue&status=due_this_week")}
                className="mt-4"
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                  {dashboard.followUpExtraCount} more
                </Text>
              </TouchableOpacity>
            ) : null}
          </SoftCard>

          <SoftCard className="mx-5 mt-5 p-4">
            <SectionTitle title="Upcoming moments" actionLabel="View all" onAction={() => router.push("/people?moments=upcoming")} />
            {dashboard.upcomingMoments.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                No birthdays or important moments in the next two weeks.
              </Text>
            ) : (
              dashboard.upcomingMoments.slice(0, 3).map((moment, index) => (
                <TouchableOpacity
                  key={moment.id}
                  onPress={() => router.push(`/people/${moment.person.id}`)}
                  className={`flex-row items-center ${index > 0 ? "mt-5" : ""}`}
                >
                  <IconTile
                    icon={moment.kind === "birthday" ? "calendar-outline" : "sparkles-outline"}
                    color={index === 0 ? colors.danger : index === 1 ? colors.purple : colors.amber}
                    background={index === 0 ? "#FDECE8" : index === 1 ? "#F2EEFA" : "#FFF3DE"}
                    size={38}
                  />
                  <View className="ml-3 flex-1">
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-base">
                      {moment.person.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                      {moment.label} - {moment.daysUntil === 0 ? "Today" : `In ${moment.daysUntil} days`} - {formatShortMonthDay(moment.sourceDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            {dashboard.upcomingMoments.length > 3 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${dashboard.upcomingMoments.length - 3} more upcoming moments`}
                onPress={() => router.push("/people?moments=upcoming")}
                className="mt-4"
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                  {dashboard.upcomingMoments.length - 3} more
                </Text>
              </TouchableOpacity>
            ) : null}
          </SoftCard>

          <SoftCard className="mx-5 mt-5 p-4">
            <SectionTitle title="Recent notes" />
            {dashboard.recentNotes.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                Notes you log will appear here.
              </Text>
            ) : (
              dashboard.recentNotes.map(({ note, person }, index) => (
                <View key={note.id} className={index > 0 ? "mt-5 border-t border-stone-200 pt-5" : ""}>
                  <TouchableOpacity
                    onPress={() => person && router.push(`/people/${person.id}`)}
                    activeOpacity={0.76}
                    className="flex-row"
                  >
                    <IconTile icon="document-text-outline" color={index === 0 ? colors.forest : colors.amber} background={index === 0 ? colors.mint : "#FFF3DE"} size={38} />
                    <View className="ml-3 flex-1">
                      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-base">
                        {person ? `Note with ${person.name}` : "Recent note"}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} numberOfLines={2} className="mt-1 text-sm leading-5">
                        {note.body}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm">
                        {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(note.note_date ? `${note.note_date}T12:00:00` : note.created_at))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </SoftCard>

          <SoftCard className="mx-5 mt-5 p-5">
            <SectionTitle title="Your Roots Stats" />
            <View className="flex-row items-start">
              <SummaryStat icon="people" value={String(getTotalContacts(people))} label="Total contacts" />
              <SummaryDivider />
              <SummaryStat icon="chatbubble" value={String(getTotalInteractions(interactions.filter(isTouchPoint)))} label="Interactions logged" />
              <SummaryDivider />
              <SummaryStat icon="golf" value={dashboard.onTimeRate == null ? "-" : `${dashboard.onTimeRate}%`} label="On-time outreach" />
              <SummaryDivider />
              <SummaryStat
                icon="star"
                value={dashboard.mostContacted?.name.split(/\s+/).slice(0, 2).join(" ") ?? "-"}
                label="Most contacted"
              />
            </View>
          </SoftCard>
        </>
      )}
    </Screen>
  )
}
