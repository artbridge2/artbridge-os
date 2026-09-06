import type { TaskPriority, TaskStatus } from "@/lib/types";

export interface StyleTokens {
  bg: string;
  color: string;
}

export const TASK_STATUS_STYLE: Record<TaskStatus, StyleTokens> = {
  todo: { bg: "#f0f0f0", color: "#5a616c" },
  in_progress: { bg: "#e3f0fd", color: "#3b82f6" },
  completed: { bg: "#e5f7ed", color: "#1c9a52" },
};

export const TASK_PRIORITY_STYLE: Record<TaskPriority, StyleTokens> = {
  low: { bg: "#f0f0f0", color: "#6b7280" },
  normal: { bg: "#f0f0f0", color: "#6b7280" },
  high: { bg: "#fdf3d9", color: "#b8860b" },
  urgent: { bg: "#fde8ea", color: "#e0353b" },
};
