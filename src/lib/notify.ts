import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Was duplicated verbatim across 6 action files — one copy now (spec §9). */
export async function notifyUser(userId: string, type: string, title: string, body: string | null, href: string) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({ user_id: userId, type, title, body, href });
}

/**
 * Notifies each structurally-mentioned profile (from a MentionComposer's
 * `mentionedProfileIds`, not substring-matched text) — de-duped, and never
 * notifying the author who wrote the mention.
 */
export async function notifyMentions(
  mentionedProfileIds: string[],
  meId: string,
  meName: string,
  title: string | null,
  href: string
) {
  const uniqueIds = [...new Set(mentionedProfileIds)].filter((id) => id !== meId);
  for (const id of uniqueIds) {
    await notifyUser(id, "mention", `${meName} mentioned you`, title, href);
  }
}
