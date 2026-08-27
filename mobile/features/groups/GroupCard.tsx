import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import { GroupAvatarStack } from "./GroupAvatarStack"
import type { Group, Person } from "@/types"

export function GroupCard({
  group,
  members,
  onPress,
}: {
  group: Group
  members: Person[]
  onPress: () => void
}) {
  const countLabel = members.length === 1 ? "1 person" : `${members.length} people`

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.76} accessibilityRole="button" accessibilityLabel={`Open ${group.name} group`}>
      <SoftCard className="mb-3 p-4">
        <View className="flex-row items-center">
          <View className="flex-1 pr-3">
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-lg">
              {group.name}
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
              {countLabel}
            </Text>
          </View>
          {members.length > 0 ? <GroupAvatarStack people={members} size={34} max={4} /> : null}
          <View className="ml-2">
            <Ionicons name="chevron-forward" size={21} color={colors.muted} />
          </View>
        </View>
      </SoftCard>
    </TouchableOpacity>
  )
}
