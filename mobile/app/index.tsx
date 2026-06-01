import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Index() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  if (session) {
    return <Redirect href="/(app)/dashboard" />
  }
  return <Redirect href="/(auth)/login" />
}
