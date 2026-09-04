import { NextResponse, type NextRequest } from "next/server";
import { runIncrementalSync } from "@/lib/gmail/sync";

/**
 * Vercel Cron target (see vercel.json). Vercel signs cron requests with
 * `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set — verify it
 * so this endpoint can't be triggered by anyone who finds the URL.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runIncrementalSync();
  return NextResponse.json(result);
}
