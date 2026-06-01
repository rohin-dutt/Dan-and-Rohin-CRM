export type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
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
  push_followups_enabled: boolean;
  push_birthdays_enabled: boolean;
  notification_timezone: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  current_streak: number;
  last_streak_date: string | null;
  created_at: string;
};
