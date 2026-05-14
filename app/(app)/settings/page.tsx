"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  AccountPanel,
  ImportRestorePanel,
  SettingsForm,
  TagManagementPanel,
} from "./_components/settings-panels";
import {
  parsePersonalCrmExport,
  type ExportPayload,
} from "./_lib/import-validation";
import { supabase } from "@/lib/supabase";
import type { Settings, Tag } from "@/types/index";

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

      if (createError?.code === "23505") {
        const { data: existingRow, error: existingError } = await supabase
          .from("settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingError || !existingRow) {
          setError(existingError?.message ?? "Could not load settings.");
        } else {
          setSettings(existingRow);
        }
      } else if (createError || !newRow) {
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

  function patchTag(tagId: string, patch: Partial<Tag>) {
    setTags((prev) =>
      prev.map((tag) => (tag.id === tagId ? { ...tag, ...patch } : tag))
    );
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
    return parsePersonalCrmExport(text);
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
      const importedPersonIds = new Set(importedPeople.map((person) => person.id));
      const importedTagIds = new Set(importedTags.map((tag) => tag.id));
      const tagIdsByPersonId = importedPersonTags.reduce<Record<string, string[]>>(
        (groups, personTag) => {
          if (
            !importedPersonIds.has(personTag.person_id) ||
            !importedTagIds.has(personTag.tag_id)
          ) {
            return groups;
          }

          groups[personTag.person_id] = [
            ...(groups[personTag.person_id] ?? []),
            personTag.tag_id,
          ];
          return groups;
        },
        {}
      );

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
      for (const [personId, tagIds] of Object.entries(tagIdsByPersonId)) {
        const { error: personTagsError } = await supabase.rpc("replace_person_tags", {
          p_person_id: personId,
          p_tag_ids: Array.from(new Set(tagIds)),
        });

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

            <SettingsForm
              settings={settings}
              saving={saving}
              onSubmit={handleSubmit}
            />

            <TagManagementPanel
              tags={tags}
              confirmDeleteTagId={confirmDeleteTagId}
              mergeSourceId={mergeSourceId}
              mergeTargetId={mergeTargetId}
              onTagNameChange={(tagId, name) => patchTag(tagId, { name })}
              onTagColorChange={(tagId, color) => patchTag(tagId, { color })}
              onSaveTag={updateTag}
              onRequestDeleteTag={setConfirmDeleteTagId}
              onConfirmDeleteTag={deleteTag}
              onCancelDeleteTag={() => setConfirmDeleteTagId(null)}
              onMergeSourceChange={setMergeSourceId}
              onMergeTargetChange={setMergeTargetId}
              onMergeTags={mergeTags}
            />

            <ImportRestorePanel
              importFile={importFile}
              importing={importing}
              importMessage={importMessage}
              onFileChange={setImportFile}
              onImport={() => restoreFromExport(false)}
              onRestore={() => restoreFromExport(true)}
            />

            <AccountPanel onLogout={handleLogout} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
