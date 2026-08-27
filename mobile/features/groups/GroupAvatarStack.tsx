import { Text, View } from "react-native"
import { PersonAvatar } from "@/components/RootsUI"
import { personImageUrl } from "@/lib/person-display"
import { colors, fonts } from "@/constants/theme"
import type { Person } from "@/types"

// Overlapping member avatars, messaging-app style. Shows the first `max`
// members plus a "+N" circle when more exist.
export function GroupAvatarStack({
  people,
  size = 36,
  max = 4,
}: {
  people: Person[]
  size?: number
  max?: number
}) {
  const shown = people.slice(0, max)
  const extraCount = people.length - shown.length
  const overlap = Math.round(size * 0.3)

  return (
    <View className="flex-row items-center">
      {shown.map((person, index) => (
        <View
          key={person.id}
          style={{
            marginLeft: index === 0 ? 0 : -overlap,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            borderRadius: (size + 4) / 2,
          }}
        >
          <PersonAvatar name={person.name} size={size} imageUrl={personImageUrl(person)} />
        </View>
      ))}
      {extraCount > 0 ? (
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            marginLeft: -overlap,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            backgroundColor: colors.sand,
          }}
        >
          <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack, fontSize: Math.round(size * 0.32) }}>
            +{extraCount}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
