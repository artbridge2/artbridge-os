"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArtist, reassignArtist, setArtistStatus, setFitAssessment } from "@/actions/artists";
import { ARTIST_STATUS_LABELS, FIT_ASSESSMENT_LABELS, ROLE_LABELS, type ArtistStatus, type ArtistWithRelations, type FitAssessment, type Profile } from "@/lib/types";

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ArtistSidebar({ artist, profiles }: { artist: ArtistWithRelations; profiles: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <SidebarCard title="Curatorial status">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Status</label>
            <select
              defaultValue={artist.status}
              disabled={pending}
              onChange={(e) => run(() => setArtistStatus(artist.id, e.target.value as ArtistStatus))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              {Object.entries(ARTIST_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Owner</label>
            <select
              defaultValue={artist.owner_id ?? ""}
              disabled={pending}
              onChange={(e) => run(() => reassignArtist(artist.id, e.target.value))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">AI fit assessment</label>
            <select
              defaultValue={artist.fit_assessment ?? ""}
              disabled={pending}
              onChange={(e) => run(() => setFitAssessment(artist.id, (e.target.value || null) as FitAssessment | null, artist.fit_rationale))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              <option value="">Not assessed</option>
              {Object.entries(FIT_ASSESSMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {artist.fit_rationale && <p className="mt-1 text-[12px] italic text-[#8a909a]">{artist.fit_rationale}</p>}
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Actions">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this artist record? This can be recovered from the database if needed.")) return;
            startTransition(() => deleteArtist(artist.id));
          }}
          className="text-[13.5px] font-medium text-[#e0353b] hover:underline"
        >
          Delete artist
        </button>
      </SidebarCard>
    </div>
  );
}
