const MAX_IMPORT_EDIT_QUEUE_SIZE = 3
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteParam = string | string[] | undefined

export type ImportEditQueue = {
  ids: string[]
  index: number
}

let pendingImportEditQueue: string[] = []

function singleParam(value: RouteParam) {
  return typeof value === "string" ? value : undefined
}

function hasValidIds(ids: unknown, maxSize = Number.POSITIVE_INFINITY): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= maxSize &&
    ids.every((id) => typeof id === "string" && UUID_PATTERN.test(id)) &&
    new Set(ids).size === ids.length
  )
}

export function serializeImportEditQueue(ids: string[]) {
  return hasValidIds(ids, MAX_IMPORT_EDIT_QUEUE_SIZE) ? JSON.stringify(ids) : null
}

export function parseImportEditQueue(input: {
  currentPersonId: string
  serializedIds: RouteParam
  rawIndex: RouteParam
}): ImportEditQueue | null {
  const serializedIds = singleParam(input.serializedIds)
  const rawIndex = singleParam(input.rawIndex)
  if (!serializedIds || rawIndex == null) return null

  try {
    const ids: unknown = JSON.parse(serializedIds)
    const index = Number(rawIndex)
    if (!hasValidIds(ids, MAX_IMPORT_EDIT_QUEUE_SIZE) || !Number.isInteger(index) || index < 0 || index >= ids.length) {
      return null
    }
    if (ids[index] !== input.currentPersonId) return null
    return { ids, index }
  } catch {
    return null
  }
}

export function setPendingImportEditQueue(ids: string[]) {
  if (!hasValidIds(ids)) {
    pendingImportEditQueue = []
    return false
  }

  pendingImportEditQueue = [...ids]
  return true
}

export function clearPendingImportEditQueue() {
  pendingImportEditQueue = []
}

export function parsePendingImportEditQueue(input: {
  currentPersonId: string
  rawQueueFlag: RouteParam
  rawIndex: RouteParam
}): ImportEditQueue | null {
  if (singleParam(input.rawQueueFlag) !== "1") return null

  const rawIndex = singleParam(input.rawIndex)
  if (rawIndex == null) return null

  const index = Number(rawIndex)
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= pendingImportEditQueue.length ||
    pendingImportEditQueue[index] !== input.currentPersonId
  ) {
    return null
  }

  return { ids: [...pendingImportEditQueue], index }
}
