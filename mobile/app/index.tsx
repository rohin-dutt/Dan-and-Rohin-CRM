import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"

export default function Index() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function redirect() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/(auth)/login")
        return
      }

      const { count } = await supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)

      if (count === 0) {
        router.replace("/(app)/onboarding")
      } else {
        router.replace("/(app)/(tabs)/dashboard")
      }
    }
    redirect()
  }, [])

  return null
}
