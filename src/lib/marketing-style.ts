import type { CampaignStatus, ContentStatus } from "@/lib/types";

export interface StatusStyle {
  bg: string;
  color: string;
}

export const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, StatusStyle> = {
  planning: { bg: "#fdf3d9", color: "#b8860b" },
  active: { bg: "#e5f7ed", color: "#1c9a52" },
  completed: { bg: "#f0f0f0", color: "#6b7280" },
  cancelled: { bg: "#fde8ea", color: "#e0353b" },
};

export const CONTENT_STATUS_STYLE: Record<ContentStatus, StatusStyle> = {
  idea: { bg: "#f0f0f0", color: "#6b7280" },
  drafting: { bg: "#e3f0fd", color: "#3b82f6" },
  in_review: { bg: "#fdf3d9", color: "#b8860b" },
  scheduled: { bg: "#ece9fd", color: "#6c5ce7" },
  published: { bg: "#e5f7ed", color: "#1c9a52" },
};
