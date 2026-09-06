"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startResearchSession } from "@/actions/artists";

export function NewResearchSession({ providerConfigured }: { providerConfigured: boolean }) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!brief.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await startResearchSession(brief);
        router.push(`/artists/research/${id}`);
      } catch {
        setError("Could not start the research session.");
      }
    });
  }

  if (!providerConfigured) {
    return (
      <div className="rounded-xl border border-dashed border-[#e4e4e4] bg-white p-6 text-center">
        <p className="text-[14px] font-medium text-[#12181f]">Connect an AI provider to use Research</p>
        <p className="mt-1 text-[13px] text-[#8a909a]">Artist research needs a provider with web-browsing capability configured in Settings.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">New research brief</p>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder='e.g. "Find 15 Hungarian or Central European illustrators creating colorful figurative work who are not already represented by Artbridge."'
        rows={3}
        className="mt-2 w-full resize-none rounded-lg border border-[#e4e4e4] bg-white p-3 text-[13.5px]"
      />
      {error && <p className="mt-1 text-[13px] text-destructive">{error}</p>}
      <button type="button" onClick={submit} disabled={pending || !brief.trim()} className="mt-2 h-9 rounded-lg bg-[#12181f] px-3 text-[13px] font-medium text-white disabled:opacity-40">
        {pending ? "Researching…" : "Start research"}
      </button>
    </div>
  );
}
