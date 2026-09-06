export type Role = "adam" | "eszter" | "kurator";

export type TaskStatus = "todo" | "in_progress" | "completed";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

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

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/** Optional reference to another canonical Artbridge OS object — context only, never lifecycle. */
export interface TaskLinkedObject {
  linked_type: string | null;
  linked_id: string | null;
  linked_href: string | null;
  linked_title: string | null;
}

export interface Task extends TaskLinkedObject {
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
  checklist: ChecklistItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  next_action: string | null;
  notes: string | null;
}

export interface TaskWithRelations extends Task {
  owner: Profile | null;
  area: Area | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  name: string;
  url: string;
  added_by: string | null;
  created_at: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
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
// Communication
// ---------------------------------------------------------------------------

/** "Other" is the deliberate fallback for uncertain/unclassified communication — never silently dropped. */
export type EmailCategory = "customer" | "artist" | "developer" | "supplier" | "other";

/** Real, persisted lifecycle — not derived. Archived is reached automatically 3 days after Resolved. */
export type CaseStatus = "new" | "needs_reply" | "needs_review" | "in_progress" | "waiting" | "resolved" | "archived";

export type CasePriority = "low" | "normal" | "high" | "urgent";

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
  category: EmailCategory;
  issue_type: string | null;
  suggested_next_action: string | null;
  owner_id: string | null;
  priority: CasePriority;
  status: CaseStatus;
  /** Ingestion decided this shouldn't be an active case (newsletter, automated no-reply, ...). Never shown in normal queues. */
  suppressed: boolean;
  labels: string[];
  shopify_customer_id: string | null;
  shopify_order_id: string | null;
  shopify_match_confidence: "confirmed" | "suggested" | null;
  resolved_at: string | null;
  archived_at: string | null;
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

export interface CaseEvent {
  id: string;
  thread_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  customer: "Customers",
  artist: "Artists",
  developer: "Developers",
  supplier: "Suppliers",
  other: "Other",
};

/** Singular form for the ticket-detail category tag ("Customer", not "Customers"). */
export const CATEGORY_LABELS_SINGULAR: Record<EmailCategory, string> = {
  customer: "Customer",
  artist: "Artist",
  developer: "Developer",
  supplier: "Supplier",
  other: "Other",
};

export const COMMUNICATION_CATEGORY_GROUPS: EmailCategory[] = ["customer", "artist", "developer", "supplier", "other"];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: "New",
  needs_reply: "Needs reply",
  needs_review: "Needs review",
  in_progress: "In progress",
  waiting: "Waiting",
  resolved: "Resolved",
  archived: "Archived",
};

/** Statuses that count as "active"/actionable for badges, queues and the "Open" stat. */
export const ACTIVE_CASE_STATUSES: CaseStatus[] = ["new", "needs_reply", "needs_review", "in_progress", "waiting"];

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/** Controlled customer issue-type taxonomy (spec §8). Free-form column — AI/admins may extend this list without a migration. */
export const CUSTOMER_ISSUE_TYPES = [
  "damaged_product",
  "wrong_product",
  "missing_item",
  "delivery_problem",
  "delivery_status",
  "order_change",
  "cancellation",
  "return",
  "refund",
  "product_question",
  "payment_problem",
  "other",
] as const;

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  damaged_product: "Damaged product",
  wrong_product: "Wrong product",
  missing_item: "Missing item",
  delivery_problem: "Delivery problem",
  delivery_status: "Delivery status",
  order_change: "Order change",
  cancellation: "Cancellation",
  return: "Return",
  refund: "Refund",
  product_question: "Product question",
  payment_problem: "Payment problem",
  other: "Other",
};

export function issueTypeLabel(issueType: string | null): string | null {
  if (!issueType) return null;
  return ISSUE_TYPE_LABELS[issueType] ?? issueType;
}
