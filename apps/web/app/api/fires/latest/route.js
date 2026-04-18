import { NextResponse } from "next/server";
import { getActiveFireDaily } from "../../../../lib/data";

export async function GET() {
  return NextResponse.json(await getActiveFireDaily());
}

