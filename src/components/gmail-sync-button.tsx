"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GmailSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const res = await fetch("/api/gmail/sync", { method: "POST" });
            const data = await res.json();
            setResult(
              res.ok
                ? `${data.threadsProcessed} thread frissítve${data.errors ? `, ${data.errors} hiba` : ""}`
                : "Sync sikertelen"
            );
            router.refresh();
          })
        }
      >
        {pending ? "Szinkronizálás..." : "Sync now"}
      </Button>
      {result && <span className="text-sm text-muted-foreground">{result}</span>}
    </div>
  );
}
