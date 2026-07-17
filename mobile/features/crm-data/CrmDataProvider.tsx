import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AppState,
  DeviceEventEmitter,
  InteractionManager,
  type AppStateStatus,
} from "react-native"
import { supabase } from "@/lib/supabase"
import { PEOPLE_CHANGED_EVENT } from "@/lib/onboarding-status"
import {
  readCrmSnapshot,
  writeCrmSnapshot,
  type CrmSnapshot,
} from "@/lib/crm-cache"
import { fetchCrmSnapshot } from "@/lib/crm-sync"

const FOREGROUND_REFRESH_AFTER_MS = 5 * 60 * 1000

type CrmDataContextValue = {
  snapshot: CrmSnapshot | null
  loading: boolean
  refreshing: boolean
  refreshError: string | null
  refresh: () => Promise<void>
  updateSnapshot: (updater: (current: CrmSnapshot) => CrmSnapshot) => void
}

const CrmDataContext = createContext<CrmDataContextValue | null>(null)

export function CrmDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<CrmSnapshot | null>(null)
  const [hydrating, setHydrating] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const snapshotRef = useRef<CrmSnapshot | null>(null)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const refreshRequestedRef = useRef(false)
  const lastRefreshAtRef = useRef(0)

  const installSnapshot = useCallback((next: CrmSnapshot) => {
    snapshotRef.current = next
    lastRefreshAtRef.current = Date.parse(next.updatedAt) || Date.now()
    setSnapshot(next)
  }, [])

  const refresh = useCallback((): Promise<void> => {
    if (refreshPromiseRef.current) {
      // A mutation may finish while a launch refresh is still running. Queue
      // one more pass so the shared snapshot cannot settle on pre-mutation data.
      refreshRequestedRef.current = true
      return refreshPromiseRef.current
    }

    const pending = (async () => {
      setRefreshing(true)
      setRefreshError(null)
      try {
        do {
          refreshRequestedRef.current = false
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session) return

          const freshSnapshot = await fetchCrmSnapshot(session)
          installSnapshot(freshSnapshot)
          await writeCrmSnapshot(freshSnapshot).catch(() => null)
        } while (refreshRequestedRef.current)
      } catch (error) {
        setRefreshError(
          error instanceof Error ? error.message : "Could not refresh your Roots data.",
        )
      } finally {
        setRefreshing(false)
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = pending
    return pending
  }, [installSnapshot])

  const updateSnapshot = useCallback(
    (updater: (current: CrmSnapshot) => CrmSnapshot) => {
      const current = snapshotRef.current
      if (!current) return
      const next = { ...updater(current), updatedAt: new Date().toISOString() }
      installSnapshot(next)
      void writeCrmSnapshot(next).catch(() => null)
    },
    [installSnapshot],
  )

  useEffect(() => {
    let cancelled = false
    let interactionTask: ReturnType<typeof InteractionManager.runAfterInteractions> | null = null

    async function hydrate() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) {
        if (!cancelled) setHydrating(false)
        return
      }

      const cached = await readCrmSnapshot(session.user.id).catch(() => null)
      if (cancelled) return
      if (cached) installSnapshot(cached)
      setHydrating(false)

      if (cached) {
        interactionTask = InteractionManager.runAfterInteractions(() => {
          void refresh()
        })
      } else {
        void refresh()
      }
    }

    void hydrate()
    return () => {
      cancelled = true
      interactionTask?.cancel()
    }
  }, [installSnapshot, refresh])

  useEffect(() => {
    const refreshFromChange = () => void refresh()
    const peopleSub = DeviceEventEmitter.addListener(PEOPLE_CHANGED_EVENT, refreshFromChange)
    const interactionSub = DeviceEventEmitter.addListener("interactionAdded", refreshFromChange)
    const noteSub = DeviceEventEmitter.addListener("noteAdded", refreshFromChange)

    return () => {
      peopleSub.remove()
      interactionSub.remove()
      noteSub.remove()
    }
  }, [refresh])

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (
        status === "active" &&
        Date.now() - lastRefreshAtRef.current >= FOREGROUND_REFRESH_AFTER_MS
      ) {
        void refresh()
      }
    }

    const subscription = AppState.addEventListener("change", onAppStateChange)
    return () => subscription.remove()
  }, [refresh])

  return (
    <CrmDataContext.Provider
      value={{
        snapshot,
        loading: hydrating || (!snapshot && refreshing),
        refreshing,
        refreshError,
        refresh,
        updateSnapshot,
      }}
    >
      {children}
    </CrmDataContext.Provider>
  )
}

export function useCrmData(): CrmDataContextValue {
  const value = useContext(CrmDataContext)
  if (!value) throw new Error("useCrmData must be used within CrmDataProvider.")
  return value
}
