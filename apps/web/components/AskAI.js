"use client";

import { useEffect, useRef, useState } from "react";

// Multi-turn cap matches the server-side enforcement in /api/ask. Counted as
// number of user messages — assistant replies don't count.
const MAX_USER_TURNS = 5;

const SUGGESTED = [
  { en: "What's the riskiest district today?", ar: "أي منطقة الأخطر اليوم؟", tr: "Bugün en riskli ilçe hangisi?" },
  { en: "Are there active fires right now?", ar: "هل في حرائق نشطة الآن؟", tr: "Şu anda aktif yangın var mı?" },
  { en: "How will the weather affect tomorrow?", ar: "كيف سيؤثر الجو غداً؟", tr: "Hava yarın nasıl olacak?" },
  { en: "Show me Alanya's recent trend", ar: "أرني اتجاه Alanya الأخير", tr: "Alanya'nın son trendini göster" }
];

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // [{ role, content, action? }]
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [limited, setLimited] = useState(false);
  const scrollRef = useRef(null);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const reachedTurnLimit = userTurns >= MAX_USER_TURNS;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || busy || reachedTurnLimit || limited) return;

    const next = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setLimited(true);
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Daily limit reached." }]);
        return;
      }

      if (!res.ok) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.reply || "Sorry, the assistant ran into an error. Try again."
        }]);
        return;
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.reply || "(empty reply)"
      }]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Network error — could not reach the assistant. Check your connection."
      }]);
    } finally {
      setBusy(false);
    }
  }

  function pickSuggestion(s) {
    // Default to English; Claude auto-detects regardless. The other variants
    // are there if we later show language-specific hints.
    send(s.en);
  }

  function reset() {
    setMessages([]);
    setLimited(false);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        className={["m-ask-btn", open ? "open" : ""].filter(Boolean).join(" ")}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Ask AI" : "Open Ask AI"}
      >
        <span className="m-ask-btn-icon" aria-hidden="true">✦</span>
        <span className="m-ask-btn-label">Ask AI</span>
      </button>

      {open && (
        <div className="m-ask-panel" role="dialog" aria-label="Ask AI about Antalya wildfire risk">
          <header className="m-ask-header">
            <div className="m-ask-title">
              <span className="m-ask-title-icon" aria-hidden="true">✦</span>
              <span>Ask AI</span>
            </div>
            <div className="m-ask-header-actions">
              {messages.length > 0 && (
                <button type="button" className="m-ask-icon-btn" onClick={reset} aria-label="Start over">↻</button>
              )}
              <button type="button" className="m-ask-icon-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
          </header>

          <div className="m-ask-body" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="m-ask-intro">
                <p className="m-ask-intro-line">Ask Me Anything About Wildfire Risk Today ..</p>
                <p className="m-ask-intro-sub">5 Questions / day</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`m-ask-msg m-ask-msg-${m.role}`}>
                <div className="m-ask-msg-bubble">{m.content}</div>
              </div>
            ))}

            {busy && (
              <div className="m-ask-msg m-ask-msg-assistant">
                <div className="m-ask-msg-bubble m-ask-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions: hide once the user starts typing, reappear if
              they erase the input. Sits above the input bar. */}
          {!input.trim() && !busy && !reachedTurnLimit && !limited && (
            <div className="m-ask-suggestions">
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="m-ask-suggestion"
                  onClick={() => pickSuggestion(s)}
                >
                  {s.en}
                </button>
              ))}
            </div>
          )}

          <form
            className="m-ask-form"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <input
              type="text"
              className="m-ask-input"
              placeholder={
                limited ? "Daily limit reached" :
                reachedTurnLimit ? "Session full — start over" :
                "Ask about a district, fire, or weather…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy || reachedTurnLimit || limited}
              maxLength={400}
            />
            {/* Send button only renders when there's text to send (or while
                the request is in flight, to show the spinner). Keeps the input
                bar clean when empty. */}
            {(input.trim() || busy) && (
              <button
                type="submit"
                className="m-ask-send"
                disabled={busy || !input.trim() || reachedTurnLimit || limited}
                aria-label="Send"
              >
                {busy ? "…" : "↑"}
              </button>
            )}
          </form>

          <div className="m-ask-footnote">
            {remaining !== null && !limited && (
              <span>Remaining today: <strong>{remaining}</strong></span>
            )}
            {reachedTurnLimit && !limited && (
              <span>Session full — tap ↻ to start over.</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
