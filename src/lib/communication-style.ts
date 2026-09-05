import { Code2, MessageCircle, HelpCircle, Megaphone, Truck, type LucideIcon } from "lucide-react";
import type { CasePriority, CaseStatus, EmailCategory } from "@/lib/types";

export interface CategoryStyle {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  barColor: string;
}

/** Visual language for each Communication category — icon + color, reused across the list, tabs and ticket detail. */
export const CATEGORY_STYLE: Record<EmailCategory, CategoryStyle> = {
  customer: { icon: MessageCircle, iconBg: "#fde8ea", iconColor: "#f0474c", barColor: "#f0474c" },
  artist: { icon: Megaphone, iconBg: "#fdecd9", iconColor: "#e8952a", barColor: "#e8952a" },
  developer: { icon: Code2, iconBg: "#ece9fd", iconColor: "#6c5ce7", barColor: "#6c5ce7" },
  supplier: { icon: Truck, iconBg: "#e3f0fd", iconColor: "#3b82f6", barColor: "#3b82f6" },
  other: { icon: HelpCircle, iconBg: "#f0f0f0", iconColor: "#6b7280", barColor: "#6b7280" },
};

export interface CaseStatusStyle {
  bg: string;
  color: string;
}

export const CASE_STATUS_STYLE: Record<CaseStatus, CaseStatusStyle> = {
  new: { bg: "#e3f0fd", color: "#3b82f6" },
  needs_reply: { bg: "#fde8ea", color: "#e0353b" },
  needs_review: { bg: "#fdf3d9", color: "#b8860b" },
  in_progress: { bg: "#ece9fd", color: "#6c5ce7" },
  waiting: { bg: "#e3f0fd", color: "#3b82f6" },
  resolved: { bg: "#e5f7ed", color: "#1c9a52" },
  archived: { bg: "#f0f0f0", color: "#6b7280" },
};

export const PRIORITY_STYLE: Record<CasePriority, CaseStatusStyle> = {
  low: { bg: "#f0f0f0", color: "#6b7280" },
  normal: { bg: "#f0f0f0", color: "#6b7280" },
  high: { bg: "#fdf3d9", color: "#b8860b" },
  urgent: { bg: "#fde8ea", color: "#e0353b" },
};

/** Best available display name for a thread's counterparty — real data only, never a placeholder name. */
export function senderDisplayName(thread: { sender: string | null; participants: { name?: string; email: string }[] }): string {
  const participant = thread.participants.find((p) => p.email === thread.sender);
  return participant?.name || thread.sender || "Unknown";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
