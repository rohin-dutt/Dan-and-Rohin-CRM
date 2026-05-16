import { apiError } from "@/lib/api-errors";
import {
  authenticateTrustedRequest,
  createServiceRoleClient,
} from "@/lib/trusted-api-auth";

export async function POST(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const adminClient = createServiceRoleClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    auth.user.id
  );

  if (deleteError) {
    return apiError(deleteError.message, 500);
  }

  return Response.json({ ok: true, success: true });
}
