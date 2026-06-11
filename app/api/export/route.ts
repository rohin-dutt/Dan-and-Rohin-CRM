import { apiError } from "@/lib/api-errors";
import { authenticateTrustedRequest } from "@/lib/trusted-api-auth";
import { isTouchPoint } from "@roots/shared";

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
  let personNotes: unknown[] = [];
  let personTags: unknown[] = [];

  if (personIds.length > 0) {
    const [interactionsRes, personNotesRes, personTagsRes] = await Promise.all([
      supabase.from("interactions").select("*").in("person_id", personIds),
      supabase.from("person_notes").select("*").in("person_id", personIds),
      supabase.from("person_tags").select("*").in("person_id", personIds),
    ]);
    if (interactionsRes.error || personNotesRes.error || personTagsRes.error) {
      return apiError(
        interactionsRes.error?.message ??
          personNotesRes.error?.message ??
          personTagsRes.error?.message ??
          "Export failed.",
        500
      );
    }
    interactions = (interactionsRes.data ?? []).filter(isTouchPoint);
    personNotes = personNotesRes.data ?? [];
    personTags = personTagsRes.data ?? [];
  }

  return Response.json({
    exported_at: new Date().toISOString(),
    people,
    interactions,
    person_notes: personNotes,
    tags: tagsRes.data ?? [],
    person_tags: personTags,
  });
}
