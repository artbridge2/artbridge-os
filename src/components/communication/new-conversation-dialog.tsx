"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { submitNewConversation, type NewConversationFormState } from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CATEGORY_LABELS_SINGULAR, ROLE_LABELS, type Profile } from "@/lib/types";
import { COMMUNICATION_CATEGORY_GROUPS } from "@/lib/types";

export function NewConversationDialog({
  profiles,
  currentUserId,
  gmailConnected,
}: {
  profiles: Profile[];
  currentUserId: string;
  gmailConnected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NewConversationFormState, FormData>(
    submitNewConversation,
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[#12181f] text-white hover:bg-[#12181f]/90">
            <Plus className="size-4" />
            New conversation
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                defaultValue="customer"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {COMMUNICATION_CATEGORY_GROUPS.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS_SINGULAR[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_id">Assignee</Label>
              <select
                id="owner_id"
                name="owner_id"
                defaultValue={currentUserId}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {ROLE_LABELS[p.role]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_email">Recipient email (optional)</Label>
            <Input id="recipient_email" name="recipient_email" type="email" placeholder="name@example.com" />
            <p className="text-xs text-muted-foreground">
              {gmailConnected
                ? "Recorded internally; sending externally happens from the ticket once created."
                : "Connect Gmail in Settings to send conversations externally. This creates an internal case for now."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={4} required />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter className="px-0">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create conversation"}
            </Button>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
