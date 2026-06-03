import type * as Contacts from "expo-contacts"
import type { Person } from "@/types"

export type ImportCandidate = {
  id: string
  name: string
  email: string | null
  phone: string | null
  duplicateReason: string | null
}

export type ContactImportPayload = {
  name: string
  email?: string
  tel?: string
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? ""
}

function firstEmail(values: Contacts.Email[] | undefined) {
  return values?.find((entry) => entry.email?.trim())?.email?.trim() ?? null
}

function firstPhone(values: Contacts.PhoneNumber[] | undefined) {
  return values?.find((entry) => entry.number?.trim())?.number?.trim() ?? null
}

function getDuplicateReason(candidate: ContactImportPayload, people: Person[]) {
  const candidateName = normalize(candidate.name)
  const candidateEmail = normalize(candidate.email)
  const candidatePhone = normalizePhone(candidate.tel)

  const match = people.find((person) => {
    if (candidateEmail && normalize(person.email) === candidateEmail) return true
    if (candidatePhone && normalizePhone(person.phone) === candidatePhone) return true
    return candidateName !== "" && normalize(person.name) === candidateName
  })

  if (!match) return null
  if (candidateEmail && normalize(match.email) === candidateEmail) return "Email matches an existing person"
  if (candidatePhone && normalizePhone(match.phone) === candidatePhone) return "Phone matches an existing person"
  return "Name matches an existing person"
}

export function mapDeviceContact(contact: Contacts.ExistingContact, people: Person[]): ImportCandidate | null {
  const name = contact.name?.trim()
  if (!name) return null

  const payload = {
    name,
    email: firstEmail(contact.emails) ?? undefined,
    tel: firstPhone(contact.phoneNumbers) ?? undefined,
  }

  return {
    id: contact.id,
    name: payload.name,
    email: payload.email ?? null,
    phone: payload.tel ?? null,
    duplicateReason: getDuplicateReason(payload, people),
  }
}

export function toContactImportPayload(candidate: ImportCandidate): ContactImportPayload {
  return {
    name: candidate.name,
    email: candidate.email ?? undefined,
    tel: candidate.phone ?? undefined,
  }
}
