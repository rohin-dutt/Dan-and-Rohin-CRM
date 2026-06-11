import { apiError } from "@/lib/api-errors";
import {
  authenticateTrustedRequest,
  createServiceRoleClient,
} from "@/lib/trusted-api-auth";

export async function POST(request: Request) {
  try {
    const auth = await authenticateTrustedRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json().catch(() => null);
    if (body?.confirm !== "DELETE") {
      return apiError("Account deletion requires explicit confirmation.", 400);
    }

    await auth.supabase
      .from("push_tokens")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id);

    const adminClient = createServiceRoleClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      auth.user.id
    );

    if (deleteError) {
      return apiError(deleteError.message, 500);
    }

    return Response.json({ ok: true, success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
    ) {
      return apiError(
        "Account deletion is not configured on this server. Set SUPABASE_SERVICE_ROLE_KEY.",
        500
      );
    }

    return apiError(
      error instanceof Error ? error.message : "Account deletion failed.",
      500
    );
  }
}
