"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ROLE_LABELS, type Profile } from "@/lib/types";

export function NewProjectDialog({ profiles, defaultOwnerId }: { profiles: Profile[]; defaultOwnerId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", owner_id: defaultOwnerId, start_date: "", end_date: "" });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(() =>
      createProject({
        name: form.name,
        description: form.description || null,
        ownerId: form.owner_id,
        startDate: form.start_date || null,
        endDate: form.end_date || null,
      })
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger render={<Button className="bg-[#12181f] text-white hover:bg-[#12181f]/90"><Plus className="size-4" />New project</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus placeholder="e.g. New website launch" />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Context, scope, important constraints" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Owner</Label>
              <select value={form.owner_id} onChange={(e) => update("owner_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
                ))}
              </select>
            </div>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="px-0">
            <Button disabled={pending} onClick={submit}>
              {pending ? "Creating…" : "Create project"}
            </Button>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
