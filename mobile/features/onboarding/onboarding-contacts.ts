import type * as Contacts from "expo-contacts"

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
