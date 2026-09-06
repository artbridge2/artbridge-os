import type { ProjectStatus } from "@/lib/types";

export interface StatusStyle {
  bg: string;
  color: string;
}

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, StatusStyle> = {
  planning: { bg: "#fdf3d9", color: "#b8860b" },
  active: { bg: "#e5f7ed", color: "#1c9a52" },
  completed: { bg: "#f0f0f0", color: "#6b7280" },
  cancelled: { bg: "#fde8ea", color: "#e0353b" },
};
