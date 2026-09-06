"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAiInstruction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { formatElapsedEn } from "@/lib/dates";
import type { AiInstruction, AiInstructionKey } from "@/lib/ai/instructions";

export function AiInstructionEditor({ instruction }: { instruction: AiInstruction }) {
  const router = useRouter();
  const [body, setBody] = useState(instruction.body);
  const [pending, startTransition] = useTransition();
  const dirty = body !== instruction.body;

  function save() {
    startTransition(async () => {
      await saveAiInstruction(instruction.key as AiInstructionKey, body, instruction.version);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14.5px] font-semibold text-[#12181f]">{instruction.label}</p>
        <p className="text-[12px] text-[#9aa0a8]">v{instruction.version} · updated {formatElapsedEn(instruction.updated_at)}</p>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder="No instructions yet."
        className="mt-2 w-full resize-y rounded-md border border-[#e4e4e4] bg-transparent p-2.5 text-[13.5px] text-[#3d4451]"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={!dirty || pending} onClick={save}>
          {pending ? "Saving…" : "Save new version"}
        </Button>
        {dirty && (
          <button type="button" onClick={() => setBody(instruction.body)} className="text-[13px] text-[#8a909a] hover:text-[#12181f]">
            Discard changes
          </button>
        )}
      </div>
    </div>
  );
}
