"use client";

import { useState, useTransition } from "react";
import { updateArtistField } from "@/actions/artists";
import type { Artist } from "@/lib/types";

function Field({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="text-[12px] text-[#9aa0a8]">{label}</label>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        placeholder={placeholder}
        className="mt-0.5 h-8 w-full rounded-md border border-transparent bg-transparent px-0 text-[13.5px] text-[#3d4451] hover:border-[#e4e4e4] focus:border-[#e4e4e4] focus:outline-none"
      />
    </div>
  );
}

export function ArtistDetailsCard({ artist }: { artist: Artist }) {
  const [, startTransition] = useTransition();

  function save(field: Parameters<typeof updateArtistField>[1]) {
    startTransition(() => updateArtistField(artist.id, field));
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Details</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
        <Field label="Email" value={artist.email ?? ""} onSave={(v) => save({ email: v || null })} placeholder="Not set" />
        <Field label="Phone" value={artist.phone ?? ""} onSave={(v) => save({ phone: v || null })} placeholder="Not set" />
        <Field label="Website" value={artist.website ?? ""} onSave={(v) => save({ website: v || null })} placeholder="Not set" />
        <Field label="Instagram" value={artist.instagram ?? ""} onSave={(v) => save({ instagram: v || null })} placeholder="Not set" />
        <Field label="Location" value={artist.location ?? ""} onSave={(v) => save({ location: v || null })} placeholder="Not set" />
        <Field label="Technique" value={artist.technique ?? ""} onSave={(v) => save({ technique: v || null })} placeholder="Not set" />
      </div>
      <div className="mt-3">
        <label className="text-[12px] text-[#9aa0a8]">Bio</label>
        <textarea
          defaultValue={artist.bio ?? ""}
          onBlur={(e) => e.target.value !== (artist.bio ?? "") && save({ bio: e.target.value || null })}
          placeholder="No bio yet…"
          rows={3}
          className="mt-0.5 w-full resize-none rounded-md border border-transparent bg-transparent p-0 text-[13.5px] text-[#3d4451] hover:border-[#e4e4e4] focus:border-[#e4e4e4] focus:outline-none"
        />
      </div>
    </div>
  );
}
