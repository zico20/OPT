// /api/ask — Conversational AI endpoint backed by Claude (Anthropic SDK).
//
// Hard-scoped to HazardSignal/Antalya wildfire data. The system prompt forbids
// off-topic answers and the tool surface is a thin read-only view of our own
// public data — no DB writes, no pre-trained-knowledge speculation.
//
// Phase 1 MVP:
//   * Multi-turn (max 5 turns / session)
//   * 5 questions / IP / day (in-process Map; resets on server restart)
//   * Prompt caching on system + tool defs (Haiku 4.5)
//   * Tool-use loop with a 5-call ceiling per turn
//   * Returns full message at once (no streaming yet — Phase 2)
//
// Body:
//   { messages: [{ role: "user"|"assistant", content: string }, ...] }
// Response:
//   { reply: string, action?: { url, label }, sessionLimited?: bool }

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS } from "../../../lib/askTools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_DAILY_PER_IP = 5;
const MAX_TURNS_PER_SESSION = 5;
const MAX_TOOL_CALLS_PER_TURN = 5;
const MAX_OUTPUT_TOKENS = 800;

// In-process daily-counter store. With a single Node process (systemd unit)
// this is fine; if we ever go multi-instance we'll need a shared KV (Redis).
const ipCounter = new Map(); // key: ip + ":" + dayKey, value: count
function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function ipKeyFor(req) {
  const fwd = req.headers.get("x-forwarded-for");
  const real = req.headers.get("x-real-ip");
  return (fwd?.split(",")[0]?.trim() || real || "unknown").slice(0, 64);
}

// ──────────────── Tool definitions sent to Claude ────────────────
//
// Order matters: the LAST tool gets cache_control so the entire tool block
// caches as a unit. Anthropic caches everything *up to and including* the
// marker, so put the static system prompt + tools in front of the messages.
const TOOL_DEFS = [
  {
    name: "get_districts_now",
    description: "Get all 15 Antalya districts with their current fire-risk metrics (max_fire_prob, hotspot_count_24h, dominant_risk_class, operational_severity). Use this when the user asks about today's overall situation or wants to compare districts.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_district",
    description: "Look up a single Antalya district by name (case-insensitive, accepts Turkish or ASCII variants). Returns its current risk metrics.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "District name, e.g. 'Alanya', 'Manavgat', 'Kaş'." }
      },
      required: ["name"]
    }
  },
  {
    name: "get_history",
    description: "Get the daily-run history for one district. Use when the user asks about trends, last week, or how risk changed.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "District name." },
        days: { type: "integer", description: "Number of past days to return (1–60). Default 14." }
      },
      required: ["name"]
    }
  },
  {
    name: "get_active_fires",
    description: "Get the list of currently active FIRMS hotspots (NASA satellite fire detections) within Antalya in the past 24h.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_weather_now",
    description: "Get the current Open-Meteo weather snapshot for the Antalya region (temperature, humidity, wind).",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_weather_forecast",
    description: "Get tomorrow's weather forecast and the derived risk modifier the system uses to project district risk.",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_top_risk",
    description: "Get the top-N highest-risk districts ranked by max_fire_prob. Use when the user asks 'which is the worst' or 'top 3'.",
    input_schema: {
      type: "object",
      properties: {
        n: { type: "integer", description: "How many districts to return (1–15). Default 5." }
      },
      required: []
    }
  },
  {
    name: "get_recent_alerts",
    description: "Get alert events emitted in the past N hours (default 24). Includes Watch/Warning/Critical entries with their trigger reasons.",
    input_schema: {
      type: "object",
      properties: {
        hours: { type: "integer", description: "Lookback window in hours (1–168). Default 24." }
      },
      required: []
    }
  }
];

// Cache marker on the last tool — this caches system + entire tool block.
const TOOLS_WITH_CACHE = TOOL_DEFS.map((t, i) => (
  i === TOOL_DEFS.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t
));

// ──────────────── System prompt (cached) ────────────────
const SYSTEM_PROMPT = `You are HazardSignal Assistant, the AI helper for the HazardSignal wildfire-risk monitoring platform focused on Antalya, Turkey.

# Strict scope (NEVER violate)
You answer ONLY questions about:
- Wildfire risk in Antalya and its 15 districts (Akseki, Alanya, Elmalı, Finike, Gazipaşa, Gündoğmuş, İbradi, Kale, Kaş, Kemer, Korkuteli, Kumluca, Manavgat, Merkez, Serik)
- Active fires (FIRMS satellite hotspots) inside Antalya
- Weather conditions and forecast for Antalya
- Alert thresholds, severity levels (Watch / Warning / Critical), and how the HazardSignal system works

For ANY question outside this scope (general knowledge, other regions, code help, jokes, math, personal advice, news, history, etc.), reply with EXACTLY:
"I can only help with Antalya wildfire risk. Try asking about a specific district, current fire activity, or weather conditions."
Translate that line into the user's language if they wrote in Arabic or Turkish. Do not engage with the off-topic content at all — no acknowledgement, no partial answer.

# Data discipline (NEVER violate)
- ALWAYS fetch current data via the provided tools. Never invent numbers.
- If the user asks about anything time-sensitive (today, now, latest, current, tomorrow, this week), call a tool — never rely on your own training data.
- If a tool returns no data or fails, say so honestly. Don't guess.
- All your numbers must be traceable to a tool result you've seen this turn.

# Style
- Concise: 2–4 sentences typical.
- Use severity emojis sparingly: 🟢 calm, 🟡 watch, 🟠 warning, 🔴 critical.
- Round probabilities to whole percent (0.872 → "87%"). Round area % to one decimal.
- Detect the user's language and reply in the same language. Supported: English, Arabic (modern standard or dialect), Turkish.

# Tone
You are operational, calm, and informative — like a duty officer briefing a colleague. Not chatty. Not alarmist.`;

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

// Convert plain user/assistant messages into Anthropic message blocks.
function toAnthropicMessages(messages) {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : m.content
  }));
}

// Parse a single trailing [ACTION url="..." label="..."] line out of the model's
// reply. Returns { reply, action } where action is null if not present.
function extractAction(text) {
  const m = String(text || "").match(/\n*\[ACTION\s+url="([^"]+)"\s+label="([^"]+)"\]\s*$/);
  if (!m) return { reply: text, action: null };
  const reply = text.slice(0, m.index).trimEnd();
  return { reply, action: { url: m[1], label: m[2] } };
}

export async function POST(req) {
  // ─── Rate limit ───
  const ip = ipKeyFor(req);
  const k = ip + ":" + dayKey();
  const used = ipCounter.get(k) || 0;
  if (used >= MAX_DAILY_PER_IP) {
    return NextResponse.json(
      {
        reply: "You've reached the 5 questions / day limit. Come back tomorrow, or use the HazardSignal Telegram bot for unlimited briefings.",
        sessionLimited: true,
        remaining: 0
      },
      { status: 429 }
    );
  }

  // ─── Body parsing ───
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS_PER_SESSION * 2) : [];
  if (messages.length === 0 || !messages.some((m) => m.role === "user")) {
    return NextResponse.json({ error: "messages must include at least one user turn" }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { reply: "AI assistant is not configured (missing ANTHROPIC_API_KEY). Please contact the site admin.", sessionLimited: false },
      { status: 503 }
    );
  }

  // ─── Tool-use loop ───
  // Anthropic returns either a final text response OR a tool_use request.
  // We loop, fulfilling tool_use blocks via TOOLS, until we get end_turn or
  // hit the safety ceiling.
  let conversationMessages = toAnthropicMessages(messages);
  let finalText = "";

  try {
    for (let iter = 0; iter < MAX_TOOL_CALLS_PER_TURN + 1; iter++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }
          }
        ],
        tools: TOOLS_WITH_CACHE,
        messages: conversationMessages
      });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const textBlocks = response.content.filter((b) => b.type === "text");

      if (response.stop_reason === "tool_use" && toolUses.length > 0) {
        // Append the assistant's tool_use turn unchanged
        conversationMessages = [...conversationMessages, { role: "assistant", content: response.content }];

        // Run each tool call and produce tool_result blocks
        const toolResults = [];
        for (const tu of toolUses) {
          const fn = TOOLS[tu.name];
          let result;
          if (!fn) {
            result = { error: `Unknown tool: ${tu.name}` };
          } else {
            try {
              result = await fn(tu.input || {});
            } catch (err) {
              result = { error: err.message || "Tool failed" };
            }
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result)
          });
        }
        conversationMessages = [...conversationMessages, { role: "user", content: toolResults }];
        continue;
      }

      // end_turn (or stop_sequence) — collect the text and exit the loop
      finalText = textBlocks.map((b) => b.text).join("\n").trim();
      break;
    }
  } catch (err) {
    console.error("[ask] Anthropic error:", err);
    return NextResponse.json(
      { reply: "The assistant ran into an error. Try a simpler question, or come back in a moment.", error: String(err?.message || err) },
      { status: 502 }
    );
  }

  // ─── Increment IP counter (only on a successful answer) ───
  ipCounter.set(k, used + 1);

  const { reply, action } = extractAction(finalText || "");
  return NextResponse.json({
    reply: reply || "I couldn't generate a reply. Please try again.",
    action,
    remaining: Math.max(0, MAX_DAILY_PER_IP - (used + 1))
  });
}
