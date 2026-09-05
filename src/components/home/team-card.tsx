import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";

export interface TeamMember {
  id: string;
  name: string;
  needsAttention: number;
  avatarBg: string;
  avatarColor: string;
}

/** Real team members, switchable by admins (spec §13). Non-clickable for viewers without switch permission. */
export function TeamCard({ members, canSwitch, viewedUserId }: { members: TeamMember[]; canSwitch: boolean; viewedUserId: string }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-[18px] text-[#12181f]" />
          <h2 className="text-[16px] font-semibold text-[#12181f]">Team</h2>
        </div>
      </div>

      <div className="mt-3 flex flex-col">
        {members.map((member) => {
          const isActive = member.id === viewedUserId;
          const row = (
            <div className={`flex items-center gap-3 py-2.5 ${isActive ? "opacity-100" : ""}`}>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{ backgroundColor: member.avatarBg, color: member.avatarColor }}
              >
                {member.name.charAt(0)}
              </span>
              <span className={`flex-1 text-[13.5px] ${isActive ? "font-semibold text-[#12181f]" : "text-[#12181f]"}`}>
                {member.name}
              </span>
              {member.needsAttention > 0 && (
                <span className="text-[13px] font-medium text-[#f4494d]">{member.needsAttention} needs attention</span>
              )}
              {canSwitch && !isActive && <ChevronRight className="size-4 text-[#9aa0a8]" />}
            </div>
          );

          if (!canSwitch || isActive) return <div key={member.id}>{row}</div>;
          return (
            <Link key={member.id} href={`/?user=${member.id}`} className="hover:bg-[#f9f9f9]">
              {row}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
