"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { logApplication } from "@/actions/artists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function LogApplicationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const id = await logApplication({
        name,
        email: email || null,
        message: message || null,
        links: link ? [{ label: link, url: link }] : [],
      });
      setOpen(false);
      router.push(`/artists/applications/${id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><Plus className="size-4" />Log application</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log an application</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Record an application that arrived by email (or another channel) so it can go through review here instead of Communication.
        </p>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Portfolio/website link</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Application message</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <DialogFooter className="px-0">
            <Button disabled={pending || !name.trim()} onClick={submit}>
              {pending ? "Saving…" : "Log application"}
            </Button>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
