import type { ImportantMoment } from "./types.ts";

export type ImportantMomentDraft = Pick<
  ImportantMoment,
  "label" | "date" | "recurs_yearly"
>;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function createMomentDraft(): ImportantMomentDraft {
  return { label: "", date: "", recurs_yearly: true };
}

export function updateMomentDraft(
  drafts: ImportantMomentDraft[],
  index: number,
  patch: Partial<ImportantMomentDraft>
): ImportantMomentDraft[] {
  return drafts.map((draft, draftIndex) =>
    draftIndex === index ? { ...draft, ...patch } : draft
  );
}

export function removeMomentDraft(
  drafts: ImportantMomentDraft[],
  index: number
): ImportantMomentDraft[] {
  return drafts.filter((_, draftIndex) => draftIndex !== index);
}

export type NormalizedMomentDrafts = {
  moments: ImportantMomentDraft[];
  valid: boolean;
};

export function normalizeMomentDrafts(
  drafts: ImportantMomentDraft[]
): NormalizedMomentDrafts {
  const moments = drafts
    .map((draft) => ({
      ...draft,
      label: draft.label.trim(),
      date: draft.date.trim(),
    }))
    .filter((draft) => draft.label || draft.date);
  const valid = moments.every(
    (draft) => draft.label && DATE_ONLY_PATTERN.test(draft.date)
  );
  return { moments, valid };
}

export function buildMomentInsertRows(
  userId: string,
  personId: string,
  moments: ImportantMomentDraft[]
): Array<{
  user_id: string;
  person_id: string;
  label: string;
  date: string;
  recurs_yearly: boolean;
}> {
  return moments.map((moment) => ({
    user_id: userId,
    person_id: personId,
    label: moment.label,
    date: moment.date,
    recurs_yearly: moment.recurs_yearly,
  }));
}
