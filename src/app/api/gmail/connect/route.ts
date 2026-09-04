import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { getConsentUrl } from "@/lib/gmail/client";

/** Starts the one-time Gmail OAuth consent flow. Only reachable by a signed-in user. */
export async function GET() {
  await getCurrentProfile();
  return NextResponse.redirect(getConsentUrl("connect"));
}
