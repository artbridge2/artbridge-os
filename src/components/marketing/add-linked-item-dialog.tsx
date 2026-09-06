"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { linkContentToCampaign } from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CAMPAIGN_LINK_TYPE_LABELS, type CampaignLinkType } from "@/lib/types";

const LINK_TYPES: CampaignLinkType[] = ["content", "email", "seo"];

/**
 * Content is real now (see actions/content.ts linkContentToCampaign) — links
 * an existing Content item to this campaign. Email/SEO aren't first-class
 * linkable objects yet, so per spec §8/§25 those still show a truthful
 * unavailable state rather than a fake creation form.
 */
export function AddLinkedItemDialog({ campaignId, contentItems }: { campaignId: string; contentItems: { id: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CampaignLinkType | null>(null);
  const [contentId, setContentId] = useState("");
  const [pending, startTransition] = useTransition();

  function link() {
    if (!contentId) return;
    startTransition(async () => {
      await linkContentToCampaign(campaignId, contentId);
      router.refresh();
      setOpen(false);
      setSelected(null);
      setContentId("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelected(null); setContentId(""); } }}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Plus className="size-3.5" />Add linked item</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add linked item</DialogTitle>
        </DialogHeader>
        {!selected ? (
          <div className="flex flex-col gap-2">
            {LINK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelected(type)}
                className="flex items-center justify-between rounded-lg border border-[#eeeeee] px-3 py-2.5 text-left text-[13.5px] font-medium text-[#3d4451] hover:bg-[#f4f4f4]"
              >
                {CAMPAIGN_LINK_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        ) : selected === "content" ? (
          contentItems.length === 0 ? (
            <p className="text-[13.5px] text-[#8a909a]">
              No content items yet — create one in Content first, then link it here.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <select
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select content…</option>
                {contentItems.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <Button disabled={!contentId || pending} onClick={link}>
                {pending ? "Linking…" : "Link content"}
              </Button>
            </div>
          )
        ) : (
          <p className="text-[13.5px] text-[#8a909a]">
            The {CAMPAIGN_LINK_TYPE_LABELS[selected]} module isn&apos;t built yet — it will get its own specification. Once it
            exists, linking one from here will connect it to this campaign automatically.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
