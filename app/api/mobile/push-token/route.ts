import { apiError } from "@/lib/api-errors";
import {
  authenticateTrustedRequest,
  createServiceRoleClient,
} from "@/lib/trusted-api-auth";

type PushTokenBody = {
  token?: unknown;
  provider?: unknown;
  platform?: unknown;
  app_install_id?: unknown;
  device_name?: unknown;
  app_version?: unknown;
  build_number?: unknown;
  environment?: unknown;
  notification_timezone?: unknown;
};

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validTimezoneOrNull(value: unknown) {
  const timezone = stringOrNull(value);
  if (!timezone) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<PushTokenBody | Response> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return apiError("Request body must be an object.", 400);
    }
    return body as PushTokenBody;
  } catch {
    return apiError("Invalid JSON body.", 400, "invalid_json");
  }
}

export async function POST(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await readBody(request);
  if (body instanceof Response) {
    return body;
  }

  const token = stringOrNull(body.token);
  if (!token) {
    return apiError("Push token is required.", 400);
  }

  const platform = stringOrNull(body.platform) ?? "ios";
  if (platform !== "ios" && platform !== "android") {
    return apiError("Unsupported push token platform.", 400);
  }

  const provider = stringOrNull(body.provider) ?? "expo";
  if (provider !== "expo" && provider !== "apns") {
    return apiError("Unsupported push token provider.", 400);
  }

  const adminClient = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .from("push_tokens")
    .upsert(
      {
        user_id: auth.user.id,
        token,
        provider,
        platform,
        app_install_id: stringOrNull(body.app_install_id),
        device_name: stringOrNull(body.device_name),
        app_version: stringOrNull(body.app_version),
        build_number: stringOrNull(body.build_number),
        environment: stringOrNull(body.environment) ?? "development",
        status: "active",
        last_seen_at: now,
        revoked_at: null,
      },
      { onConflict: "token" }
    )
    .select("id, status, last_seen_at")
    .single();

  if (error) {
    return apiError(error.message, 400);
  }

  const timezone = validTimezoneOrNull(body.notification_timezone);
  if (timezone) {
    const { error: timezoneError } = await adminClient
      .from("settings")
      .upsert(
        {
          user_id: auth.user.id,
          notification_timezone: timezone,
        },
        { onConflict: "user_id" }
      );

    if (timezoneError) {
      return apiError(timezoneError.message, 400);
    }
  }

  return Response.json({ ok: true, push_token: data });
}

export async function GET(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const token = stringOrNull(searchParams.get("token"));
  const appInstallId = stringOrNull(searchParams.get("app_install_id"));

  if (!token && !appInstallId) {
    return Response.json({ ok: true, active: false, push_token: null });
  }

  const adminClient = createServiceRoleClient();
  let query = adminClient
    .from("push_tokens")
    .select("id, status, last_seen_at")
    .eq("user_id", auth.user.id)
    .eq("status", "active");

  query = token ? query.eq("token", token) : query.eq("app_install_id", appInstallId);

  const { data, error } = await query.maybeSingle();
  if (error) {
    return apiError(error.message, 400);
  }

  return Response.json({ ok: true, active: Boolean(data), push_token: data ?? null });
}

export async function DELETE(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await readBody(request);
  if (body instanceof Response) {
    return body;
  }

  const token = stringOrNull(body.token);
  const appInstallId = stringOrNull(body.app_install_id);
  if (!token && !appInstallId) {
    return apiError("Push token or app install id is required.", 400);
  }

  const adminClient = createServiceRoleClient();
  let query = adminClient
    .from("push_tokens")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.user.id);

  query = token ? query.eq("token", token) : query.eq("app_install_id", appInstallId);
  const { error } = await query;

  if (error) {
    return apiError(error.message, 400);
  }

  return Response.json({ ok: true });
}
