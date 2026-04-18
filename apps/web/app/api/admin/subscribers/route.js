import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { upsertSubscriber } from "../../../../lib/data";
import { readJsonBody } from "../../../../lib/security";

function isValidChatId(value) {
  return /^-?[0-9]{5,20}$/.test(value);
}

function isValidScope(value) {
  return /^(all|[a-z0-9_-]{2,64})$/i.test(value);
}

export async function POST(request) {
  const guard = await requireAdminApi();
  if (guard) {
    return guard;
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const scope = String(body.district_scope || "all").trim();
  const chatId = String(body.chat_id || "").trim();

  if (!isValidChatId(chatId)) {
    return NextResponse.json({ ok: false, error: "Invalid Telegram chat ID." }, { status: 400 });
  }

  if (!isValidScope(scope)) {
    return NextResponse.json({ ok: false, error: "Invalid district scope." }, { status: 400 });
  }

  const subscriberId = `manual_${chatId}_${scope}`.replace(/[^a-zA-Z0-9_-]/g, "_");

  const subscriber = {
    subscriber_id: subscriberId,
    channel_type: "telegram",
    chat_id: chatId,
    district_scope: scope,
    enabled: true,
    created_at: new Date().toISOString()
  };

  await upsertSubscriber(subscriber);

  return NextResponse.json({
    ok: true,
    subscriber
  });
}