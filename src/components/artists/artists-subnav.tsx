import Link from "next/link";
import { cn } from "@/lib/utils";

export function ArtistsSubnav({
  active,
  counts,
}: {
  active: "all" | "applications";
  counts: { applications: number };
}) {
  const tabs: { key: typeof active; label: string; href: string; count?: number }[] = [
    { key: "all", label: "All Artists", href: "/artists" },
    { key: "applications", label: "Applications", href: "/artists/applications", count: counts.applications },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            active === tab.key ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          {tab.label} {typeof tab.count === "number" && <span className="opacity-80">{tab.count}</span>}
        </Link>
      ))}
    </div>
  );
}
