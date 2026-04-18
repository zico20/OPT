import { NextResponse } from "next/server";
import { getMapConfig, getLatestRun } from "../../../../lib/data";

export async function GET() {
  const [mapConfig, latestRun] = await Promise.all([
    getMapConfig(),
    getLatestRun()
  ]);

  return NextResponse.json({
    ...mapConfig,
    latest_run: latestRun
  });
}

