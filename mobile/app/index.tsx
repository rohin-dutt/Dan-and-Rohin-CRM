import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Index() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasPeople, setHasPeople] = useState(false)

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        const { count } = await supabase
          .from("people")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
        setHasPeople((count ?? 0) > 0)
      }
      setLoading(false)
    }
    check()
  }, [])

  if (loading) return null
  if (!session) return <Redirect href="/(auth)/login" />
  if (!hasPeople) return <Redirect href="/(app)/onboarding" />
  return <Redirect href="/(app)/(tabs)/dashboard" />
}
