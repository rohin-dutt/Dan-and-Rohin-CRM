"use client";

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
          In-app Reminder Cadence
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
          Used for in-app dashboard reminders. Email delivery is not enabled in this repo.
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

export function AccountPanel({ onLogout }: { onLogout: () => void }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">Account</h2>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Log out
      </button>
    </section>
  );
}
