import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { runIncrementalSync } from "@/lib/gmail/sync";

// Classifying a large backlog is slow (one AI call per thread) — use the
// full budget Vercel's Hobby plan allows so "Sync now" makes real progress
// instead of being cut off after the ~10s default.
export const maxDuration = 60;

/** Manual "sync now" trigger for the Settings page. Any signed-in user may call it. */
export async function POST() {
  await getCurrentProfile();
  const result = await runIncrementalSync();
  return NextResponse.json(result);
}
