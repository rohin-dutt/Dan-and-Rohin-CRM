import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [peopleRes, tagsRes] = await Promise.all([
    supabase.from("people").select("*").eq("user_id", user.id),
    supabase.from("tags").select("*").eq("user_id", user.id),
  ]);

  const people = peopleRes.data ?? [];
  const personIds = people.map((p) => p.id);

  let interactions: unknown[] = [];
  let personTags: unknown[] = [];

  if (personIds.length > 0) {
    const [interactionsRes, personTagsRes] = await Promise.all([
      supabase.from("interactions").select("*").in("person_id", personIds),
      supabase.from("person_tags").select("*").in("person_id", personIds),
    ]);
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
