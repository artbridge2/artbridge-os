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
}

export interface TaskWithRelations extends Task {
  owner: Profile | null;
  area: Area | null;
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
