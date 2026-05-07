"use client";

import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();

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
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Placeholder settings for Phase 1. These controls do not save yet.
          </p>
        </div>

        <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">
            Reminder Preferences
          </h2>

          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="contactFrequency"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Default contact frequency
              </label>
              <select
                id="contactFrequency"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                defaultValue="monthly"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reminderEmail"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Weekly reminder email
              </label>
              <select
                id="reminderEmail"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                defaultValue="enabled"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
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
    </AppLayout>
  );
}
