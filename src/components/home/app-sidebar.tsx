"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function SubNavRow({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className="flex h-[34px] items-center gap-2.5 rounded-lg pl-[42px] pr-3 text-[13.5px] text-[#5a616c] hover:bg-[#f4f4f4]"
    >
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" && <Badge count={count} />}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [marketingOpen, setMarketingOpen] = useState(true);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[#eeeeee] bg-white">
      <div className="px-6 pb-5 pt-6">
        <p className="text-[15px] font-extrabold tracking-[0.12em] text-[#12181f]">ARTBRIDGE</p>
        <p className="-mt-0.5 text-[10px] font-medium tracking-[0.2em] text-[#a8adb5]">OS</p>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3">
        <div className="flex flex-col">
          <NavRow href="/" icon={Home} label="Home" active={pathname === "/"} />
          <NavRow href="/communication" icon={MessageCircle} label="Communication" count={3} />
          <button
            type="button"
            onClick={() => setMarketingOpen((v) => !v)}
            className="flex h-11 items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-normal text-[#3d4451] hover:bg-[#f4f4f4]"
          >
            <Megaphone className="size-[18px] shrink-0 text-[#3d4451]" />
            <span className="flex-1 truncate">Marketing</span>
            <Badge count={5} />
            {marketingOpen ? (
              <ChevronUp className="size-3.5 text-[#9aa1ab]" />
            ) : (
              <ChevronDown className="size-3.5 text-[#9aa1ab]" />
            )}
          </button>
          {marketingOpen && (
            <div className="flex flex-col">
              <SubNavRow href="/marketing" label="Overview" />
              <SubNavRow href="/marketing" label="Campaigns" count={2} />
              <SubNavRow href="/marketing" label="Content" count={1} />
              <SubNavRow href="/marketing" label="Email Marketing" count={1} />
              <SubNavRow href="/marketing" label="SEO" count={1} />
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col">
          <NavRow href="/artists" icon={User} label="Artists" count={1} />
          <NavRow href="/projects" icon={Folder} label="Projects" count={2} />
        </div>

        <div className="mt-[30px] flex flex-col border-t border-[#eeeeee] pt-2.5">
          <NavRow href="/calendar" icon={Calendar} label="Calendar" />
          <NavRow href="https://drive.google.com" icon={Folder} label="Drive" external />
        </div>

        <div className="mt-auto flex flex-col border-t border-[#eeeeee] pt-2.5">
          <NavRow href="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>

      <div className="p-3 pt-4">
        <div className="overflow-hidden rounded-2xl border border-[#eeeeee]">
          <div className="relative h-[150px] w-full bg-[#cbb9a4]">
            <Image
              src="/sidebar-promo.png"
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="space-y-1.5 px-4 py-4">
            <p className="text-[15px] leading-tight text-[#12181f]">
              <span className="font-bold">Art</span>
              <br />
              brings people closer.
            </p>
            <p className="text-[#c7c9cc]">—</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
