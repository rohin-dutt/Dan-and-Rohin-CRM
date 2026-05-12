export type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  location: string | null;
  birthday: string | null;
  how_met: string | null;
  relationship_type: string | null;
  relationship_strength: string | null;
  preferred_contact_method: string | null;
  contact_frequency_days: number;
  last_contacted_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Interaction = {
  id: string;
  person_id: string;
  type: string;
  date: string;
  notes: string | null;
  follow_up_needed: boolean;
  follow_up_date: string | null;
  follow_up_status: "open" | "done" | "snoozed";
  follow_up_snoozed_until: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type PersonTag = {
  person_id: string;
  tag_id: string;
};

export type Settings = {
  id: string;
  user_id: string;
  reminder_frequency_days: number;
  email_reminders_enabled: boolean;
  created_at: string;
};
