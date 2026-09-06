import { NextResponse } from "next/server";
import { getStarredCalibrationSample } from "@/actions/settings";

/** Admin-only one-time calibration read — see getStarredCalibrationSample for context. */
export async function GET() {
  const items = await getStarredCalibrationSample(80);
  return NextResponse.json({ count: items.length, items });
}
