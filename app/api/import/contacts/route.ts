import { apiError } from "@/lib/api-errors";
import { authenticateTrustedRequest } from "@/lib/trusted-api-auth";

interface IncomingContact {
  name?: string;
  email?: string | string[];
  tel?: string | string[];
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
  const errors: string[] = [];
  const createdPeople: Array<{ id: string; name: string }> = [];

  for (const contact of contacts) {
    if (!contact.name?.trim()) continue;

    const email = Array.isArray(contact.email) ? contact.email[0] : contact.email;
    const phone = Array.isArray(contact.tel) ? contact.tel[0] : contact.tel;

    const { data: createdPerson, error } = await auth.supabase
      .from("people")
      .insert({
        name: contact.name.trim(),
        email: email ?? null,
        phone: phone ?? null,
        user_id: auth.user.id,
        contact_frequency_days: 30,
      })
      .select("id, name")
      .single();

    if (error) {
      errors.push(`Failed to import "${contact.name}": ${error.message}`);
    } else {
      imported++;
      createdPeople.push({
        id: createdPerson.id,
        name: createdPerson.name,
      });
    }
  }

  return Response.json({ ok: true, imported, errors, createdPeople });
}
