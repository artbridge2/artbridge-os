"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus, X } from "lucide-react";
import { addProjectDocument, removeProjectDocument } from "@/actions/projects";
import type { ProjectDocument } from "@/lib/types";

export function ProjectFiles({ projectId, documents }: { projectId: string; documents: ProjectDocument[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function add() {
    if (!name.trim() || !url.trim()) return;
    run(() => addProjectDocument(projectId, name, url));
    setName("");
    setUrl("");
    setAdding(false);
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Files</p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-[13px] font-medium text-[#3d4451] hover:text-[#12181f]">
            <Plus className="size-3.5" /> Add link
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded-md border border-[#eeeeee] px-2.5 py-1.5">
            <Paperclip className="size-3.5 shrink-0 text-[#9aa0a8]" />
            <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[13.5px] text-[#3b82f6] hover:underline">
              {d.name}
            </a>
            <button type="button" onClick={() => run(() => removeProjectDocument(d.id))} disabled={pending} className="text-[#9aa0a8] hover:text-[#e0353b]">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {documents.length === 0 && !adding && <p className="text-[13px] text-[#9aa0a8]">No files yet.</p>}
      </div>
      {adding && (
        <div className="mt-2 space-y-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="File name" className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-[13px]" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link" className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-[13px]" />
          <div className="flex gap-1.5">
            <button type="button" onClick={add} className="h-8 rounded-md bg-[#12181f] px-3 text-[12.5px] font-medium text-white">Add</button>
            <button type="button" onClick={() => setAdding(false)} className="h-8 rounded-md px-3 text-[12.5px] text-[#8a909a]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
