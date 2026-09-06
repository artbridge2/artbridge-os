import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const VIEWING_COOKIE = "viewing_user_id";

/**
 * Resolves the signed-in user's profile row. The proxy already redirects
 * unauthenticated requests to /login, but every data-reading entry point
 * re-checks here too (defense in depth, per Next.js auth guidance).
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .eq("id", user.id)
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
