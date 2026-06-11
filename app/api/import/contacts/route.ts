import { apiError } from "@/lib/api-errors";
import { authenticateTrustedRequest } from "@/lib/trusted-api-auth";

interface IncomingContact {
  name?: string;
  email?: string | string[];
  tel?: string | string[];
  duplicate_action?: "create" | "create_anyway" | "update" | "skip";
  existing_person_id?: string;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

export async function POST(request: Request) {
  const auth = await authenticateTrustedRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: { contacts?: IncomingContact[] };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400, "invalid_json");
  }

  const contacts = Array.isArray(body.contacts) ? body.contacts : [];

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    if (!contact.name?.trim()) continue;

    const email = firstValue(contact.email)?.trim() || null;
    const phone = firstValue(contact.tel)?.trim() || null;
    const name = contact.name.trim();
    const action = contact.duplicate_action ?? "create";
    const existingPeopleRes = await auth.supabase
      .from("people")
      .select("id, name, email, phone")
      .eq("user_id", auth.user.id);

    if (existingPeopleRes.error) {
      errors.push(`Failed to check "${name}" for duplicates: ${existingPeopleRes.error.message}`);
      continue;
    }

    const existingPeople = existingPeopleRes.data ?? [];
    const match = existingPeople.find((person) => {
      if (contact.existing_person_id && person.id === contact.existing_person_id) return true;
      if (email && normalize(person.email) === normalize(email)) return true;
      if (phone && normalizePhone(person.phone) === normalizePhone(phone)) return true;
      return normalize(person.name) === normalize(name);
    });

    if (match && action === "skip") {
      skipped++;
      continue;
    }

    if (match && action === "update") {
      const { error } = await auth.supabase
        .from("people")
        .update({
          name,
          email: email ?? match.email ?? null,
          phone: phone ?? match.phone ?? null,
        })
        .eq("user_id", auth.user.id)
        .eq("id", match.id);

      if (error) {
        errors.push(`Failed to update "${name}": ${error.message}`);
      } else {
        updated++;
      }
      continue;
    }

    if (match && action === "create") {
      skipped++;
      continue;
    }

    const { error } = await auth.supabase.from("people").insert({
      name,
      email,
      phone,
      user_id: auth.user.id,
      contact_frequency_days: 90,
    });

    if (error) {
      errors.push(`Failed to import "${contact.name}": ${error.message}`);
    } else {
      imported++;
    }
  }

  return Response.json({ ok: true, imported, updated, skipped, errors });
}
