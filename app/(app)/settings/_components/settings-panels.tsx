"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import type { Settings, Tag } from "@/types/index";

export function SettingsForm({
  settings,
  saving,
  onSubmit,
}: {
  settings: Settings | null;
  saving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Reminders
        </h2>
        <label
          htmlFor="reminder_frequency_days"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Reminder frequency (days)
        </label>
        <input
          id="reminder_frequency_days"
          name="reminder_frequency_days"
          type="number"
          min="1"
          defaultValue={settings?.reminder_frequency_days ?? 7}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          How often Roots checks if you should reach out to someone.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <input
            id="email_reminders_enabled"
            name="email_reminders_enabled"
            type="checkbox"
            defaultChecked={settings?.email_reminders_enabled ?? false}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="email_reminders_enabled" className="text-sm font-medium text-foreground">
            Send me a weekly email digest
          </label>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Every Sunday evening — who to reach out to this week and upcoming birthdays.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </section>
    </form>
  );
}

export function TagManagementPanel({
  tags,
  confirmDeleteTagId,
  mergeSourceId,
  mergeTargetId,
  onTagNameChange,
  onTagColorChange,
  onSaveTag,
  onRequestDeleteTag,
  onConfirmDeleteTag,
  onCancelDeleteTag,
  onMergeSourceChange,
  onMergeTargetChange,
  onMergeTags,
}: {
  tags: Tag[];
  confirmDeleteTagId: string | null;
  mergeSourceId: string;
  mergeTargetId: string;
  onTagNameChange: (tagId: string, name: string) => void;
  onTagColorChange: (tagId: string, color: string) => void;
  onSaveTag: (tag: Tag) => void;
  onRequestDeleteTag: (tagId: string) => void;
  onConfirmDeleteTag: (tagId: string) => void;
  onCancelDeleteTag: () => void;
  onMergeSourceChange: (tagId: string) => void;
  onMergeTargetChange: (tagId: string) => void;
  onMergeTags: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Tag Management</h2>
      {tags.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No tags created yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {tags.map((tag) => (
            <div key={tag.id} className="rounded-lg border border-border p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_6rem_auto_auto]">
                <input
                  value={tag.name}
                  onChange={(event) =>
                    onTagNameChange(tag.id, event.target.value)
                  }
                  className="rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
                <input
                  type="color"
                  value={tag.color}
                  onChange={(event) =>
                    onTagColorChange(tag.id, event.target.value)
                  }
                  className="h-10 rounded-md border border-border bg-card px-2"
                />
                <button
                  type="button"
                  onClick={() => onSaveTag(tag)}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDeleteTag(tag.id)}
                  className="rounded-md border border-red-200 bg-card px-3 py-2 text-sm font-medium text-red-700"
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
                      onClick={() => onConfirmDeleteTag(tag.id)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-white"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={onCancelDeleteTag}
                      className="rounded-md bg-card px-3 py-1.5 text-foreground"
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
            onChange={(event) => onMergeSourceChange(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
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
            onChange={(event) => onMergeTargetChange(event.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
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
            onClick={onMergeTags}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Merge
          </button>
        </div>
      )}
    </section>
  );
}

export function ImportRestorePanel({
  importFile,
  importing,
  importMessage,
  onFileChange,
  onImport,
  onRestore,
}: {
  importFile: File | null;
  importing: boolean;
  importMessage: string | null;
  onFileChange: (file: File | null) => void;
  onImport: () => void;
  onRestore: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Import and Restore</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Use a JSON file created by Export Data. Restore replaces current people and tags.
      </p>
      <input
        type="file"
        accept="application/json"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        className="mt-4 block w-full text-sm text-foreground"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={importing || !importFile}
          onClick={onImport}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
        >
          {importing ? "Working..." : "Import / update"}
        </button>
        <button
          type="button"
          disabled={importing || !importFile}
          onClick={onRestore}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Restore and replace
        </button>
      </div>
      {importMessage && (
        <p className="mt-3 text-sm text-emerald-700">{importMessage}</p>
      )}
    </section>
  );
}

export function ExportSection({
  exporting,
  exportError,
  onExport,
}: {
  exporting: boolean;
  exportError: string | null;
  onExport: () => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">Export</h2>
      <button
        type="button"
        disabled={exporting}
        onClick={onExport}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
      >
        {exporting ? "Exporting..." : "Export contacts"}
      </button>
      {exportError && (
        <p className="mt-2 text-sm text-red-700">{exportError}</p>
      )}
    </section>
  );
}

export function AccountTab({ onLogout }: { onLogout: () => void }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setDisplayName(
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""
        );
      }
    });
  }, []);

  async function saveProfile() {
    setProfileStatus(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    });
    if (error) {
      setProfileStatus({ ok: false, msg: error.message });
    } else {
      setProfileStatus({ ok: true, msg: "Profile updated." });
    }
  }

  async function saveEmail() {
    setEmailStatus(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setEmailStatus({ ok: false, msg: error.message });
    } else {
      setEmailStatus({ ok: true, msg: "Confirmation sent. Check your inbox." });
      setNewEmail("");
    }
  }

  async function savePassword() {
    setPasswordStatus(null);
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ ok: false, msg: "Passwords do not match." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordStatus({ ok: false, msg: error.message });
    } else {
      setPasswordStatus({ ok: true, msg: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to delete account.");
      }
      router.push("/auth/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleteConfirming(false);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Profile</h2>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Display name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={saveProfile}
          className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
        >
          Save
        </button>
        {profileStatus && (
          <p
            className={`mt-2 text-sm ${profileStatus.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {profileStatus.msg}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Email &amp; Password
        </h2>

        <div className="mb-5">
          <label className="mb-1 block text-sm font-medium text-foreground">
            New email
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email address"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={saveEmail}
            className="mt-3 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
          >
            Update email
          </button>
          {emailStatus && (
            <p
              className={`mt-2 text-sm ${emailStatus.ok ? "text-emerald-700" : "text-red-700"}`}
            >
              {emailStatus.msg}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-5">
          <label className="mb-1 block text-sm font-medium text-foreground">
            New password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="mb-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="mb-1 block text-sm font-medium text-foreground">
            Confirm password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={savePassword}
            className="mt-3 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
          >
            Update password
          </button>
          {passwordStatus && (
            <p
              className={`mt-2 text-sm ${passwordStatus.ok ? "text-emerald-700" : "text-red-700"}`}
            >
              {passwordStatus.msg}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          Legal
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Review the policies that explain how Roots handles your account and
          data.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/privacy"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Terms of service
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Danger Zone</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirming(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          >
            Delete account
          </button>
        </div>

        {deleteError && (
          <p className="mt-3 text-sm text-red-700">{deleteError}</p>
        )}

        {deleteConfirming && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>
              This will permanently delete your account and all your contacts.
              This cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirming(false)}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function BillingTab() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Billing</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Roots is free during beta. No credit card required.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ll let you know before anything changes.
      </p>
    </div>
  );
}
