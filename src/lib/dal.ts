import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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
