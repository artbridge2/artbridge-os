"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { signOut } from "@/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type Role } from "@/lib/types";

export function AccountMenu({ fullName, role, canSeeSettings }: { fullName: string; role: Role; canSeeSettings: boolean }) {
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className="flex shrink-0 items-center gap-2 rounded-full pl-0.5 pr-2 hover:bg-[#f4f4f4]">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#f6cfc7] text-[13px] font-semibold text-[#8a3b2b]">
              {initial}
            </span>
            <span className="text-[14px] font-medium text-[#12181f]">{ROLE_LABELS[role]}</span>
            <ChevronDown className="size-4 text-[#9aa0a8]" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem render={<Link href="/account" />}>
          <User className="size-4" />
          My profile
        </DropdownMenuItem>
        {canSeeSettings && (
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
