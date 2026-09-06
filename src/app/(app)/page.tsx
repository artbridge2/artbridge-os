import { MessageCircle, CheckSquare, User, Megaphone } from "lucide-react";
import { getCurrentProfile, getViewedProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getAttentionItems, getAttentionItemsUncapped, getHomeStats, type AttentionItem } from "@/lib/attention";
import { getCalendarConnectionStatus, getUpcomingEvents } from "@/lib/google/calendar";
import { formatElapsedEn } from "@/lib/dates";
import { AttentionList } from "@/components/home/attention-list";
import { TodayCard } from "@/components/home/today-card";
import { TeamCard, type TeamMember } from "@/components/home/team-card";
import { OperationalStats } from "@/components/home/operational-stats";
import { getTodaysArtistQuote } from "@/lib/artist-quotes";
import { GmailSyncButton } from "@/components/gmail-sync-button";
import type { Ticket } from "@/components/home/ticket-row";
import type { Profile } from "@/lib/types";

const AVATAR_COLORS = [
  { bg: "#f6cfc7", color: "#8a3b2b" },
  { bg: "#f7e2b8", color: "#8a6a1f" },
  { bg: "#e4dffb", color: "#5b4ea6" },
  { bg: "#d9ecf5", color: "#2a6b8a" },
];

const TICKET_STYLES: Record<AttentionItem["source_type"], { icon: typeof CheckSquare; iconBg: string; iconColor: string; category: string }> = {
  task: { icon: CheckSquare, iconBg: "#e3f0fd", iconColor: "#3b82f6", category: "Task" },
  communication: { icon: MessageCircle, iconBg: "#ffefee", iconColor: "#e0545c", category: "Communication" },
  artist: { icon: User, iconBg: "#eeecfd", iconColor: "#7c6fe0", category: "Artists" },
  campaign: { icon: Megaphone, iconBg: "#fdecd9", iconColor: "#e8952a", category: "Marketing" },
};

function toTicket(item: AttentionItem): Ticket {
  const style = TICKET_STYLES[item.source_type];
  return {
    id: `${item.source_type}-${item.source_id}`,
    icon: style.icon,
    iconBg: style.iconBg,
    iconColor: style.iconColor,
    borderColor: style.iconColor,
    category: style.category,
    title: item.title,
    description: item.context ?? item.attention_reason,
    timeAgo: formatElapsedEn(item.updated_at),
    href: item.href,
  };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const viewer = await getCurrentProfile();
  const canSwitch = viewer.role !== "kurator";

  const profiles = await getProfiles();
  const viewedProfile: Profile = await getViewedProfile();

  const [attentionItems, stats, calendarStatus] = await Promise.all([
    getAttentionItems(viewedProfile.id),
    getHomeStats(viewedProfile.id),
    getCalendarConnectionStatus(),
  ]);

  let calendarState: "connected" | "not_connected" | "error" = "not_connected";
  let events: Awaited<ReturnType<typeof getUpcomingEvents>> = [];
  if (calendarStatus.connected) {
    try {
      events = await getUpcomingEvents();
      calendarState = "connected";
    } catch (err) {
      console.error("[home] calendar fetch failed", err);
      calendarState = "error";
    }
  }

  const teamMembers: TeamMember[] = canSwitch
    ? await Promise.all(
        profiles.map(async (p, i) => {
          const items = await getAttentionItemsUncapped(p.id).catch(() => []);
          const palette = AVATAR_COLORS[i % AVATAR_COLORS.length]!;
          return {
            id: p.id,
            name: p.full_name,
            needsAttention: items.length,
            avatarBg: palette.bg,
            avatarColor: palette.color,
          };
        })
      )
    : [];

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const tickets = attentionItems.map(toTicket);
  const dailyQuote = getTodaysArtistQuote();

  return (
    <div className="pt-6">
      <div className="grid grid-cols-[1fr_318px] gap-6">
        <div className="min-w-0 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13.5px] text-[#9aa0a8]">{dateLabel}</p>
              <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-[#12181f]">
                {greeting()}, {viewedProfile.full_name}.
              </h1>
              <p className="mt-1 text-[15px] text-[#8a909a]">Here&apos;s what needs your attention today.</p>
            </div>
            <GmailSyncButton />
          </div>

          <OperationalStats stats={stats} />

          <AttentionList tickets={tickets} />
        </div>

        <div className="space-y-6">
          <blockquote className="pt-1 text-right">
            <p className="text-[15px] italic leading-snug text-[#3d4451]">&ldquo;{dailyQuote.quote}&rdquo;</p>
            <p className="mt-1.5 text-[12px] tracking-wide text-[#9aa0a8]">— {dailyQuote.artist.toUpperCase()}</p>
          </blockquote>

          <TodayCard state={calendarState} events={events} />
          {canSwitch && <TeamCard members={teamMembers} canSwitch={canSwitch} viewedUserId={viewedProfile.id} />}
        </div>
      </div>
    </div>
  );
}
