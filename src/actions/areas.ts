"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AreaFormState = { error?: string } | undefined;

export async function addArea(
  _prevState: AreaFormState,
  formData: FormData
): Promise<AreaFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Adj meg egy nevet." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("areas")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase
    .from("areas")
    .insert({ name, sort_order: (count ?? 0) + 1 });

  if (error) return { error: "Ez az area már létezik." };

  revalidatePath("/settings");
  revalidatePath("/tasks");
  return undefined;
}
