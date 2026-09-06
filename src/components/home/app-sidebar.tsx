"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  MessageCircle,
  Megaphone,
  User,
  Folder,
  Calendar,
  Settings,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@/lib/types";

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f0474c] px-1.5 text-[11px] font-semibold text-white">
      {count}
    </span>
  );
}

function NavRow({
  href,
  icon: Icon,
  label,
  count,
  active,
  external,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active?: boolean;
  external?: boolean;
}) {
  const content = (
    <>
      {Icon && <Icon className="size-[18px] shrink-0 text-[#3d4451]" />}
      <span className="flex-1 truncate">{label}</span>
      {external && <ArrowUpRight className="size-3.5 text-[#9aa1ab]" />}
      {typeof count === "number" && <Badge count={count} />}
    </>
  );

  const className = cn(
    "flex h-11 items-center gap-2.5 rounded-lg px-3 text-[14px] text-[#3d4451] transition-colors",
    active ? "bg-[#ececec] font-semibold text-[#12181f]" : "font-normal hover:bg-[#f4f4f4]"
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function SubNavRow({ href, label, count, active }: { href: string; label: string; count?: number; active?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-[34px] items-center gap-2.5 rounded-lg pl-[42px] pr-3 text-[13.5px] hover:bg-[#f4f4f4]",
        active ? "font-semibold text-[#12181f]" : "text-[#5a616c]"
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" && <Badge count={count} />}
    </Link>
  );
}

export function AppSidebar({
  canSeeCommunication,
  canSeeArtists,
  canSeeMarketing,
  canSeeProjects,
  canSeeCalendar,
  canSeeTasks,
  communicationCounts,
  taskCount,
  artistCount,
  activeCampaignCount,
}: {
  canSeeCommunication: boolean;
  canSeeArtists: boolean;
  canSeeMarketing: boolean;
  canSeeProjects: boolean;
  canSeeCalendar: boolean;
  canSeeTasks: boolean;
  communicationCounts?: { total: number; byCategory: Partial<Record<EmailCategory, number>> };
  taskCount?: number;
  artistCount?: number;
  activeCampaignCount?: number;
}) {
  const pathname = usePathname();
  const isMarketingRoute = pathname.startsWith("/marketing");
  const [marketingOpen, setMarketingOpen] = useState(isMarketingRoute);
  // Re-expand whenever navigation lands on a Marketing route (client-side nav
  // between child/detail pages doesn't remount this component, so the
  // initial useState alone wouldn't catch it) — Marketing stays contextually
  // expanded across Overview/Campaigns/Content/Email/SEO per the AppShell spec.
  useEffect(() => {
    if (isMarketingRoute) setMarketingOpen(true);
  }, [isMarketingRoute]);

  const communicationTotal = communicationCounts?.total ?? 0;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[#eeeeee] bg-white">
      <div className="px-6 pb-5 pt-6">
        <Image src="/artbridge-logo.png" alt="Artbridge" width={1000} height={232} className="h-6 w-auto" priority />
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3">
        <div className="flex flex-col">
          <NavRow href="/" icon={Home} label="Home" active={pathname === "/"} />
          {canSeeCommunication && (
            <NavRow
              href="/communication"
              icon={MessageCircle}
              label="Communication"
              count={communicationTotal}
              active={pathname.startsWith("/communication")}
            />
          )}
          {canSeeTasks && (
            <NavRow href="/tasks" icon={CheckSquare} label="Tasks" count={taskCount ?? 0} active={pathname.startsWith("/tasks")} />
          )}

          {canSeeMarketing && (
            <>
              <div className="flex items-center">
                <Link
                  href="/marketing"
                  onClick={() => setMarketingOpen(true)}
                  className={cn(
                    "flex h-11 flex-1 items-center gap-2.5 rounded-lg px-3 text-[14px] hover:bg-[#f4f4f4]",
                    isMarketingRoute ? "font-semibold text-[#12181f]" : "font-normal text-[#3d4451]"
                  )}
                >
                  <Megaphone className="size-[18px] shrink-0 text-[#3d4451]" />
                  <span className="flex-1 truncate">Marketing</span>
                  <Badge count={activeCampaignCount ?? 0} />
                </Link>
                <button
                  type="button"
                  onClick={() => setMarketingOpen((v) => !v)}
                  aria-label={marketingOpen ? "Collapse Marketing" : "Expand Marketing"}
                  className="flex h-11 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#f4f4f4]"
                >
                  {marketingOpen ? (
                    <ChevronUp className="size-3.5 text-[#9aa1ab]" />
                  ) : (
                    <ChevronDown className="size-3.5 text-[#9aa1ab]" />
                  )}
                </button>
              </div>
              {marketingOpen && (
                <div className="flex flex-col">
                  <SubNavRow href="/marketing" label="Overview" active={pathname === "/marketing"} />
                  <SubNavRow href="/marketing/campaigns" label="Campaigns" count={activeCampaignCount ?? 0} active={pathname.startsWith("/marketing/campaigns")} />
                  <SubNavRow href="/marketing/content" label="Content" active={pathname.startsWith("/marketing/content")} />
                  <SubNavRow href="/marketing/email" label="Email Marketing" active={pathname.startsWith("/marketing/email")} />
                  <SubNavRow href="/marketing/seo" label="SEO" active={pathname.startsWith("/marketing/seo")} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-2 flex flex-col">
          {canSeeArtists && (
            <NavRow href="/artists" icon={User} label="Artists" count={artistCount ?? 0} active={pathname.startsWith("/artists")} />
          )}
          {canSeeProjects && <NavRow href="/projects" icon={Folder} label="Projects" active={pathname.startsWith("/projects")} />}
        </div>

        <div className="mt-[30px] flex flex-col border-t border-[#eeeeee] pt-2.5">
          {canSeeCalendar && <NavRow href="/calendar" icon={Calendar} label="Calendar" active={pathname.startsWith("/calendar")} />}
          <NavRow href="https://drive.google.com" icon={Folder} label="Drive" external />
        </div>

        <div className="mt-auto flex flex-col border-t border-[#eeeeee] pt-2.5 pb-3">
          <NavRow href="/settings" icon={Settings} label="Settings" active={pathname.startsWith("/settings")} />
        </div>
      </nav>
    </aside>
  );
}
