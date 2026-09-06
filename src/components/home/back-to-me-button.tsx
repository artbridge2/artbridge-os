"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { setViewingUser } from "@/actions/viewing";

export function BackToMeButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        await setViewingUser(null);
        router.refresh();
      })}
      className={className ?? "flex items-center gap-1 text-[13px] text-[#c7c9cc] hover:text-white"}
    >
      <X className="size-3.5" />
      Back to me
    </button>
  );
}
