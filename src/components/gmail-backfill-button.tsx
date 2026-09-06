"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GmailBackfillButton() {
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
            const res = await fetch("/api/gmail/classify-backfill", { method: "POST" });
            const data = await res.json();
            const errorDetail = data.errorSamples?.length ? ` (${data.errorSamples.join("; ")})` : "";
            setResult(
              res.ok
                ? `${data.processed} classified${data.errors ? `, ${data.errors} error(s)${errorDetail}` : ""} — ${data.remaining} left in backlog`
                : "Backfill failed"
            );
            router.refresh();
          })
        }
      >
        {pending ? "Classifying…" : "Catch up classification"}
      </Button>
      {result && <span className="text-sm text-muted-foreground">{result}</span>}
    </div>
  );
}
