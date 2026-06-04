import { apiError } from "@/lib/api-errors";
import { authenticateTrustedRequest } from "@/lib/trusted-api-auth";
import { parsePersonalCrmExport } from "@/app/(app)/settings/_lib/import-validation";

export async function POST(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { payload?: unknown; replace_existing?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, "invalid_json");
  }

  if (typeof body.replace_existing !== "boolean") {
    return apiError("replace_existing must be a boolean.", 400);
  }

  try {
    parsePersonalCrmExport(JSON.stringify(body.payload));
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Invalid import payload.",
      400
    );
  }

  const { error } = await auth.supabase.rpc("restore_crm_snapshot", {
    payload: body.payload,
    replace_existing: body.replace_existing,
  });

  if (error) {
    return apiError(error.message, 400);
  }

  return Response.json({ ok: true });
}
