"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createContentItem } from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONTENT_TYPE_LABELS, ROLE_LABELS, type ContentType, type Profile } from "@/lib/types";

const CONTENT_TYPES = Object.keys(CONTENT_TYPE_LABELS) as ContentType[];

export function NewContentDialog({
  profiles,
  campaigns,
  defaultOwnerId,
}: {
  profiles: Profile[];
  campaigns: { id: string; name: string }[];
  defaultOwnerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content_type: "blog_post" as ContentType,
    owner_id: defaultOwnerId,
    campaign_id: "",
    publish_date: "",
  });

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    startTransition(() =>
      createContentItem({
        title: form.title,
        contentType: form.content_type,
        ownerId: form.owner_id,
        campaignId: form.campaign_id || null,
        publishDate: form.publish_date || null,
      })
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger render={<Button className="bg-[#12181f] text-white hover:bg-[#12181f]/90"><Plus className="size-4" />New content</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New content</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} autoFocus placeholder="e.g. Autumn framing guide" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={form.content_type}
                onChange={(e) => update("content_type", e.target.value as ContentType)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <select value={form.owner_id} onChange={(e) => update("owner_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Campaign (optional)</Label>
              <select value={form.campaign_id} onChange={(e) => update("campaign_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Publish date</Label>
              <Input type="date" value={form.publish_date} onChange={(e) => update("publish_date", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="px-0">
            <Button disabled={pending} onClick={submit}>
              {pending ? "Creating…" : "Create content"}
            </Button>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
