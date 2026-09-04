import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface GmailConnectionStatus {
  connected: boolean;
  connectedEmail?: string;
  lastSyncedAt?: string | null;
}

/** Safe-to-render connection status — never returns tokens, only for display in Settings. */
export async function getGmailConnectionStatus(): Promise<GmailConnectionStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gmail_integration")
    .select("connected_email, last_synced_at")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { connected: false };
  return { connected: true, connectedEmail: data.connected_email, lastSyncedAt: data.last_synced_at };
}
