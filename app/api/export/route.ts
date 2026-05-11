import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { apiError } from "@/lib/api-errors";

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op: cannot set cookies in a GET route handler
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return apiError(userError.message, 401);
  }

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const [peopleRes, tagsRes] = await Promise.all([
    supabase.from("people").select("*").eq("user_id", user.id),
    supabase.from("tags").select("*").eq("user_id", user.id),
  ]);

  if (peopleRes.error || tagsRes.error) {
    return apiError(
      peopleRes.error?.message ?? tagsRes.error?.message ?? "Export failed.",
      500
    );
  }

  const people = peopleRes.data ?? [];
  const personIds = people.map((p) => p.id);

  let interactions: unknown[] = [];
  let personTags: unknown[] = [];

  if (personIds.length > 0) {
    const [interactionsRes, personTagsRes] = await Promise.all([
      supabase.from("interactions").select("*").in("person_id", personIds),
      supabase.from("person_tags").select("*").in("person_id", personIds),
    ]);
    if (interactionsRes.error || personTagsRes.error) {
      return apiError(
        interactionsRes.error?.message ??
          personTagsRes.error?.message ??
          "Export failed.",
        500
      );
    }
    interactions = interactionsRes.data ?? [];
    personTags = personTagsRes.data ?? [];
  }

  return Response.json({
    exported_at: new Date().toISOString(),
    people,
    interactions,
    tags: tagsRes.data ?? [],
    person_tags: personTags,
  });
}
