"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null);
  revalidatePath("/", "layout");
}
