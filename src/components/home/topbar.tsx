import { Search, Bell, ChevronDown } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/types";

export function Topbar({ role }: { role: Role }) {
  const initial = ROLE_LABELS[role].charAt(0);

  return (
    <header className="flex h-[76px] shrink-0 items-center gap-4 px-8">
      <div className="flex h-[46px] flex-1 items-center gap-2.5 rounded-xl bg-[#f4f4f4] px-4">
        <Search className="size-[18px] text-[#9aa0a8]" />
        <span className="text-[14px] text-[#9aa0a8]">Search anything...</span>
      </div>

      <button
        type="button"
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-[#3d4451] hover:bg-[#f4f4f4]"
      >
        <Bell className="size-5" />
        <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#f4494d]" />
      </button>

      <button type="button" className="flex shrink-0 items-center gap-2 rounded-full pl-0.5 pr-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#f6cfc7] text-[13px] font-semibold text-[#8a3b2b]">
          {initial}
        </span>
        <span className="text-[14px] font-medium text-[#12181f]">{ROLE_LABELS[role]}</span>
        <ChevronDown className="size-4 text-[#9aa0a8]" />
      </button>
    </header>
  );
}
