"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Settings } from "@/types/index";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings(data);
      } else {
        const { data: newRow } = await supabase
          .from("settings")
          .insert({
            user_id: user.id,
            reminder_frequency_days: 7,
            email_reminders_enabled: true,
          })
          .select()
          .single();

        if (newRow) setSettings(newRow);
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

    const form = e.currentTarget;
    const formData = new FormData(form);
    const reminderDays = Number(formData.get("reminder_frequency_days")) || 7;
    const emailEnabled = formData.get("email_reminders_enabled") === "true";

    const { error: updateError } = await supabase
      .from("settings")
      .update({
        reminder_frequency_days: reminderDays,
        email_reminders_enabled: emailEnabled,
      })
      .eq("id", settings.id);

    if (updateError) {
      setError(updateError.message ?? "Failed to save.");
    } else {
      setSettings((prev) =>
        prev
          ? { ...prev, reminder_frequency_days: reminderDays, email_reminders_enabled: emailEnabled }
          : prev
      );
      setSaved(true);
    }

    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-zinc-900">
                Reminder Preferences
              </h2>

              <div className="flex flex-col gap-4">
                <div>
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
                    How often to send reminder emails.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="email_reminders_enabled"
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    Email reminders
                  </label>
                  <select
                    id="email_reminders_enabled"
                    name="email_reminders_enabled"
                    defaultValue={
                      settings?.email_reminders_enabled ? "true" : "false"
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save settings"}
                </button>
              </div>
            </section>
          </form>
        )}

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
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
    </AppLayout>
  );
}
