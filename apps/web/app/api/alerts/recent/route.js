import { NextResponse } from "next/server";
import { getAlertEvents } from "../../../../lib/data";

export async function GET() {
  return NextResponse.json(await getAlertEvents());
}

