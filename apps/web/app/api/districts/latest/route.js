import { NextResponse } from "next/server";
import { getDistrictRiskDaily, sortDistrictsByRisk } from "../../../../lib/data";

export async function GET() {
  const districts = sortDistrictsByRisk(await getDistrictRiskDaily());
  return NextResponse.json(districts);
}

