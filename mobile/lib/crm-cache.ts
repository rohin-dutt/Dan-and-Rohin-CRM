import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"
import * as SQLite from "expo-sqlite"
import type {
  ImportantMoment,
  Interaction,
  Person,
  PersonNote,
  PersonTag,
  Settings,
  Tag,
} from "@/types"

const CACHE_DATABASE_NAME = "roots-private-cache.db"
const CACHE_KEY_NAME = "roots:crm-cache-key"
export const CRM_CACHE_SCHEMA_VERSION = 1

export type CrmSnapshot = {
  schemaVersion: typeof CRM_CACHE_SCHEMA_VERSION
  userId: string
  updatedAt: string
  profile: {
    email: string
    displayName: string
    firstName: string
  }
  people: Person[]
  tags: Tag[]
  personTags: PersonTag[]
  interactions: Interaction[]
  personNotes: PersonNote[]
  importantMoments: ImportantMoment[]
  settings: Settings | null
}

type CachedSnapshotRow = {
  user_id: string
  schema_version: number
  payload: string
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null
let memorySnapshot: CrmSnapshot | null = null
let writesBlockedAfterClear = false

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(CACHE_KEY_NAME)
  if (existing) return existing

  // A missing key makes any existing encrypted file unreadable. Remove that
  // orphaned cache before creating a replacement key.
  await SQLite.deleteDatabaseAsync(CACHE_DATABASE_NAME).catch(() => null)
  const created = bytesToHex(await Crypto.getRandomBytesAsync(32))
  await SecureStore.setItemAsync(CACHE_KEY_NAME, created)
  return created
}

async function openEncryptedDatabase(): Promise<SQLite.SQLiteDatabase> {
  const key = await getOrCreateEncryptionKey()
  const database = await SQLite.openDatabaseAsync(CACHE_DATABASE_NAME)

  try {
    // The key contains only hex characters. Checking cipher_version prevents
    // an Expo Go/unencrypted SQLite build from storing private CRM data.
    await database.execAsync(`PRAGMA key = "x'${key}'"`)
    const cipher = await database.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    )
    if (!cipher?.cipher_version) {
      throw new Error("Encrypted CRM cache is unavailable in this app build.")
    }

    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS crm_snapshot (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        user_id TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        payload TEXT NOT NULL
      );
    `)
    return database
  } catch (error) {
    await database.closeAsync().catch(() => null)
    throw error
  }
}

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openEncryptedDatabase().catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isCrmSnapshot(value: unknown, userId: string): value is CrmSnapshot {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== CRM_CACHE_SCHEMA_VERSION || value.userId !== userId) return false
  if (typeof value.updatedAt !== "string" || !isRecord(value.profile)) return false
  if (
    typeof value.profile.email !== "string" ||
    typeof value.profile.displayName !== "string" ||
    typeof value.profile.firstName !== "string"
  ) {
    return false
  }

  if (
    !Array.isArray(value.people) ||
    !Array.isArray(value.tags) ||
    !Array.isArray(value.personTags) ||
    !Array.isArray(value.interactions) ||
    !Array.isArray(value.personNotes) ||
    !Array.isArray(value.importantMoments) ||
    (value.settings !== null && !isRecord(value.settings))
  ) {
    return false
  }

  const peopleAreOwned = value.people.every(
    (person) =>
      isRecord(person) && typeof person.id === "string" && person.user_id === userId,
  )
  const tagsAreOwned = value.tags.every(
    (tag) => isRecord(tag) && typeof tag.id === "string" && tag.user_id === userId,
  )
  const notesAreOwned = value.personNotes.every(
    (note) => isRecord(note) && typeof note.person_id === "string" && note.user_id === userId,
  )
  const momentsAreOwned = value.importantMoments.every(
    (moment) =>
      isRecord(moment) && typeof moment.person_id === "string" && moment.user_id === userId,
  )
  const settingsAreOwned = value.settings === null || value.settings.user_id === userId
  if (!peopleAreOwned || !tagsAreOwned || !notesAreOwned || !momentsAreOwned || !settingsAreOwned) {
    return false
  }

  const personIds = new Set(value.people.map((person) => person.id))
  const tagIds = new Set(value.tags.map((tag) => tag.id))
  return (
    value.interactions.every(
      (interaction) =>
        isRecord(interaction) &&
        typeof interaction.person_id === "string" &&
        personIds.has(interaction.person_id),
    ) &&
    value.personTags.every(
      (link) =>
        isRecord(link) &&
        typeof link.person_id === "string" &&
        typeof link.tag_id === "string" &&
        personIds.has(link.person_id) &&
        tagIds.has(link.tag_id),
    )
  )
}

export async function readCrmSnapshot(userId: string): Promise<CrmSnapshot | null> {
  // A read is only started after the auth layer has selected an account, so it
  // safely enables persistence for that account after a prior logout clear.
  writesBlockedAfterClear = false
  if (memorySnapshot?.userId === userId) return memorySnapshot

  const database = await getDatabase()
  const row = await database.getFirstAsync<CachedSnapshotRow>(
    "SELECT user_id, schema_version, payload FROM crm_snapshot WHERE id = 1",
  )
  if (
    !row ||
    row.user_id !== userId ||
    row.schema_version !== CRM_CACHE_SCHEMA_VERSION
  ) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(row.payload)
    if (!isCrmSnapshot(parsed, userId)) return null
    memorySnapshot = parsed
    return parsed
  } catch {
    return null
  }
}

export async function writeCrmSnapshot(snapshot: CrmSnapshot): Promise<void> {
  if (writesBlockedAfterClear) return
  if (!isCrmSnapshot(snapshot, snapshot.userId)) {
    throw new Error("Invalid CRM cache snapshot.")
  }

  memorySnapshot = snapshot
  const database = await getDatabase()
  await database.runAsync(
    `INSERT INTO crm_snapshot (id, user_id, schema_version, updated_at, payload)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       schema_version = excluded.schema_version,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
    snapshot.userId,
    snapshot.schemaVersion,
    snapshot.updatedAt,
    JSON.stringify(snapshot),
  )
}

export async function clearCrmCache(): Promise<void> {
  writesBlockedAfterClear = true
  memorySnapshot = null
  const pendingDatabase = databasePromise
  databasePromise = null

  if (pendingDatabase) {
    const database = await pendingDatabase.catch(() => null)
    await database?.closeAsync().catch(() => null)
  }

  await SQLite.deleteDatabaseAsync(CACHE_DATABASE_NAME).catch(() => null)
  await SecureStore.deleteItemAsync(CACHE_KEY_NAME).catch(() => null)
}
