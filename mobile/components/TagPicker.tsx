import { useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import type { Tag } from "@roots/shared"
import { singleLineTextInputStyle } from "@/constants/theme"

type TagPickerProps = {
  tags: Tag[]
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
  onCreateTag?: (name: string) => Promise<void>
}

export function TagPicker({ tags, selectedTagIds, onToggle, onCreateTag }: TagPickerProps) {
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const showCreate =
    onCreateTag && search.trim() && !tags.some((t) => t.name.toLowerCase() === search.toLowerCase())

  async function handleCreate() {
    if (!onCreateTag || !search.trim()) return
    setCreating(true)
    await onCreateTag(search.trim())
    setSearch("")
    setCreating(false)
  }

  return (
    <View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search or create tag…"
        className="mb-3 rounded-xl border border-gray-200 bg-white px-3"
        style={singleLineTextInputStyle}
        placeholderTextColor="#9CA3AF"
      />
      <View className="flex-row flex-wrap gap-2">
        {filtered.map((tag) => {
          const selected = selectedTagIds.includes(tag.id)
          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => onToggle(tag.id)}
              className={`rounded-full border px-3 py-1 ${
                selected ? "border-sage bg-sage" : "border-gray-200 bg-white"
              }`}
            >
              <Text className={`text-sm ${selected ? "text-white" : "text-warm-black"}`}>
                {tag.name}
              </Text>
            </TouchableOpacity>
          )
        })}
        {showCreate && (
          <TouchableOpacity
            onPress={handleCreate}
            disabled={creating}
            className="rounded-full border border-dashed border-sage bg-white px-3 py-1"
          >
            <Text className="text-sm text-sage">+ {search.trim()}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
