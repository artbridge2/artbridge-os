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
  | "development"
  | "finance_admin"
  | "supplier_logistics"
  | "marketing_partner"
  | "system"
  | "noise";

export type EmailAction = "reply" | "task" | "reply_task" | "waiting" | "fyi" | "ignore";

export type ThreadStatus = "needs_attention" | "waiting" | "done";

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
  sanitized_body: string | null;
  sent_at: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  customer: "Customer",
  artist: "Artist",
  development: "Development",
  finance_admin: "Finance & Admin",
  supplier_logistics: "Supplier & Logistics",
  marketing_partner: "Marketing & Partner",
  system: "System",
  noise: "Noise",
};

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
