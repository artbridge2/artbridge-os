import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const VIEWING_COOKIE = "viewing_user_id";

/**
 * Resolves the signed-in user's profile row. The proxy (src/lib/supabase/proxy.ts)
 * already calls `getUser()` on every matched request — the network round trip
 * that actually revalidates the token against Supabase Auth — and redirects
 * unauthenticated requests to /login before this ever runs. Re-doing that same
 * network call here on every render was pure duplicate latency, so this uses
 * `getSession()` (decodes the already-proxy-verified JWT locally, no network
 * hop) instead. Still redirects defensively if the cookie is somehow missing.
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return profile;
});

/**
 * Resolves the "Viewing: X" team-context profile (spec §11) — a persistent,
 * cookie-backed override of whose operational data (tasks, attention items,
 * queue counts) the current pages should show. This is NOT impersonation:
 * the authenticated identity, permissions, and audit trail always stay
 * `getCurrentProfile()`'s — only read paths that already scope by "my
 * stuff" should call this instead. A Curator can never switch (no
 * admin-level cross-team access via this mechanism).
 */
export const getViewedProfile = cache(async (): Promise<Profile> => {
  const viewer = await getCurrentProfile();
  if (viewer.role === "kurator") return viewer;

  const jar = await cookies();
  const viewingId = jar.get(VIEWING_COOKIE)?.value;
  if (!viewingId || viewingId === viewer.id) return viewer;

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role, email").eq("id", viewingId).single();
  return profile ?? viewer;
});
