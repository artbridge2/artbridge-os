import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { getConsentUrl } from "@/lib/shopify/client";

/** Starts the one-time Shopify OAuth consent flow. Only reachable by a signed-in user. */
export async function GET() {
  await getCurrentProfile();
  return NextResponse.redirect(getConsentUrl(crypto.randomUUID()));
}
