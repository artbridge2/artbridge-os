"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CAMPAIGN_LINK_TYPE_LABELS, type CampaignLinkType } from "@/lib/types";

const LINK_TYPES: CampaignLinkType[] = ["content", "email", "seo"];

/**
 * Content/Email/SEO don't exist yet — each gets its own spec and creation
 * flow. Per spec §8/§25, an unimplemented module shows a truthful
 * unavailable state here rather than a fake creation form.
 */
export function AddLinkedItemDialog() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CampaignLinkType | null>(null);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelected(null); }}>
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
        ) : (
          <p className="text-[13.5px] text-[#8a909a]">
            The {CAMPAIGN_LINK_TYPE_LABELS[selected]} module isn&apos;t built yet — it will get its own specification. Once it
            exists, creating one from here will link it to this campaign automatically.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
