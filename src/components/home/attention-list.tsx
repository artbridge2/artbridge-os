import { ChevronDown } from "lucide-react";
import { TicketRow, type Ticket } from "@/components/home/ticket-row";

export function AttentionList({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-[17px] font-semibold text-[#12181f]">
          {tickets.length} things need your attention
        </h2>
        <button
          type="button"
          className="flex items-center gap-1 text-[13.5px] font-medium text-[#12181f]"
        >
          All
          <ChevronDown className="size-3.5 text-[#9aa0a8]" />
        </button>
      </div>
      <div className="border-t border-[#f0f0f0]">
        {tickets.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
