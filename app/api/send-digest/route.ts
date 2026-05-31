import { Resend } from "resend"
import { createServiceRoleClient } from "@/lib/trusted-api-auth"
import { weeklyDigestEmail } from "@/lib/email-templates"
import { getBirthdayReminders, categorizePeople } from "@/lib/crm-rules"
import { apiError } from "@/lib/api-errors"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError("Unauthorized", 401)
  }

  const supabase = createServiceRoleClient()

  const { data: settings, error: settingsError } = await supabase
    .from("settings")
    .select("user_id, reminder_frequency_days")
    .eq("email_reminders_enabled", true)

  if (settingsError) {
    return apiError(settingsError.message, 500)
  }

  const results = {
    total: settings?.length ?? 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  }

  for (const setting of settings ?? []) {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(setting.user_id)

      if (!userData?.user?.email) {
        results.skipped++
        continue
      }

      const email = userData.user.email
      const firstName =
        userData.user.user_metadata?.first_name ?? email.split("@")[0]

      const { data: people } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", setting.user_id)

      if (!people || people.length === 0) {
        results.skipped++
        continue
      }

      const personIds = people.map((p: { id: string }) => p.id)
      const { data: followUps } = await supabase
        .from("interactions")
        .select("*")
        .in("person_id", personIds)
        .eq("follow_up_needed", true)
        .neq("follow_up_status", "done")

      const { overdue, dueThisWeek } = categorizePeople(
        people,
        new Date(),
        followUps ?? []
      )

      const digestPeople = [
        ...overdue.slice(0, 3).map((p: { id: string; name: string; last_contacted_at: string | null }) => ({
          id: p.id,
          name: p.name.split(" ")[0],
          daysSince: p.last_contacted_at
            ? Math.floor(
                (Date.now() - new Date(p.last_contacted_at).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
          reason: "overdue" as const,
        })),
        ...dueThisWeek.slice(0, 2).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name.split(" ")[0],
          daysSince: null,
          reason: "due_this_week" as const,
        })),
      ].slice(0, 5)

      const allBirthdays = getBirthdayReminders(people, new Date(), 7)
      const birthdayList = allBirthdays
        .slice(0, 3)
        .map(({ person, daysUntil }: { person: { name: string }; daysUntil: number }) => ({
          name: person.name.split(" ")[0],
          daysUntil,
        }))

      if (digestPeople.length === 0 && birthdayList.length === 0) {
        results.skipped++
        continue
      }

      const html = weeklyDigestEmail({
        firstName,
        people: digestPeople,
        birthdays: birthdayList,
      })

      const { error: sendError } = await resend.emails.send({
        from: "Roots <hello@useroots.app>",
        to: email,
        subject: "Your weekly Roots check-in 🌱",
        html,
      })

      if (sendError) {
        results.failed++
      } else {
        results.sent++
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch {
      results.failed++
    }
  }

  return Response.json({ ok: true, ...results })
}
