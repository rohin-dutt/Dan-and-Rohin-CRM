import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native"
import { supabase } from "@/lib/supabase"
import type { Tag } from "@/types"

const TAG_COLORS = [
  "#7C9A7E",
  "#C17A5A",
  "#6B7280",
  "#2563EB",
  "#D97706",
  "#DC2626",
]

function nextColor(allTags: Tag[]): string {
  const usedColors = new Set(allTags.map((t) => t.color))
  const unused = TAG_COLORS.find((c) => !usedColors.has(c))
  return unused ?? TAG_COLORS[allTags.length % TAG_COLORS.length]
}

type TagPickerProps = {
  selectedTagIds: string[]
  allTags: Tag[]
  onTagsChange: (tagIds: string[]) => void
  userId: string
}

export function TagPicker({ selectedTagIds, allTags, onTagsChange, userId }: TagPickerProps) {
  const [search, setSearch] = useState("")
  const [localTags, setLocalTags] = useState<Tag[]>(allTags)
  const [creating, setCreating] = useState(false)

  const selectedTags = localTags.filter((t) => selectedTagIds.includes(t.id))
  const q = search.trim().toLowerCase()

  const unselected = localTags.filter((t) => !selectedTagIds.includes(t.id))
  const suggestions = q
    ? unselected.filter((t) => t.name.toLowerCase().includes(q))
    : unselected

  const exactMatch = localTags.some((t) => t.name.toLowerCase() === q)
  const canCreate = q.length > 0 && !exactMatch

  function removeTag(tagId: string) {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId))
  }

  function addTag(tagId: string) {
    onTagsChange([...selectedTagIds, tagId])
    setSearch("")
  }

  async function createTag() {
    if (!canCreate || creating) return
    setCreating(true)
    const color = nextColor(localTags)
    const name = search.trim()
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, name, color })
      .select()
      .single()
    setCreating(false)
    if (error || !data) return
    const newTag = data as Tag
    setLocalTags((prev) => [...prev, newTag])
    onTagsChange([...selectedTagIds, newTag.id])
    setSearch("")
  }

  return (
    <View>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {selectedTags.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              onPress={() => removeTag(tag.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: tag.color + "33",
                borderWidth: 1,
                borderColor: tag.color,
                marginRight: 6,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: tag.color }}>{tag.name}</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: tag.color, marginLeft: 4 }}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search input */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search or create tag…"
        placeholderTextColor="#9CA3AF"
        style={{
          height: 40,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E5E0D8",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          fontSize: 14,
          color: "#1C1917",
          marginBottom: 6,
        }}
      />

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: "#E5E0D8", backgroundColor: "#FFFFFF", marginBottom: 6 }}>
          {suggestions.slice(0, 5).map((tag) => (
            <TouchableOpacity
              key={tag.id}
              onPress={() => addTag(tag.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: tag.color,
                marginRight: 8,
              }} />
              <Text style={{ fontSize: 14, color: "#1C1917" }}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Create new tag */}
      {canCreate && (
        <TouchableOpacity
          onPress={createTag}
          disabled={creating}
          style={{
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#F0F9FF",
            borderWidth: 1,
            borderColor: "#BAE6FD",
          }}
        >
          <Text style={{ fontSize: 14, color: "#0284C7", fontWeight: "500" }}>
            {creating ? "Creating…" : `+ Create "${search.trim()}"`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
