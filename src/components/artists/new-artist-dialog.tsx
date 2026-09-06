"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { checkDuplicates, createArtist } from "@/actions/artists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { DuplicateArtistMatch, Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

export function NewArtistDialog({ profiles, defaultOwnerId }: { profiles: Profile[]; defaultOwnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<DuplicateArtistMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", artist_name: "", email: "", website: "", instagram: "", location: "", technique: "", bio: "", owner_id: defaultOwnerId });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function checkFirst() {
    if (!form.full_name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const matches = await checkDuplicates({ fullName: form.full_name, artistName: form.artist_name, email: form.email, instagram: form.instagram, website: form.website });
      if (matches.length > 0) setDuplicates(matches);
      else await create();
    });
  }

  async function create() {
    const id = await createArtist({
      fullName: form.full_name,
      artistName: form.artist_name || null,
      email: form.email || null,
      website: form.website || null,
      instagram: form.instagram || null,
      location: form.location || null,
      technique: form.technique || null,
      bio: form.bio || null,
      ownerId: form.owner_id,
      source: "outbound",
    });
    setOpen(false);
    router.push(`/artists/${id}`);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDuplicates(null); setError(null); } }}>
      <DialogTrigger render={<Button className="bg-[#12181f] text-white hover:bg-[#12181f]/90"><Plus className="size-4" />Add artist</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{duplicates ? "Possible existing artist" : "Add artist"}</DialogTitle>
        </DialogHeader>

        {duplicates ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Found {duplicates.length} possible match{duplicates.length > 1 ? "es" : ""} — link to an existing artist instead, or create a new one anyway.
            </p>
            {duplicates.map((d) => (
              <div key={d.artist.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                <div>
                  <p className="text-sm font-medium">{d.artist.artist_name || d.artist.full_name}</p>
                  <p className="text-xs text-muted-foreground">matched on: {d.matchedOn.join(", ")}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setOpen(false); router.push(`/artists/${d.artist.id}`); }}>
                  Open
                </Button>
              </div>
            ))}
            <DialogFooter className="px-0">
              <Button disabled={pending} onClick={() => startTransition(create)}>
                Create new anyway
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDuplicates(null)}>
                Back
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Artist name (if different)</Label>
                <Input value={form.artist_name} onChange={(e) => update("artist_name", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <select value={form.owner_id} onChange={(e) => update("owner_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {ROLE_LABELS[p.role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => update("website", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="@handle" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City, country" />
              </div>
              <div className="space-y-2">
                <Label>Technique / practice</Label>
                <Input value={form.technique} onChange={(e) => update("technique", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio (optional)</Label>
              <Textarea rows={3} value={form.bio} onChange={(e) => update("bio", e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="px-0">
              <Button disabled={pending} onClick={checkFirst}>
                {pending ? "Checking…" : "Continue"}
              </Button>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
