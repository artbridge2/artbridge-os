import { MessageCircle, Megaphone, Image as ImageIcon, User } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/types";
import { AttentionList } from "@/components/home/attention-list";
import { TodayCard, type CalendarEvent } from "@/components/home/today-card";
import { TeamCard, type TeamMember } from "@/components/home/team-card";
import { EditorialBanner } from "@/components/home/editorial-banner";
import type { Ticket } from "@/components/home/ticket-row";

// Pixel-match validation pass (see artbridge_home_pixelmatch handoff): this
// demo dataset mirrors home-reference.png exactly so the render can be
// compared 1:1. Communication has a real data source already
// (src/lib/attention.ts) — swapping this in, and adding real sources for
// Marketing/Artists once those modules exist, is the next pass.
const TICKETS: Ticket[] = [
  {
    id: "1",
    icon: MessageCircle,
    iconBg: "#ffefee",
    iconColor: "#e0545c",
    borderColor: "#e0545c",
    category: "Communication",
    title: "Developer replied on commission calculation",
    description: "Fix ready for testing. AI has analysed the changes.",
    timeAgo: "2 hours ago",
    href: "/communication",
  },
  {
    id: "2",
    icon: MessageCircle,
    iconBg: "#ffefee",
    iconColor: "#e0545c",
    borderColor: "#e0545c",
    category: "Communication",
    title: "Customer order issue",
    description: "AI reply prepared. Needs your review before sending.",
    timeAgo: "4 hours ago",
    href: "/communication",
  },
  {
    id: "3",
    icon: Megaphone,
    iconBg: "#fef3e4",
    iconColor: "#d98a2b",
    borderColor: "#e6a13c",
    category: "Marketing · Campaigns",
    title: "Autumn Sale — closing email",
    description: "Email draft prepared in Klaviyo. Ready for your review.",
    timeAgo: "5 hours ago",
    href: "/marketing",
  },
  {
    id: "4",
    icon: ImageIcon,
    iconBg: "#e3f5ee",
    iconColor: "#2f9e78",
    borderColor: "#3fae87",
    category: "Marketing · Content",
    title: "Weekly artwork content",
    description: "5 Instagram posts generated and saved to Drive.",
    timeAgo: "6 hours ago",
    href: "/marketing",
  },
  {
    id: "5",
    icon: User,
    iconBg: "#eeecfd",
    iconColor: "#7c6fe0",
    borderColor: "#8f7de8",
    category: "Artists",
    title: "Lili Szabó – upload problem",
    description: "AI has analysed the issue. Your input is needed.",
    timeAgo: "1 day ago",
    href: "/artists",
  },
];

const EVENTS: CalendarEvent[] = [
  { id: "1", time: "09:00", label: "Team sync", duration: "30 min", dotColor: "#8f7de8" },
  { id: "2", time: "11:00", label: "Customer reply review", duration: "1 h", dotColor: "#e6a13c" },
  { id: "3", time: "13:00", label: "Lunch", duration: "1 h", dotColor: "#9aa0a8" },
  { id: "4", time: "14:30", label: "Marketing meeting", duration: "1 h", dotColor: "#e0545c" },
  { id: "5", time: "16:00", label: "Artist call – Lili Szabó", duration: "30 min", dotColor: "#3fae87" },
];

const TEAM: TeamMember[] = [
  { id: "1", name: "Ádám", important: 5, avatarBg: "#f6cfc7", avatarColor: "#8a3b2b" },
  { id: "2", name: "Eszter", important: 4, avatarBg: "#f7e2b8", avatarColor: "#8a6a1f" },
  { id: "3", name: "Kurátor", important: 3, avatarBg: "#e4dffb", avatarColor: "#5b4ea6" },
];

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const name = ROLE_LABELS[profile.role];
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const shortDateLabel = today.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="pt-6">
      <div className="grid grid-cols-[1fr_318px] gap-6">
        <div className="min-w-0 space-y-6">
          <div>
            <p className="text-[13.5px] text-[#9aa0a8]">{dateLabel}</p>
            <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-[#12181f]">
              Good morning, {name}.
            </h1>
            <p className="mt-1 text-[15px] text-[#8a909a]">
              Here&apos;s what needs your attention today.
            </p>
          </div>

          <AttentionList tickets={TICKETS} />

          <EditorialBanner eyebrow="Same walls." title="A more inspiring day." />
        </div>

        <div className="space-y-6">
          <blockquote className="pt-1 text-right">
            <p className="text-[15px] italic leading-snug text-[#3d4451]">
              “A more inspired
              <br />
              day starts here. ”
            </p>
            <p className="mt-1.5 text-[12px] tracking-wide text-[#9aa0a8]">— ARTBRIDGE</p>
          </blockquote>

          <TodayCard dateLabel={shortDateLabel} events={EVENTS} />
          <TeamCard members={TEAM} />
        </div>
      </div>
    </div>
  );
}
