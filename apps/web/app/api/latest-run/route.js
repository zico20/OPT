import { NextResponse } from "next/server";
import { getLatestRun } from "../../../lib/data";

export async function GET() {
  return NextResponse.json(await getLatestRun());
}

