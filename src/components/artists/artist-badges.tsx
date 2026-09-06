import { ARTIST_STATUS_STYLE, FIT_STYLE } from "@/lib/artist-style";
import { ARTIST_STATUS_LABELS, FIT_ASSESSMENT_LABELS, type ArtistStatus, type FitAssessment } from "@/lib/types";

export function ArtistStatusBadge({ status }: { status: ArtistStatus }) {
  const style = ARTIST_STATUS_STYLE[status];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
      {ARTIST_STATUS_LABELS[status]}
    </span>
  );
}

export function FitBadge({ fit }: { fit: FitAssessment | null }) {
  if (!fit) return null;
  const style = FIT_STYLE[fit];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
      {FIT_ASSESSMENT_LABELS[fit]}
    </span>
  );
}
