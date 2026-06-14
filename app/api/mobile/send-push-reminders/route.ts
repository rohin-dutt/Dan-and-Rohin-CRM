import { apiError } from "../../../../lib/api-errors.ts";
import {
  isAuthorizedPushReminderRequest,
  runPushReminderJob,
} from "../../../../lib/push-reminders.ts";
import { createServiceRoleClient } from "../../../../lib/trusted-api-auth.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleRequest(request: Request) {
  if (
    !isAuthorizedPushReminderRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET
    )
  ) {
    return apiError("Unauthorized", 401);
  }

  const supabase = createServiceRoleClient();
  const results = await runPushReminderJob({ supabase });
  return Response.json({ ok: true, ...results });
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
