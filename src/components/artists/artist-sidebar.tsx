"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteArtist,
  reassignArtist,
  rejectArtist,
  restoreArtist,
  resumeArtist,
  setArtistMaybeLater,
  setArtistStatus,
  setFitAssessment,
} from "@/actions/artists";
import {
  ARTIST_STATUS_LABELS,
  FIT_ASSESSMENT_LABELS,
  REJECTION_REASON_LABELS,
  ROLE_LABELS,
  type ArtistStatus,
  type ArtistWithRelations,
  type FitAssessment,
  type Profile,
  type RejectionReason,
} from "@/lib/types";

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
  const [showMaybeLater, setShowMaybeLater] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [revisitDate, setRevisitDate] = useState("");
  const [rejectReason, setRejectReason] = useState<RejectionReason>("portfolio_fit");
  const [rejectNote, setRejectNote] = useState("");

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
            <label className="text-[12px] text-[#9aa0a8]">Fit assessment</label>
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

      {artist.status === "maybe_later" ? (
        <SidebarCard title="Maybe later">
          <p className="text-[13px] text-[#8a909a]">
            Paused from <span className="font-medium text-[#5a616c]">{artist.maybe_later_previous_status ? ARTIST_STATUS_LABELS[artist.maybe_later_previous_status] : "Candidate"}</span>.
            {artist.revisit_date && <> Revisit around {new Date(artist.revisit_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.</>}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => resumeArtist(artist.id))}
            className="mt-2 text-[13.5px] font-medium text-[#3b82f6] hover:underline"
          >
            Resume
          </button>
        </SidebarCard>
      ) : artist.status === "rejected" ? (
        <SidebarCard title="Rejected">
          {artist.rejection_reason && (
            <p className="text-[13px] text-[#8a909a]">Reason: {REJECTION_REASON_LABELS[artist.rejection_reason]}</p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => restoreArtist(artist.id))}
            className="mt-2 text-[13.5px] font-medium text-[#3b82f6] hover:underline"
          >
            Restore
          </button>
        </SidebarCard>
      ) : (
        <SidebarCard title="Pause or reject">
          <div className="flex flex-col gap-3">
            {showMaybeLater ? (
              <div className="space-y-2">
                <label className="text-[12px] text-[#9aa0a8]">Revisit date (optional)</label>
                <input
                  type="date"
                  value={revisitDate}
                  onChange={(e) => setRevisitDate(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      run(() => setArtistMaybeLater(artist.id, revisitDate || null));
                      setShowMaybeLater(false);
                    }}
                    className="text-[13.5px] font-medium text-[#b8860b] hover:underline"
                  >
                    Confirm
                  </button>
                  <button type="button" onClick={() => setShowMaybeLater(false)} className="text-[13.5px] text-[#9aa0a8] hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" disabled={pending} onClick={() => setShowMaybeLater(true)} className="text-left text-[13.5px] font-medium text-[#b8860b] hover:underline">
                Maybe later
              </button>
            )}

            {showReject ? (
              <div className="space-y-2 border-t border-[#eeeeee] pt-3">
                <label className="text-[12px] text-[#9aa0a8]">Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value as RejectionReason)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
                >
                  {Object.entries(REJECTION_REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Internal note (optional)"
                  rows={2}
                  className="w-full resize-none rounded-md border border-input bg-transparent p-2 text-[13px]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      run(() => rejectArtist(artist.id, rejectReason, rejectNote));
                      setShowReject(false);
                    }}
                    className="text-[13.5px] font-medium text-[#e0353b] hover:underline"
                  >
                    Confirm reject
                  </button>
                  <button type="button" onClick={() => setShowReject(false)} className="text-[13.5px] text-[#9aa0a8] hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowReject(true)}
                className="border-t border-[#eeeeee] pt-3 text-left text-[13.5px] font-medium text-[#e0353b] hover:underline"
              >
                Reject
              </button>
            )}
          </div>
        </SidebarCard>
      )}

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
