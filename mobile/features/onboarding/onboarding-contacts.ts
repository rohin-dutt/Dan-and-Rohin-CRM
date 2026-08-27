import type * as Contacts from "expo-contacts"
import type { RelationshipCategoryLabel } from "@/constants/categories"

// Module-level store for the contacts picked during onboarding. The select
// screen writes here and the categorize screen reads, so the raw device
// contacts never travel through navigation params.
let selectedContacts: Contacts.ExistingContact[] = []

export function setSelectedContacts(contacts: Contacts.ExistingContact[]) {
  selectedContacts = contacts
}

export function getSelectedContacts(): Contacts.ExistingContact[] {
  return selectedContacts
}

export function resetContacts() {
  selectedContacts = []
}

export type CadenceDefaults = Record<RelationshipCategoryLabel, number>

const DEFAULT_CADENCE_DAYS: CadenceDefaults = {
  Friend: 90,
  Family: 30,
  Professional: 180,
}

// Module-level store for the per-category "keep in touch" cadences chosen on
// the cadence-defaults screen. Read by the categorize and manual-add screens
// when saving a person, so the picked defaults survive navigation.
let cadenceDefaults: CadenceDefaults = { ...DEFAULT_CADENCE_DAYS }

export function setCadenceDefaults(defaults: CadenceDefaults) {
  cadenceDefaults = { ...defaults }
}

export function getCadenceDefaults(): CadenceDefaults {
  return cadenceDefaults
}

export function getCadenceDefaultForCategory(category: RelationshipCategoryLabel): number {
  return cadenceDefaults[category]
}

export function resetCadenceDefaults() {
  cadenceDefaults = { ...DEFAULT_CADENCE_DAYS }
}
