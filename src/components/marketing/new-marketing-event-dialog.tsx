"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createMarketingEvent } from "@/actions/marketing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ROLE_LABELS, type MarketingCampaignWithRelations, type Profile } from "@/lib/types";

export function NewMarketingEventDialog({ profiles, campaigns }: { profiles: Profile[]; campaigns: MarketingCampaignWithRelations[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", event_date: "", description: "", owner_id: "", campaign_id: "" });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    if (!form.title.trim() || !form.event_date) {
      setError("Title and date are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await createMarketingEvent({
        title: form.title,
        eventDate: form.event_date,
        description: form.description || null,
        ownerId: form.owner_id || null,
        campaignId: form.campaign_id || null,
      });
      setOpen(false);
      setForm({ title: "", event_date: "", description: "", owner_id: "", campaign_id: "" });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Plus className="size-3.5" />New event</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New marketing event</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} autoFocus placeholder="e.g. Product photoshoot" />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Owner (optional)</Label>
              <select value={form.owner_id} onChange={(e) => update("owner_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Campaign (optional)</Label>
              <select value={form.campaign_id} onChange={(e) => update("campaign_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">None</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="px-0">
            <Button disabled={pending} onClick={submit}>
              {pending ? "Creating…" : "Create event"}
            </Button>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
