import { useMemo, useState } from "react"
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { PersonAvatar, SearchBox } from "@/components/RootsUI"
import { supabase } from "@/lib/supabase"
import { createPersonWithRelations, PersonRelationsError } from "@/lib/people-data"
import { colors, fonts, singleLineTextInputStyle } from "@/constants/theme"
import { RELATIONSHIP_CATEGORIES, type RelationshipCategoryLabel } from "@/constants/categories"
import { useCrmData } from "@/features/crm-data/CrmDataProvider"
import type { Person } from "@/types"

// Searchable people list with multi-select checkmarks, plus an inline
// "+ Add someone new" flow (name + relationship type) that saves the person
// to Roots and selects them here in one step. Renders plain views so the
// parent screen or sheet owns scrolling.
export function PeopleMultiSelect({
  selectedIds,
  onToggle,
}: {
  selectedIds: string[]
  onToggle: (personId: string) => void
}) {
  const { snapshot, loading } = useCrmData()
  const people = useMemo(
    () => [...(snapshot?.people ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [snapshot?.people],
  )

  const [search, setSearch] = useState("")
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCategory, setNewCategory] = useState<RelationshipCategoryLabel | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return people
    return people.filter((person) => person.name.toLowerCase().includes(normalized))
  }, [people, search])

  const selectedPeople = useMemo(
    () => people.filter((person) => selectedSet.has(person.id)),
    [people, selectedSet],
  )

  function startAddNew() {
    setNewName(search.trim())
    setNewCategory(null)
    setCreateError(null)
    setAddingNew(true)
  }

  async function handleCreatePerson() {
    if (creating) return
    if (!newName.trim()) {
      setCreateError("Name is required")
      return
    }
    if (!newCategory) {
      setCreateError("Please select a relationship type.")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      let personId: string
      try {
        personId = await createPersonWithRelations({
          userId: session.user.id,
          person: {
            name: newName.trim(),
            relationship_type: newCategory,
            contact_frequency_days: 90,
          },
          categoryLabel: newCategory,
        })
      } catch (cause) {
        // The person row exists; only the relationship tag failed. Still
        // usable as a group member, so select them and move on.
        if (cause instanceof PersonRelationsError) {
          personId = cause.personId
        } else {
          throw cause
        }
      }

      onToggle(personId)
      setAddingNew(false)
      setSearch("")
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to add person")
    } finally {
      setCreating(false)
    }
  }

  return (
    <View>
      {selectedPeople.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {selectedPeople.map((person) => (
            <TouchableOpacity
              key={person.id}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${person.name} from selection`}
              onPress={() => onToggle(person.id)}
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.mint }}
            >
              <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                {person.name}
              </Text>
              <Ionicons name="close-circle" size={16} color={colors.forest} style={{ marginLeft: 5 }} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <SearchBox className="h-11">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search your people"
          placeholderTextColor="#777A83"
          className="ml-3 flex-1 text-warm-black"
          style={[singleLineTextInputStyle, { fontFamily: fonts.body }]}
          accessibilityLabel="Search people to add"
        />
      </SearchBox>

      {addingNew ? (
        <View className="mt-3 rounded-2xl border border-stone-200 bg-white p-4">
          <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
            Add someone new
          </Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-xs leading-4">
            They&apos;ll be added to your Roots and this group.
          </Text>

          {createError ? (
            <Text
              style={{
                fontFamily: fonts.body,
                color: "#B91C1C",
                fontSize: 13,
                backgroundColor: "#FEF2F2",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginTop: 10,
              }}
            >
              {createError}
            </Text>
          ) : null}

          <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 mt-3 text-sm">
            Name <Text style={{ color: "#B91C1C" }}>*</Text>
          </Text>
          <TextInput
            accessibilityLabel="New person name"
            value={newName}
            onChangeText={setNewName}
            placeholder="Alex Taylor"
            placeholderTextColor="#8F96A3"
            autoCapitalize="words"
            className="rounded-xl border border-stone-200 bg-white px-3"
            style={[singleLineTextInputStyle, { fontFamily: fonts.body, color: colors.ink }]}
          />

          <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 mt-3 text-sm">
            Relationship type <Text style={{ color: "#B91C1C" }}>*</Text>
          </Text>
          <View className="flex-row overflow-hidden rounded-xl border border-stone-200">
            {RELATIONSHIP_CATEGORIES.map((cat, index) => {
              const selected = newCategory === cat.label
              return (
                <TouchableOpacity
                  key={cat.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Relationship type ${cat.label}`}
                  onPress={() => {
                    setNewCategory(cat.label)
                    setCreateError(null)
                  }}
                  className={`min-h-[44px] flex-1 flex-row items-center justify-center px-1 ${index > 0 ? "border-l border-stone-200" : ""}`}
                  style={{ backgroundColor: selected ? colors.forest : "white" }}
                >
                  <Ionicons name={cat.icon} size={16} color={selected ? "white" : colors.muted} />
                  <Text
                    style={{ fontFamily: fonts.medium, color: selected ? "white" : colors.ink }}
                    className="ml-1 text-xs"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View className="mt-4 flex-row gap-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel adding someone new"
              disabled={creating}
              onPress={() => setAddingNew(false)}
              className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-3"
            >
              <Text style={{ fontFamily: fonts.semibold, color: colors.muted }} className="text-sm">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save new person"
              disabled={creating}
              onPress={() => void handleCreatePerson()}
              className={`flex-1 items-center justify-center rounded-xl py-3 ${creating ? "opacity-50" : ""}`}
              style={{ backgroundColor: colors.forest }}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontFamily: fonts.semibold, color: "white" }} className="text-sm">
                  Add
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add someone new"
          onPress={startAddNew}
          className="mt-3 flex-row items-center rounded-2xl border border-dashed px-4 py-3"
          style={{ borderColor: colors.forest }}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.forest} />
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="ml-2 text-sm">
            + Add someone new
          </Text>
        </TouchableOpacity>
      )}

      <View className="mt-3">
        {loading && people.length === 0 ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color={colors.forest} />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="py-4 text-sm">
            No one found matching that name
          </Text>
        ) : (
          filtered.map((person, index) => (
            <PersonSelectRow
              key={person.id}
              person={person}
              selected={selectedSet.has(person.id)}
              isLast={index === filtered.length - 1}
              onPress={() => onToggle(person.id)}
            />
          ))
        )}
      </View>
    </View>
  )
}

function PersonSelectRow({
  person,
  selected,
  isLast,
  onPress,
}: {
  person: Person
  selected: boolean
  isLast: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${selected ? "Remove" : "Add"} ${person.name}`}
      onPress={onPress}
      activeOpacity={0.76}
      className={`flex-row items-center py-3 ${isLast ? "" : "border-b border-stone-100"}`}
    >
      <PersonAvatar name={person.name} size={40} photoPath={person.photo_path ?? null} />
      <View className="ml-3 flex-1">
        <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} numberOfLines={1} className="text-base">
          {person.name}
        </Text>
        {person.relationship_type ? (
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} numberOfLines={1} className="mt-0.5 text-xs">
            {person.relationship_type}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={24}
        color={selected ? colors.forest : "#C8C5BE"}
      />
    </TouchableOpacity>
  )
}
