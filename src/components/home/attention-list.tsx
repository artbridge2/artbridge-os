import { TicketRow, type Ticket } from "@/components/home/ticket-row";

export function AttentionList({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-[17px] font-semibold text-[#12181f]">
          {tickets.length === 0 ? "You're all caught up" : `${tickets.length} things need your attention`}
        </h2>
      </div>
      {tickets.length > 0 && (
        <div className="border-t border-[#f0f0f0]">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
