import { NextResponse } from "next/server";
import { getWeatherData } from "../../../../lib/data";

export async function GET() {
  try {
    const data = await getWeatherData();
    return NextResponse.json(data || {});
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
