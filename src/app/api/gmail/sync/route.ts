import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { runIncrementalSync } from "@/lib/gmail/sync";

/** Manual "sync now" trigger for the Settings page. Any signed-in user may call it. */
export async function POST() {
  await getCurrentProfile();
  const result = await runIncrementalSync();
  return NextResponse.json(result);
}
