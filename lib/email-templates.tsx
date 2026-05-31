export function weeklyDigestEmail({
  firstName,
  people,
  birthdays,
}: {
  firstName: string
  people: Array<{
    id: string
    name: string
    daysSince: number | null
    reason: "overdue" | "due_this_week"
  }>
  birthdays: Array<{
    name: string
    daysUntil: number
  }>
}): string {
  const styles = `
    body { margin: 0; padding: 0; background-color: #F0EBE1; font-family: system-ui, -apple-system, sans-serif; }
    .wrapper { background-color: #F0EBE1; padding: 40px 16px; }
    .card { background-color: #FFFFFF; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 40px 36px; }
    h1 { color: #7C9A7E; font-size: 22px; font-weight: 700; margin: 0 0 8px; }
    .greeting { color: #1C1917; font-size: 16px; margin: 0 0 24px; }
    h2 { color: #1C1917; font-size: 15px; font-weight: 600; margin: 24px 0 12px; }
    ul { list-style: none; padding: 0; margin: 0 0 16px; }
    li { padding: 10px 0; border-bottom: 1px solid #F0EBE1; color: #1C1917; font-size: 15px; }
    li:last-child { border-bottom: none; }
    a { color: #7C9A7E; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .all-caught-up { color: #1C1917; font-size: 15px; margin: 0 0 16px; }
    .footer { border-top: 1px solid #F0EBE1; margin-top: 32px; padding-top: 24px; color: #78716C; font-size: 13px; line-height: 1.6; }
    .footer a { color: #78716C; }
  `

  const peopleSection =
    people.length > 0
      ? `
        <h2>Here are a few people worth reaching out to this week:</h2>
        <ul>
          ${people
            .map(
              (p) => `
            <li>
              <a href="https://useroots.app/people/${p.id}">${p.name}</a>
              ${p.reason === "overdue" && p.daysSince !== null ? ` — it's been ${p.daysSince} days` : " — worth checking in soon"}
            </li>
          `
            )
            .join("")}
        </ul>
      `
      : ""

  const birthdaySection =
    birthdays.length > 0
      ? `
        <h2>Upcoming birthdays:</h2>
        <ul>
          ${birthdays
            .map(
              (b) =>
                `<li>${b.name}'s birthday is in ${b.daysUntil} day${b.daysUntil === 1 ? "" : "s"}</li>`
            )
            .join("")}
        </ul>
      `
      : ""

  const allCaughtUp =
    people.length === 0 && birthdays.length === 0
      ? `<p class="all-caught-up">You're all caught up this week. Keep it up! 🌱</p>`
      : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your weekly Roots check-in</title>
  <style>${styles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <h1>Roots 🌱</h1>
      <p class="greeting">Hi ${firstName},</p>
      ${peopleSection}
      ${birthdaySection}
      ${allCaughtUp}
      <div class="footer">
        <p>You're receiving this because you have weekly reminders enabled in Roots.</p>
        <p><a href="https://useroots.app/settings">Manage your preferences</a></p>
        <p>— The Roots team</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
