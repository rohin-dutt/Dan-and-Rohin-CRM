import { createServerClient } from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { apiError } from "./api-errors.ts";

type TrustedAuthSuccess = {
  ok: true;
  source: "bearer" | "cookie";
  supabase: SupabaseClient;
  user: User;
};

type TrustedAuthFailure = {
  ok: false;
  response: Response;
};

export type TrustedAuthResult = TrustedAuthSuccess | TrustedAuthFailure;

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }
  return value;
}

function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return value;
}

function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  return value;
}

function parseBearerToken(authorization: string | null) {
  if (!authorization) return null;

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

function createBearerSupabaseClient(token: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function authenticateWithBearerToken(token: string): Promise<TrustedAuthResult> {
  const supabase = createBearerSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      ok: false,
      response: apiError("Unauthorized", 401),
    };
  }

  return {
    ok: true,
    source: "bearer",
    supabase,
    user,
  };
}

async function authenticateWithCookies(): Promise<TrustedAuthResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: apiError("Unauthorized", 401),
    };
  }

  return {
    ok: true,
    source: "cookie",
    supabase,
    user,
  };
}

export async function authenticateTrustedRequest(
  request: Request
): Promise<TrustedAuthResult> {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    const token = parseBearerToken(authorization);
    if (!token) {
      return {
        ok: false,
        response: apiError("Unauthorized", 401),
      };
    }

    return authenticateWithBearerToken(token);
  }

  return authenticateWithCookies();
}

export function createServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
