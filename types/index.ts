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
  push_followups_enabled: boolean;
  push_birthdays_enabled: boolean;
  notification_timezone: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
};

export type PushToken = {
  id: string;
  user_id: string;
  token: string;
  provider: "expo" | "apns";
  platform: "ios" | "android";
  app_install_id: string | null;
  device_name: string | null;
  app_version: string | null;
  build_number: string | null;
  environment: string;
  status: "active" | "revoked" | "invalid";
  last_seen_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationDelivery = {
  id: string;
  user_id: string;
  push_token_id: string | null;
  kind: "follow_up_due" | "follow_up_overdue" | "birthday";
  subject_type: "person" | "interaction";
  subject_id: string | null;
  scheduled_for: string;
  send_after: string | null;
  idempotency_key: string;
  status: "pending" | "sent" | "failed" | "skipped" | "invalid_token";
  attempt_count: number;
  provider_message_id: string | null;
  error_code: string | null;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
};
