import { NextResponse } from "next/server";
import { getDistrictById, getDistrictHistory, getAlertEvents } from "../../../../../lib/data";

export async function GET(_request, { params }) {
  const { districtId } = await params;
  const district = await getDistrictById(districtId);
  if (!district) {
    return NextResponse.json({ error: "District not found" }, { status: 404 });
  }

  const history = await getDistrictHistory(districtId);
  const alerts = await getAlertEvents();

  return NextResponse.json({
    district,
    history,
    alerts: alerts.filter((alert) => alert.district_id === districtId)
  });
}
