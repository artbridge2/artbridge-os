"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { completeOnboardingStep, reopenOnboardingStep } from "@/actions/artists";
import { ONBOARDING_STEPS, type Artist } from "@/lib/types";
import { formatElapsedEn } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ArtistOnboarding({ artist }: { artist: Artist }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [commissionTerms, setCommissionTerms] = useState(artist.commission_terms ?? "");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Onboarding</p>
      <div className="mt-2 flex flex-col">
        {ONBOARDING_STEPS.map((step) => {
          const doneAt = artist[step.field] as string | null;
          return (
            <div key={step.key} className="flex items-center gap-2.5 py-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    doneAt
                      ? reopenOnboardingStep(artist.id, step.key)
                      : completeOnboardingStep(artist.id, step.key, step.key === "commission" ? commissionTerms : undefined)
                  )
                }
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  doneAt ? "border-transparent bg-[#1c9a52] text-white" : "border-[#d8dade] hover:border-[#12181f]"
                )}
              >
                {doneAt && <Check className="size-3" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px]", doneAt ? "text-[#12181f]" : "text-[#5a616c]")}>{step.label}</p>
                {doneAt && <p className="text-[11.5px] text-[#9aa0a8]">{formatElapsedEn(doneAt)}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {!artist.onboarding_commission_at && (
        <div className="mt-2">
          <label className="text-[12px] text-[#9aa0a8]">Commission terms (optional, saved when you check the step)</label>
          <input
            value={commissionTerms}
            onChange={(e) => setCommissionTerms(e.target.value)}
            placeholder="e.g. 40% commission"
            className="mt-0.5 h-8 w-full rounded-md border border-[#e4e4e4] bg-transparent px-2 text-[13px]"
          />
        </div>
      )}
      {artist.commission_terms && <p className="mt-2 text-[13px] text-[#5a616c]">Commission: {artist.commission_terms}</p>}
    </div>
  );
}
