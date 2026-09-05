import type { ComponentType, SVGProps } from "react";
import { OpenButton } from "@/components/home/open-button";

export interface Ticket {
  id: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  category: string;
  title: string;
  description: string;
  timeAgo: string;
  href: string;
}

export function TicketRow({ ticket }: { ticket: Ticket }) {
  const Icon = ticket.icon;
  return (
    <div className="flex items-center gap-4 border-b border-[#f0f0f0] py-4 pl-4 pr-2 last:border-b-0">
      <span
        className="h-full w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: ticket.borderColor }}
      />
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: ticket.iconBg }}
      >
        <Icon className="size-[18px]" style={{ color: ticket.iconColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-[#9aa0a8]">{ticket.category}</p>
        <p className="truncate text-[15px] font-semibold text-[#12181f]">{ticket.title}</p>
        <p className="truncate text-[13px] text-[#8a909a]">{ticket.description}</p>
      </div>
      <p className="w-24 shrink-0 text-right text-[13px] text-[#9aa0a8]">{ticket.timeAgo}</p>
      <OpenButton href={ticket.href} />
    </div>
  );
}
