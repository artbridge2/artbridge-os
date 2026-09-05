"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatElapsedEn } from "@/lib/dates";
import type { Notification } from "@/lib/types";

export function NotificationsBell({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  function openNotification(n: Notification) {
    if (!n.read_at) startTransition(() => markNotificationRead(n.id));
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-[#3d4451] hover:bg-[#f4f4f4]"
          />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-[#f4494d]" />}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-[#eeeeee] px-3 py-2.5">
          <p className="text-[13.5px] font-semibold text-[#12181f]">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => startTransition(async () => { await markAllNotificationsRead(); router.refresh(); })}
              className="text-[12.5px] font-medium text-[#3b82f6]"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-[#9aa0a8]">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? "#"}
                onClick={() => openNotification(n)}
                className="flex flex-col gap-0.5 border-b border-[#f2f2f2] px-3 py-2.5 last:border-b-0 hover:bg-[#f9f9f9]"
                style={{ backgroundColor: n.read_at ? undefined : "#f4f8ff" }}
              >
                <p className="text-[13px] font-medium text-[#12181f]">{n.title}</p>
                {n.body && <p className="truncate text-[12.5px] text-[#8a909a]">{n.body}</p>}
                <p className="text-[11.5px] text-[#9aa0a8]">{formatElapsedEn(n.created_at)}</p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
