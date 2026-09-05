export type Role = "adam" | "eszter" | "kurator";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "waiting" | "done";

export type TaskPriority = "low" | "normal" | "high" | "critical";

export type RecurringFreq = "daily" | "weekdays" | "weekly" | "monthly" | "quarterly";

export interface RecurringRule {
  freq: RecurringFreq;
  /** every X weeks / months (default 1) */
  interval?: number;
  /** 0=Sunday..6=Saturday, used by "weekly" for multi-times-a-week rules */
  weekdays?: number[];
}

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  email: string;
}

export interface Area {
  id: string;
  name: string;
  sort_order: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  area_id: string | null;
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  recurring_rule: RecurringRule | null;
  recurring_parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  next_action: string | null;
  notes: string | null;
  source_type: "email" | null;
  source_thread_id: string | null;
}

export interface TaskWithRelations extends Task {
  owner: Profile | null;
  area: Area | null;
  source_thread: { id: string; subject: string | null } | null;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  done: "Done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

export const ROLE_LABELS: Record<Role, string> = {
  adam: "Ádám",
  eszter: "Eszter",
  kurator: "Kurátor",
};

export const RECURRING_FREQ_LABELS: Record<RecurringFreq, string> = {
  daily: "Naponta",
  weekdays: "Munkanapokon",
  weekly: "Hetente",
  monthly: "Havonta",
  quarterly: "Negyedévente",
};

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export type EmailCategory =
  | "customer"
  | "artist"
  | "developer"
  | "supplier"
  | "internal"
  | "system"
  | "noise";

export type EmailAction = "reply" | "task" | "reply_task" | "waiting" | "fyi" | "ignore";

export type ThreadStatus = "needs_attention" | "waiting" | "done";

/** Ticket #, e.g. "#4821" — a short human-friendly reference, not the UUID. */
export function threadReference(thread: { created_at: string }): string {
  return "#" + new Date(thread.created_at).getTime().toString().slice(-4);
}

export interface EmailThread {
  id: string;
  gmail_thread_id: string;
  subject: string | null;
  participants: { name?: string; email: string }[];
  sender: string | null;
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  snippet: string | null;
  category: EmailCategory | null;
  action: EmailAction | null;
  owner_id: string | null;
  priority: TaskPriority;
  status: ThreadStatus;
  labels: string[];
  resolved_at: string | null;
  deleted_at: string | null;
  follow_up_at: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  suggested_task_title: string | null;
  draft_reply: string | null;
  draft_generated_at: string | null;
  classification_version: number;
  last_classified_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailThreadWithRelations extends EmailThread {
  owner: Profile | null;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  gmail_message_id: string;
  sender: string | null;
  recipients: { name?: string; email: string }[];
  is_inbound: boolean;
  is_internal_note: boolean;
  sanitized_body: string | null;
  sent_at: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  customer: "Customers",
  artist: "Artists",
  developer: "Developers",
  supplier: "Suppliers",
  internal: "Internal",
  system: "System",
  noise: "Noise",
};

/** Singular form for the ticket-detail category tag ("Customer", not "Customers"). */
export const CATEGORY_LABELS_SINGULAR: Record<EmailCategory, string> = {
  customer: "Customer",
  artist: "Artist",
  developer: "Developer",
  supplier: "Supplier",
  internal: "Internal",
  system: "System",
  noise: "Noise",
};

/** The categories shown as their own filter tab in Communication — system/noise are hidden by default. */
export const COMMUNICATION_CATEGORY_GROUPS: EmailCategory[] = [
  "customer",
  "artist",
  "developer",
  "supplier",
  "internal",
];

export const ACTION_LABELS: Record<EmailAction, string> = {
  reply: "Reply",
  task: "Task",
  reply_task: "Reply + Task",
  waiting: "Waiting",
  fyi: "FYI",
  ignore: "Ignore",
};

export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  needs_attention: "Needs attention",
  waiting: "Waiting",
  done: "Done",
};

// ---------------------------------------------------------------------------
// Communication case status — a display-level status derived from
// status+action rather than its own column, so "Needs reply" vs "Needs
// review" doesn't require a schema change.
// ---------------------------------------------------------------------------

export type CaseStatus = "needs_reply" | "needs_review" | "waiting" | "resolved";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  needs_reply: "Needs reply",
  needs_review: "Needs review",
  waiting: "Waiting",
  resolved: "Resolved",
};

export function deriveCaseStatus(thread: { status: ThreadStatus; action: EmailAction | null }): CaseStatus {
  if (thread.status === "done") return "resolved";
  if (thread.status === "waiting") return "waiting";
  if (thread.action === "reply" || thread.action === "reply_task") return "needs_reply";
  return "needs_review";
}
