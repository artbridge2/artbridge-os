import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { listThreadIdsByQuery } from "@/lib/gmail/client";

export const maxDuration = 60;

export async function GET() {
  await getCurrentProfile();
  const [eszterIds, adamIds] = await Promise.all([
    listThreadIdsByQuery("is:starred label:Eszter"),
    listThreadIdsByQuery("is:starred -label:Eszter"),
  ]);
  return NextResponse.json({ eszterIds, adamIds, eszterCount: eszterIds.length, adamCount: adamIds.length });
}
