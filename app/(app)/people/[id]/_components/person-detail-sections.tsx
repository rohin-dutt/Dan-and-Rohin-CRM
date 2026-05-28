"use client";

import Link from "next/link";
import { useState } from "react";

import {
  getFollowUpState,
  getNextDueDays,
  pluralize,
} from "@/lib/crm-rules";
import { formatBirthdayDate, formatDate } from "@/lib/date-utils";
import { INTERACTION_TYPES } from "@/lib/form-utils";
import type { Interaction, Person, Tag } from "@/types/index";

function FollowUpToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg animate-in fade-in">
      {message}
    </div>
  );
}

function InteractionEditForm({
  interaction,
  onSubmit,
  onCancel,
}: {
  interaction: Interaction;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [followUpNeeded, setFollowUpNeeded] = useState(
    interaction.follow_up_needed
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          name="type"
          defaultValue={interaction.type}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {INTERACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          name="date"
          type="date"
          required
          defaultValue={interaction.date}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </div>
      <textarea
        name="notes"
        rows={3}
        defaultValue={interaction.notes ?? ""}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
      />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            name="follow_up_needed"
            type="checkbox"
            checked={followUpNeeded}
            onChange={(e) => setFollowUpNeeded(e.target.checked)}
          />
          Follow-up
        </label>
        {followUpNeeded && (
          <>
            <input
              name="follow_up_date"
              type="date"
              defaultValue={interaction.follow_up_date ?? ""}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
            <select
              name="follow_up_status"
              defaultValue={interaction.follow_up_status}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="open">Open</option>
              <option value="snoozed">Snoozed</option>
              <option value="done">Done</option>
            </select>
            <input
              name="follow_up_snoozed_until"
              type="date"
              defaultValue={interaction.follow_up_snoozed_until ?? ""}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm md:col-span-3"
            />
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function followUpStateDisplay(state: string): { label: string; preposition: string } {
  switch (state) {
    case "overdue":
      return { label: "overdue", preposition: "since" };
    case "due_today":
      return { label: "due today", preposition: "" };
    case "due":
      return { label: "due", preposition: "on" };
    case "snoozed":
      return { label: "snoozed", preposition: "until" };
    default:
      return { label: state, preposition: "on" };
  }
}

function formatGap(newerDate: string, olderDate: string): string {
  const days = Math.round(
    (new Date(newerDate).getTime() - new Date(olderDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"} later`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} later`;
  }
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "month" : "months"} later`;
}

function nextActionText(person: Person) {
  const days = getNextDueDays(person);
  if (days === null) return "Log the first interaction";
  if (days < 0) return `Reach out now, overdue by ${pluralize(Math.abs(days), "day")}`;
  if (days === 0) return "Reach out today";
  return `Reach out in ${pluralize(days, "day")}`;
}

export function PersonNotFound() {
  return (
    <>
      <Link href="/people" className="text-sm font-medium text-muted-foreground">
        Back to people
      </Link>
      <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-muted-foreground">Person not found.</p>
      </div>
    </>
  );
}

export function DeletePersonConfirmation({
  personName,
  deleting,
  onDelete,
  onCancel,
}: {
  personName: string;
  deleting: boolean;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-900">
        Delete {personName} and all related interactions?
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex h-9 items-center rounded-md bg-red-600 px-4 text-sm font-medium text-white"
        >
          {deleting ? "Deleting..." : "Delete person"}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function QuickNoteForm({
  onAddNote,
  addingNote,
}: {
  onAddNote: (note: string) => Promise<void>;
  addingNote: boolean;
}) {
  const [note, setNote] = useState("");

  async function handleSubmit() {
    if (!note.trim() || addingNote) return;
    await onAddNote(note.trim());
    setNote("");
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. mentioned they're moving to Chicago..."
        className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Cmd+Enter to save</p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!note.trim() || addingNote}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
        >
          {addingNote ? "Saving..." : "Save note"}
        </button>
      </div>
    </div>
  );
}

export function PersonSummary({
  person,
  personTags,
  interactions,
  onAddNote,
  addingNote,
}: {
  person: Person;
  personTags: Tag[];
  interactions: Interaction[];
  onAddNote: (note: string) => Promise<void>;
  addingNote: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const latestInteraction = interactions[0];
  const activeFollowUps = interactions.filter(
    (interaction) =>
      interaction.follow_up_needed &&
      getFollowUpState(interaction) !== "done" &&
      getFollowUpState(interaction) !== "snoozed"
  );

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      {person.relationship_type && (
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {person.relationship_type}
        </p>
      )}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{person.name}</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {[person.role, person.company].filter(Boolean).join(" at ") ||
              "No role or company yet"}
          </p>
        </div>
        <Link
          href={`/people/${person.id}/interactions/new`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
        >
          Log a chat
        </Link>
      </div>

      {personTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {personTags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next step
          </p>
          <p className="mt-2 font-semibold">{nextActionText(person)}</p>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last chat
          </p>
          <p className="mt-2 font-semibold">
            {latestInteraction
              ? `${latestInteraction.type} on ${formatDate(latestInteraction.date)}`
              : "No interactions yet"}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Follow-ups
          </p>
          <p className="mt-2 font-semibold">
            {activeFollowUps.length === 0
              ? "None active"
              : `${activeFollowUps.length} active`}
          </p>
        </div>
      </div>

      {(() => {
        const populatedFields = [
          ["Email", person.email],
          ["Phone", person.phone],
          ["Location", person.location],
          ["Birthday", person.birthday ? formatBirthdayDate(person.birthday) : null],
          ["Relationship Strength", person.relationship_strength],
          ["Preferred Contact", person.preferred_contact_method],
          ["How often you connect", person.contact_frequency_days ? `Every ${person.contact_frequency_days} days` : null],
          ["How you met", person.how_met],
        ].filter(([, value]) => value != null && value !== "");

        return populatedFields.length > 0 ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? "Hide details ▴" : `View details (${populatedFields.length}) ▾`}
            </button>
            {showDetails && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {populatedFields.map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-muted p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null;
      })()}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Notes</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground whitespace-pre-wrap">
          {person.notes ||
            "Add context, conversation threads, or anything useful for the next reach-out."}
        </p>
        <div className="mt-4">
          <QuickNoteForm onAddNote={onAddNote} addingNote={addingNote} />
        </div>
      </section>
    </section>
  );
}

export function InteractionTimeline({
  personId,
  interactions,
  interactionsLoading,
  interactionError,
  editingInteractionId,
  deletingInteractionId,
  onEditInteraction,
  onCancelEditInteraction,
  onUpdateInteraction,
  onStartDeleteInteraction,
  onCancelDeleteInteraction,
  onDeleteInteraction,
  onFollowUpStatus,
}: {
  personId: string;
  interactions: Interaction[];
  interactionsLoading: boolean;
  interactionError: string | null;
  editingInteractionId: string | null;
  deletingInteractionId: string | null;
  onEditInteraction: (interactionId: string) => void;
  onCancelEditInteraction: () => void;
  onUpdateInteraction: (
    interaction: Interaction,
    event: React.FormEvent<HTMLFormElement>
  ) => void;
  onStartDeleteInteraction: (interactionId: string) => void;
  onCancelDeleteInteraction: () => void;
  onDeleteInteraction: (interactionId: string) => void;
  onFollowUpStatus: (
    interaction: Interaction,
    status: Interaction["follow_up_status"]
  ) => void;
}) {
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  function triggerToast(message: string) {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your history</h2>
        <Link
          href={`/people/${personId}/interactions/new`}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
        >
          Log a chat
        </Link>
      </div>

      {interactionError && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {interactionError}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {interactionsLoading ? (
          <p className="text-sm text-muted-foreground">Loading interactions...</p>
        ) : interactions.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <h3 className="font-semibold text-foreground">No history yet.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Log your first conversation so Roots can track your cadence.
            </p>
            <Link
              href={`/people/${personId}/interactions/new`}
              className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
            >
              Add your first conversation
            </Link>
          </div>
        ) : (
          interactions.flatMap((interaction, index) => {
            const { label: fuLabel, preposition: fuPrep } = followUpStateDisplay(
              getFollowUpState(interaction)
            );
            const card = (
              <div
                key={interaction.id}
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
              >
              {editingInteractionId === interaction.id ? (
                <InteractionEditForm
                  interaction={interaction}
                  onSubmit={(event) => onUpdateInteraction(interaction, event)}
                  onCancel={onCancelEditInteraction}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                        {interaction.type}
                      </span>
                      <span className="ml-3 text-sm text-muted-foreground">
                        {formatDate(interaction.date)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEditInteraction(interaction.id)}
                        className="text-sm font-medium text-foreground underline"
                      >
                        Edit
                      </button>
                      {deletingInteractionId === interaction.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onDeleteInteraction(interaction.id)}
                            className="text-sm font-medium text-red-700 underline"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={onCancelDeleteInteraction}
                            className="text-sm font-medium text-foreground underline"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartDeleteInteraction(interaction.id)}
                          className="text-sm font-medium text-red-700 underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {interaction.notes && (
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {interaction.notes}
                    </p>
                  )}
                  {interaction.follow_up_needed && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-medium">
                        Follow-up {fuLabel}
                        {fuPrep ? ` ${fuPrep} ${formatDate(interaction.follow_up_date)}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            onFollowUpStatus(interaction, "done");
                            triggerToast("Follow-up done ✓");
                          }}
                          className="rounded-md bg-card px-3 py-1 text-xs font-medium text-foreground"
                        >
                          Mark done
                        </button>
                        <button
                          onClick={() => {
                            onFollowUpStatus(interaction, "snoozed");
                            triggerToast("Snoozed for 7 days");
                          }}
                          className="rounded-md bg-card px-3 py-1 text-xs font-medium text-foreground"
                        >
                          Snooze 7 days
                        </button>
                        <button
                          onClick={() => {
                            onFollowUpStatus(interaction, "open");
                            triggerToast("Follow-up reopened");
                          }}
                          className="rounded-md bg-card px-3 py-1 text-xs font-medium text-foreground"
                        >
                          Reopen
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            );
            if (index < interactions.length - 1) {
              return [
                card,
                <p
                  key={`gap-${interaction.id}`}
                  className="text-xs text-muted-foreground text-center py-1"
                >
                  {formatGap(interaction.date, interactions[index + 1].date)}
                </p>,
              ];
            }
            return [card];
          })
        )}
      </div>
      {showToast && <FollowUpToast message={toastMessage} />}
    </section>
  );
}
