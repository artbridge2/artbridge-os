import { Users, ChevronRight } from "lucide-react";

export interface TeamMember {
  id: string;
  name: string;
  important: number;
  avatarBg: string;
  avatarColor: string;
}

export function TeamCard({ members }: { members: TeamMember[] }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-[18px] text-[#12181f]" />
          <h2 className="text-[16px] font-semibold text-[#12181f]">Team</h2>
        </div>
        <ChevronRight className="size-4 text-[#9aa0a8]" />
      </div>

      <div className="mt-3 flex flex-col">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 py-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
              style={{ backgroundColor: member.avatarBg, color: member.avatarColor }}
            >
              {member.name.charAt(0)}
            </span>
            <span className="flex-1 text-[13.5px] text-[#12181f]">{member.name}</span>
            <span className="text-[13px] font-medium text-[#f4494d]">{member.important} important</span>
          </div>
        ))}
      </div>
    </div>
  );
}
