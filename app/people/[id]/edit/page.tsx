"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Person } from "@/types/index";

export default function EditPersonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPerson() {
      const { data } = await supabase
        .from("people")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) setPerson(data);
      setLoading(false);
    }

    fetchPerson();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const contactFrequency = Number(formData.get("contact_frequency_days")) || 30;

    const { error: updateError } = await supabase
      .from("people")
      .update({
        name: formData.get("name") as string,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        company: (formData.get("company") as string) || null,
        role: (formData.get("role") as string) || null,
        location: (formData.get("location") as string) || null,
        birthday: (formData.get("birthday") as string) || null,
        how_met: (formData.get("how_met") as string) || null,
        relationship_type: (formData.get("relationship_type") as string) || null,
        relationship_strength: (formData.get("relationship_strength") as string) || null,
        preferred_contact_method: (formData.get("preferred_contact_method") as string) || null,
        contact_frequency_days: contactFrequency,
        notes: (formData.get("notes") as string) || null,
      })
      .eq("id", params.id);

    if (updateError) {
      setError(updateError.message ?? "Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    router.push(`/people/${params.id}`);
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-zinc-500">Loading...</p>
      </AppLayout>
    );
  }

  if (!person) {
    return (
      <AppLayout>
        <Link href="/people" className="text-sm font-medium text-zinc-600">
          ← Back to people
        </Link>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-zinc-600">Person not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <Link
          href={`/people/${person.id}`}
          className="text-sm font-medium text-zinc-600"
        >
          ← Back to {person.name}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Edit {person.name}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Basic info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={person.name}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={person.email ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-zinc-700">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={person.phone ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="company" className="mb-1 block text-sm font-medium text-zinc-700">
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                defaultValue={person.company ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700">
                Role
              </label>
              <input
                id="role"
                name="role"
                type="text"
                defaultValue={person.role ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-zinc-700">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={person.location ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="birthday" className="mb-1 block text-sm font-medium text-zinc-700">
                Birthday
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                defaultValue={person.birthday ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Relationship</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="how_met" className="mb-1 block text-sm font-medium text-zinc-700">
                How you met
              </label>
              <input
                id="how_met"
                name="how_met"
                type="text"
                defaultValue={person.how_met ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="relationship_type" className="mb-1 block text-sm font-medium text-zinc-700">
                Relationship type
              </label>
              <input
                id="relationship_type"
                name="relationship_type"
                type="text"
                placeholder="e.g. Friend, Mentor, Colleague"
                defaultValue={person.relationship_type ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="relationship_strength" className="mb-1 block text-sm font-medium text-zinc-700">
                Relationship strength
              </label>
              <select
                id="relationship_strength"
                name="relationship_strength"
                defaultValue={person.relationship_strength ?? ""}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">Select...</option>
                <option value="New">New</option>
                <option value="Developing">Developing</option>
                <option value="Strong">Strong</option>
                <option value="Trusted">Trusted</option>
              </select>
            </div>
            <div>
              <label htmlFor="preferred_contact_method" className="mb-1 block text-sm font-medium text-zinc-700">
                Preferred contact method
              </label>
              <input
                id="preferred_contact_method"
                name="preferred_contact_method"
                type="text"
                placeholder="e.g. Email, Text, Coffee chat"
                defaultValue={person.preferred_contact_method ?? ""}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label htmlFor="contact_frequency_days" className="mb-1 block text-sm font-medium text-zinc-700">
                Contact every (days)
              </label>
              <input
                id="contact_frequency_days"
                name="contact_frequency_days"
                type="number"
                min="1"
                defaultValue={person.contact_frequency_days}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Notes</h2>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={person.notes ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href={`/people/${person.id}`}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AppLayout>
  );
}
