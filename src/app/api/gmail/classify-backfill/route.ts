import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { classifyBacklogBatch } from "@/lib/gmail/sync";

// Classifies straight from already-stored messages (no Gmail API round trip
// per thread), so this can get through more of the backlog per invocation
// than the full incremental sync can.
export const maxDuration = 60;

/** Manual backlog catch-up trigger for the Settings page — safe to click repeatedly. */
export async function POST() {
  await getCurrentProfile();
  const result = await classifyBacklogBatch(45_000);
  return NextResponse.json(result);
}
