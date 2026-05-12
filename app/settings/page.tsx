"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Interaction, Person, PersonTag, Settings, Tag } from "@/types/index";

type ExportPayload = {
  people?: Person[];
  interactions?: Interaction[];
  tags?: Tag[];
  person_tags?: PersonTag[];
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      const [settingsRes, tagsRes] = await Promise.all([
        supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("tags").select("*").eq("user_id", user.id).order("name"),
      ]);

      if (tagsRes.error) {
        setError(tagsRes.error.message);
        setLoading(false);
        return;
      }

      setTags(tagsRes.data ?? []);

      if (settingsRes.error) {
        setError(settingsRes.error.message);
        setLoading(false);
        return;
      }

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setLoading(false);
        return;
      }

      const { data: newRow, error: createError } = await supabase
        .from("settings")
        .insert({
          user_id: user.id,
          reminder_frequency_days: 7,
          email_reminders_enabled: false,
        })
        .select()
        .single();

      if (createError || !newRow) {
        setError(createError?.message ?? "Could not create settings.");
      } else {
        setSettings(newRow);
      }

      setLoading(false);
    }

    loadSettings();
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const reminderDays = Number(formData.get("reminder_frequency_days")) || 7;

    const { error: updateError } = await supabase
      .from("settings")
      .update({
        reminder_frequency_days: reminderDays,
        email_reminders_enabled: false,
      })
      .eq("id", settings.id);

    if (updateError) {
      setError(updateError.message ?? "Failed to save.");
    } else {
      setSettings((prev) =>
        prev ? { ...prev, reminder_frequency_days: reminderDays } : prev
      );
      setSaved(true);
    }

    setSaving(false);
  }

  async function updateTag(tag: Tag) {
    setError(null);
    const { data, error: updateError } = await supabase
      .from("tags")
      .update({ name: tag.name.trim(), color: tag.color })
      .eq("id", tag.id)
      .eq("user_id", tag.user_id)
      .select()
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Failed to update tag.");
      return;
    }

    setTags((prev) => prev.map((item) => (item.id === tag.id ? data : item)));
  }

  async function deleteTag(tagId: string) {
    setError(null);
    const { error: deleteError } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
    setConfirmDeleteTagId(null);
  }

  async function mergeTags() {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) {
      setError("Choose two different tags to merge.");
      return;
    }

    const { error: mergeError } = await supabase.rpc("merge_tags", {
      p_source_tag_id: mergeSourceId,
      p_target_tag_id: mergeTargetId,
    });

    if (mergeError) {
      setError(mergeError.message);
      return;
    }

    setTags((prev) => prev.filter((tag) => tag.id !== mergeSourceId));
    setMergeSourceId("");
    setMergeTargetId("");
  }

  async function parseImportFile(): Promise<ExportPayload> {
    if (!importFile) throw new Error("Choose an export JSON file first.");
    const text = await importFile.text();
    const parsed = JSON.parse(text) as ExportPayload;
    if (!Array.isArray(parsed.people) || !Array.isArray(parsed.tags)) {
      throw new Error("This file does not look like a Personal CRM export.");
    }
    return parsed;
  }

  async function restoreFromExport(replaceExisting: boolean) {
    setImporting(true);
    setImportMessage(null);
    setError(null);

    try {
      const payload = await parseImportFile();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      if (replaceExisting) {
        const { error: peopleDeleteError } = await supabase
          .from("people")
          .delete()
          .eq("user_id", user.id);
        if (peopleDeleteError) throw peopleDeleteError;

        const { error: tagDeleteError } = await supabase
          .from("tags")
          .delete()
          .eq("user_id", user.id);
        if (tagDeleteError) throw tagDeleteError;
      }

      const importedTags = (payload.tags ?? []).map((tag) => ({
        id: tag.id,
        user_id: user.id,
        name: tag.name,
        color: tag.color,
      }));
      const importedPeople = (payload.people ?? []).map((person) => ({
        ...person,
        user_id: user.id,
      }));
      const importedInteractions = payload.interactions ?? [];
      const importedPersonTags = payload.person_tags ?? [];

      if (importedTags.length > 0) {
        const { error: tagsError } = await supabase.from("tags").upsert(importedTags);
        if (tagsError) throw tagsError;
      }
      if (importedPeople.length > 0) {
        const { error: peopleError } = await supabase.from("people").upsert(importedPeople);
        if (peopleError) throw peopleError;
      }
      if (importedInteractions.length > 0) {
        const { error: interactionsError } = await supabase
          .from("interactions")
          .upsert(importedInteractions);
        if (interactionsError) throw interactionsError;
      }
      if (importedPersonTags.length > 0) {
        const { error: personTagsError } = await supabase
          .from("person_tags")
          .upsert(importedPersonTags);
        if (personTagsError) throw personTagsError;
      }

      setImportMessage(
        replaceExisting ? "Restore completed." : "Import completed."
      );
      const { data: refreshedTags } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      setTags(refreshedTags ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <AppLayout>
      <div className="max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Preferences
          </h1>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : error && !settings ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-medium text-red-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-700">
                Settings saved.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-zinc-900">
                  In-app Reminder Cadence
                </h2>
                <label
                  htmlFor="reminder_frequency_days"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  Reminder frequency (days)
                </label>
                <input
                  id="reminder_frequency_days"
                  name="reminder_frequency_days"
                  type="number"
                  min="1"
                  defaultValue={settings?.reminder_frequency_days ?? 7}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Used for in-app dashboard reminders. Email delivery is not enabled in this repo.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save settings"}
                </button>
              </section>
            </form>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900">Tag Management</h2>
              {tags.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No tags created yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {tags.map((tag) => (
                    <div key={tag.id} className="rounded-lg border border-zinc-100 p-3">
                      <div className="grid gap-2 md:grid-cols-[1fr_6rem_auto_auto]">
                        <input
                          value={tag.name}
                          onChange={(event) =>
                            setTags((prev) =>
                              prev.map((item) =>
                                item.id === tag.id
                                  ? { ...item, name: event.target.value }
                                  : item
                              )
                            )
                          }
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="color"
                          value={tag.color}
                          onChange={(event) =>
                            setTags((prev) =>
                              prev.map((item) =>
                                item.id === tag.id
                                  ? { ...item, color: event.target.value }
                                  : item
                              )
                            )
                          }
                          className="h-10 rounded-md border border-zinc-300 bg-white px-2"
                        />
                        <button
                          type="button"
                          onClick={() => updateTag(tag)}
                          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTagId(tag.id)}
                          className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                      {confirmDeleteTagId === tag.id && (
                        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                          Delete this tag from all contacts?
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => deleteTag(tag.id)}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-white"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTagId(null)}
                              className="rounded-md bg-white px-3 py-1.5 text-zinc-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tags.length >= 2 && (
                <div className="mt-5 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={mergeSourceId}
                    onChange={(event) => setMergeSourceId(event.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Merge from...</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={mergeTargetId}
                    onChange={(event) => setMergeTargetId(event.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Into...</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={mergeTags}
                    className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    Merge
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900">Import and Restore</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Use a JSON file created by Export Data. Restore replaces current people and tags.
              </p>
              <input
                type="file"
                accept="application/json"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className="mt-4 block w-full text-sm text-zinc-700"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={importing || !importFile}
                  onClick={() => restoreFromExport(false)}
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
                >
                  {importing ? "Working..." : "Import / update"}
                </button>
                <button
                  type="button"
                  disabled={importing || !importFile}
                  onClick={() => restoreFromExport(true)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Restore and replace
                </button>
              </div>
              {importMessage && (
                <p className="mt-3 text-sm text-emerald-700">{importMessage}</p>
              )}
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-zinc-900">
                Account
              </h2>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Log out
              </button>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
