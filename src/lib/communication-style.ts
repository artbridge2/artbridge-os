import {
  Code2,
  MessageCircle,
  MessagesSquare,
  Megaphone,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { CaseStatus, EmailCategory } from "@/lib/types";

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
  internal: { icon: MessagesSquare, iconBg: "#e5f7ed", iconColor: "#22a35a", barColor: "#22a35a" },
  system: { icon: MessagesSquare, iconBg: "#f0f0f0", iconColor: "#6b7280", barColor: "#6b7280" },
  noise: { icon: MessagesSquare, iconBg: "#f0f0f0", iconColor: "#9aa0a8", barColor: "#9aa0a8" },
};

export interface CaseStatusStyle {
  bg: string;
  color: string;
}

export const CASE_STATUS_STYLE: Record<CaseStatus, CaseStatusStyle> = {
  needs_reply: { bg: "#fde8ea", color: "#e0353b" },
  needs_review: { bg: "#fdf3d9", color: "#b8860b" },
  waiting: { bg: "#e3f0fd", color: "#3b82f6" },
  resolved: { bg: "#e5f7ed", color: "#1c9a52" },
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
