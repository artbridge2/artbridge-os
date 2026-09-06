"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentProfile, VIEWING_COOKIE } from "@/lib/dal";

/** Sets or clears the persistent "Viewing: X" team-context cookie (spec §11). Pass null (or the viewer's own id) to switch back to "Me". A Curator can never switch — silently no-ops. */
export async function setViewingUser(userId: string | null) {
  const viewer = await getCurrentProfile();
  if (viewer.role === "kurator") return;

  const jar = await cookies();
  if (!userId || userId === viewer.id) {
    jar.delete(VIEWING_COOKIE);
  } else {
    jar.set(VIEWING_COOKIE, userId, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
}
