"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function DisconnectButton({ action, consequence, label = "Disconnect" }: { action: () => Promise<void>; consequence: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`${label}?\n\n${consequence}`)) return;
        startTransition(async () => {
          await action();
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-[#e4e4e4] px-3 text-[12.5px] font-medium text-[#e0353b] hover:bg-[#fde8ea] disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
