import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { getAlertRules, updateAlertRules } from "../../../../lib/data";
import { readJsonBody } from "../../../../lib/security";

function toBoundedNumber(value, { min, max, integer = false }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Value must be between ${min} and ${max}.`);
  }

  return integer ? Math.round(parsed) : parsed;
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard) {
    return guard;
  }
  return NextResponse.json(await getAlertRules());
}

export async function PATCH(request) {
  const guard = await requireAdminApi();
  if (guard) {
    return guard;
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const patch = {};

    if (Object.prototype.hasOwnProperty.call(body, "probability_watch_min")) {
      patch.probability_watch_min = toBoundedNumber(body.probability_watch_min, { min: 0, max: 1 });
    }
    if (Object.prototype.hasOwnProperty.call(body, "probability_warning_min")) {
      patch.probability_warning_min = toBoundedNumber(body.probability_warning_min, { min: 0, max: 1 });
    }
    if (Object.prototype.hasOwnProperty.call(body, "high_or_very_high_area_pct_min")) {
      patch.high_or_very_high_area_pct_min = toBoundedNumber(body.high_or_very_high_area_pct_min, { min: 0, max: 100 });
    }
    if (Object.prototype.hasOwnProperty.call(body, "hotspot_count_critical_min")) {
      patch.hotspot_count_critical_min = toBoundedNumber(body.hotspot_count_critical_min, { min: 0, max: 1000, integer: true });
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "No valid alert-rule fields were provided." }, { status: 400 });
    }

    if (
      patch.probability_watch_min !== undefined &&
      patch.probability_warning_min !== undefined &&
      patch.probability_watch_min > patch.probability_warning_min
    ) {
      return NextResponse.json(
        { ok: false, error: "Watch threshold cannot exceed warning threshold." },
        { status: 400 }
      );
    }

    const rules = await updateAlertRules(patch);
    return NextResponse.json({
      ok: true,
      rules
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid alert-rule payload." },
      { status: 400 }
    );
  }
}