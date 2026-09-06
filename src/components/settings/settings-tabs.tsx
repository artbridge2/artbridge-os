import Link from "next/link";
import { cn } from "@/lib/utils";

interface Tab {
  href: string;
  label: string;
}

export function SettingsTabs({ active, showAdmin }: { active: string; showAdmin: boolean }) {
  const tabs: Tab[] = [
    { href: "/settings", label: "Integrations" },
    ...(showAdmin
      ? [
          { href: "/settings/team", label: "Team & Permissions" },
          { href: "/settings/ai", label: "AI" },
          { href: "/settings/general", label: "General" },
          { href: "/settings/audit", label: "Audit Log" },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            active === tab.href ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
