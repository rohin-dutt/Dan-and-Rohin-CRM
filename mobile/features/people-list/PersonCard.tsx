import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PersonAvatar, SoftCard, StatusDot } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import { personImageUrl } from "@/lib/person-display"
import { formatLastInteraction, statusDotForPerson, statusLabel, statusTone } from "./filters"
import type { Person, Tag } from "@/types"

export function PersonCard({
  person,
  tags,
  onPress,
}: {
  person: Person
  tags: Tag[]
  onPress: () => void
}) {
  const tone = statusTone(person)
  const visibleTags = tags.slice(0, 3)
  const fallbackTags = visibleTags.length
    ? visibleTags
    : [
        ...(person.relationship_type ? [{ id: "relationship", name: person.relationship_type, color: colors.mint, user_id: person.user_id, created_at: person.created_at }] : []),
        ...(person.role ? [{ id: "role", name: person.role, color: "#F2EEFA", user_id: person.user_id, created_at: person.created_at }] : []),
      ].slice(0, 3)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.76} accessibilityRole="button" accessibilityLabel={`Open ${person.name}`}>
      <SoftCard className="mb-3 p-4">
        <View className="flex-row">
          <View className="mr-3 pt-4">
            <StatusDot status={statusDotForPerson(person)} />
          </View>
          <PersonAvatar name={person.name} imageUrl={personImageUrl(person)} size={44} />
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="max-w-[64%]">
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-lg">
                  {person.name}
                </Text>
                {[person.relationship_type, person.company].filter(Boolean).join(" · ") ? (
                  <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="mt-1 text-sm">
                    {[person.relationship_type, person.company].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} numberOfLines={1} className="mt-1 text-sm">
                  {formatLastInteraction(person.last_contacted_at)}
                </Text>
              </View>
              <View className="rounded-xl px-3 py-2" style={{ backgroundColor: tone.bg }}>
                <Text style={{ fontFamily: fonts.medium, color: tone.text }} className="text-sm">
                  {statusLabel(person)}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <View className="mr-3 flex-1 flex-row flex-wrap gap-2">
                {fallbackTags.map((tag, index) => (
                  <View key={`${person.id}-${tag.id}-${index}`} className="rounded-lg px-2 py-1" style={{ backgroundColor: index === 1 ? "#F2EEFA" : index === 2 ? "#FFF3DE" : colors.mint }}>
                    <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="max-w-20 text-xs">
                      {tag.name}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-row items-center">
                <Ionicons name="chevron-forward" size={21} color={colors.muted} />
              </View>
            </View>
          </View>
        </View>
      </SoftCard>
    </TouchableOpacity>
  )
}
