import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PersonAvatar, SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import { personImageUrl } from "@/lib/person-display"
import { followUpBadgeForPerson, formatLastInteraction } from "./filters"
import type { Person } from "@/types"

export function PersonCard({
  person,
  followUpDate,
  onPress,
}: {
  person: Person
  followUpDate?: string | null
  onPress: () => void
}) {
  const badge = followUpBadgeForPerson(person, followUpDate ?? null)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.76} accessibilityRole="button" accessibilityLabel={`Open ${person.name}`}>
      <SoftCard className="mb-3 p-4">
        <View className="flex-row">
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
                  {formatLastInteraction(person.last_contacted_at, person.name)}
                </Text>
              </View>
              {badge ? (
                <View
                  className="items-center justify-center"
                  style={{ backgroundColor: badge.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}
                >
                  <Text style={{ fontFamily: fonts.medium, color: badge.text, fontSize: 11 }}>{badge.label}</Text>
                </View>
              ) : null}
            </View>

            <View className="mt-3 flex-row items-center justify-end">
              <Ionicons name="chevron-forward" size={21} color={colors.muted} />
            </View>
          </View>
        </View>
      </SoftCard>
    </TouchableOpacity>
  )
}
