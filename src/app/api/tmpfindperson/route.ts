import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { importAndClassifyByGmailQuery } from "@/lib/gmail/sync";

export const maxDuration = 60;

export async function GET(request: Request) {
  await getCurrentProfile();
  const q = new URL(request.url).searchParams.get("q");
  if (!q) return NextResponse.json({ error: "missing ?q=" }, { status: 400 });
  const result = await importAndClassifyByGmailQuery(q);
  return NextResponse.json(result);
}
