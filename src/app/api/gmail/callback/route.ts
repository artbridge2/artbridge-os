import { NextResponse, after, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { exchangeCodeForTokens, getEmailForTokens, GMAIL_SCOPES } from "@/lib/gmail/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInitialSync } from "@/lib/gmail/sync";

export async function GET(request: NextRequest) {
  const me = await getCurrentProfile();
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/settings?gmail=error", request.url));
  }

  const tokens = await exchangeCodeForTokens(code);

  if (!tokens.refresh_token) {
    // Google only issues a refresh_token on first consent (or with prompt=consent,
    // which we always send) — if it's missing here, ask the user to revoke
    // Artbridge OS's access at myaccount.google.com/permissions and reconnect.
    return NextResponse.redirect(new URL("/settings?gmail=missing_refresh_token", request.url));
  }

  const connectedEmail = await getEmailForTokens(tokens);

  const admin = createAdminClient();
  await admin.from("gmail_integration").insert({
    connected_email: connectedEmail,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scopes: GMAIL_SCOPES,
    connected_by: me.id,
  });

  // Kick off the 30-day backfill without blocking this redirect. Large
  // mailboxes may take longer than one invocation — re-running the sync
  // route (idempotent, upserts by gmail_thread_id) picks up where needed.
  after(() => runInitialSync(30).catch((err) => console.error("[gmail] initial sync failed", err)));

  return NextResponse.redirect(new URL("/settings?gmail=connected", request.url));
}
