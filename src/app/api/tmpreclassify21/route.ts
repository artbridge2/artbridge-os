import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/dal";
import { classifySpecificThreads } from "@/lib/gmail/sync";

export const maxDuration = 60;

const STARRED_THREAD_IDS = [
  "19f93cb4259c3842", "1a076de7fefd7c26", "19ed4afd0a33f0c6", "1a05d1336d6ead61", "19f0e20d62c910a4",
  "1a05c44a70e855a4", "1a0567fecf262a5b", "1a05406bf0971c1c", "19fd2005ba69754e", "1a03028a6debbf10",
  "19e730df203c7375", "1a01ea06595a0c4c", "1a01acd0ff17e5be", "19fb99b92e906a27",
  "19e403782ad692ea", "1a060fe669851179", "1a04403e01eae583", "1a048b065bcba058", "1a029d5020c1b7c0",
  "1a01a0cc7b63ca52", "19ffa6e8ff8718f5",
];

export async function GET(request: Request) {
  await getCurrentProfile();
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "3");
  const result = await classifySpecificThreads(STARRED_THREAD_IDS, 40_000, limit);
  return NextResponse.json(result);
}
