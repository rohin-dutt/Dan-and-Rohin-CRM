import { apiError } from "@/lib/api-errors";
import { authenticateTrustedRequest } from "@/lib/trusted-api-auth";

export async function GET(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { supabase, user } = auth;
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
