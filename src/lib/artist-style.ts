import type { ArtistStatus, FitAssessment } from "@/lib/types";

export interface StyleTokens {
  bg: string;
  color: string;
}

export const ARTIST_STATUS_STYLE: Record<ArtistStatus, StyleTokens> = {
  candidate: { bg: "#f0f0f0", color: "#5a616c" },
  contacted: { bg: "#e3f0fd", color: "#3b82f6" },
  in_conversation: { bg: "#ece9fd", color: "#6c5ce7" },
  maybe_later: { bg: "#fdf3d9", color: "#b8860b" },
  accepted: { bg: "#e5f7ed", color: "#1c9a52" },
  active: { bg: "#e5f7ed", color: "#1c9a52" },
  inactive: { bg: "#f0f0f0", color: "#9aa0a8" },
  rejected: { bg: "#fde8ea", color: "#e0353b" },
};

export const FIT_STYLE: Record<FitAssessment, StyleTokens> = {
  strong: { bg: "#e5f7ed", color: "#1c9a52" },
  possible: { bg: "#fdf3d9", color: "#b8860b" },
  weak: { bg: "#f0f0f0", color: "#6b7280" },
};
