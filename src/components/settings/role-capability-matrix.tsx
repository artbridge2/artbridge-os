"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRoleCapability } from "@/actions/settings";
import { CAPABILITIES, type CapabilityKey } from "@/lib/capabilities-shared";
import { ROLE_LABELS, type Role } from "@/lib/types";

const ROLES: Role[] = ["adam", "eszter", "kurator"];

export function RoleCapabilityMatrix({ matrix }: { matrix: Record<Role, Record<CapabilityKey, boolean>> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(role: Role, capability: CapabilityKey, next: boolean) {
    startTransition(async () => {
      await setRoleCapability(role, capability, next);
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#eeeeee] bg-white">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-[#eeeeee]">
            <th className="px-4 py-2.5 text-left font-semibold text-[#12181f]">Capability</th>
            {ROLES.map((role) => (
              <th key={role} className="px-4 py-2.5 text-center font-semibold text-[#12181f]">{ROLE_LABELS[role]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((cap) => (
            <tr key={cap.key} className="border-b border-[#f2f2f2] last:border-0">
              <td className="px-4 py-2 text-[#3d4451]">{cap.label}</td>
              {ROLES.map((role) => (
                <td key={role} className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    disabled={pending}
                    checked={matrix[role][cap.key]}
                    onChange={(e) => toggle(role, cap.key, e.target.checked)}
                    className="size-4 accent-[#12181f]"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
