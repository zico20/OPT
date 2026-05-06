"use client";

import { useEffect, useRef, useState } from "react";

// Multi-turn cap matches the server-side enforcement in /api/ask. Counted as
// number of user messages — assistant replies don't count.
const MAX_USER_TURNS = 5;

// Per-locale UI strings. The visible button label "Ask AI" is intentionally
// kept English everywhere — it's a brand mark for the feature, not body copy.
const STRINGS = {
  en: {
    intro: "Ask Me Anything About Wildfire Risk Today ..",
    sub: "5 Questions / day",
    placeholder: "Ask about a district, fire, or weather…",
    placeholderLimited: "Daily limit reached",
    placeholderSessionFull: "Session full — start over",
    sendAriaLabel: "Send",
    closeAriaLabel: "Close",
    resetAriaLabel: "Start over",
    openAriaLabel: "Open Ask AI",
    closeBtnAriaLabel: "Close Ask AI",
    panelAriaLabel: "Ask AI about Antalya wildfire risk",
    sessionFullNote: "Session full — tap ↻ to start over.",
    remaining: (n) => <>Remaining today: <strong>{n}</strong></>,
    dailyLimitReached: "You've reached the 5 questions / day limit. Come back tomorrow, or use the HazardSignal Telegram bot for unlimited briefings.",
    httpError: "Sorry, the assistant ran into an error. Try again.",
    networkError: "Network error — could not reach the assistant. Check your connection."
  },
  ar: {
    intro: "اسألني أي شيء عن مخاطر الحرائق اليوم ..",
    sub: "5 أسئلة في اليوم",
    placeholder: "اسأل عن منطقة، حريق، أو الطقس…",
    placeholderLimited: "تم بلوغ الحد اليومي",
    placeholderSessionFull: "الجلسة ممتلئة — ابدأ من جديد",
    sendAriaLabel: "إرسال",
    closeAriaLabel: "إغلاق",
    resetAriaLabel: "ابدأ من جديد",
    openAriaLabel: "افتح Ask AI",
    closeBtnAriaLabel: "أغلق Ask AI",
    panelAriaLabel: "Ask AI عن مخاطر الحرائق في أنطاليا",
    sessionFullNote: "الجلسة ممتلئة — اضغط ↻ للبدء من جديد.",
    remaining: (n) => <>المتبقي اليوم: <strong>{n}</strong></>,
    dailyLimitReached: "بلغت حد 5 أسئلة في اليوم. ارجع غداً، أو استخدم بوت تيليجرام التابع لـ HazardSignal لتلقي إحاطات بلا حدود.",
    httpError: "عذراً، حدث خطأ في المساعد. حاول مرة أخرى.",
    networkError: "خطأ في الشبكة — تعذر الوصول إلى المساعد. تحقق من اتصالك."
  },
  tr: {
    intro: "Bugün Yangın Riski Hakkında Bana Her Şeyi Sor ..",
    sub: "Günde 5 Soru",
    placeholder: "Bir ilçe, yangın veya hava durumu hakkında sor…",
    placeholderLimited: "Günlük limit doldu",
    placeholderSessionFull: "Oturum dolu — yeniden başla",
    sendAriaLabel: "Gönder",
    closeAriaLabel: "Kapat",
    resetAriaLabel: "Yeniden başla",
    openAriaLabel: "Ask AI'yı aç",
    closeBtnAriaLabel: "Ask AI'yı kapat",
    panelAriaLabel: "Antalya yangın riski hakkında Ask AI",
    sessionFullNote: "Oturum dolu — yeniden başlamak için ↻ dokun.",
    remaining: (n) => <>Bugün kalan: <strong>{n}</strong></>,
    dailyLimitReached: "Günde 5 soru limitine ulaştınız. Yarın geri dönün veya sınırsız özetler için HazardSignal Telegram botunu kullanın.",
    httpError: "Üzgünüm, asistanda bir hata oluştu. Lütfen tekrar deneyin.",
    networkError: "Ağ hatası — asistana ulaşılamıyor. Bağlantınızı kontrol edin."
  }
};

const SUGGESTED = [
  { en: "What's the riskiest district today?", ar: "أي منطقة الأخطر اليوم؟", tr: "Bugün en riskli ilçe hangisi?" },
  { en: "Are there active fires right now?", ar: "هل توجد حرائق نشطة الآن؟", tr: "Şu anda aktif yangın var mı?" },
  { en: "How will the weather affect tomorrow?", ar: "كيف سيؤثر الجو غداً؟", tr: "Hava yarın nasıl olacak?" },
  { en: "Show me Alanya's recent trend", ar: "أرني اتجاه Alanya الأخير", tr: "Alanya'nın son trendini göster" }
];

function pickLocale(locale) {
  const k = String(locale || "en").toLowerCase();
  if (k === "ar" || k === "tr") return k;
  return "en";
}

export default function AskAI({ locale = "en" }) {
  const lang = pickLocale(locale);
  const t = STRINGS[lang];
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
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply || t.dailyLimitReached }]);
        return;
      }

      if (!res.ok) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.reply || t.httpError
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
        content: t.networkError
      }]);
    } finally {
      setBusy(false);
    }
  }

  function pickSuggestion(s) {
    // Send the locale-specific variant of the suggestion so Claude responds
    // in the same language without needing to detect from "What's the…".
    send(s[lang] || s.en);
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
        aria-label={open ? t.closeBtnAriaLabel : t.openAriaLabel}
      >
        <span className="m-ask-btn-icon" aria-hidden="true">✦</span>
        <span className="m-ask-btn-label">Ask AI</span>
      </button>

      {open && (
        <div className="m-ask-panel" role="dialog" aria-label={t.panelAriaLabel}>
          <header className="m-ask-header">
            <div className="m-ask-title">
              <span className="m-ask-title-icon" aria-hidden="true">✦</span>
              <span>Ask AI</span>
            </div>
            <div className="m-ask-header-actions">
              {messages.length > 0 && (
                <button type="button" className="m-ask-icon-btn" onClick={reset} aria-label={t.resetAriaLabel}>↻</button>
              )}
              <button type="button" className="m-ask-icon-btn" onClick={() => setOpen(false)} aria-label={t.closeAriaLabel}>✕</button>
            </div>
          </header>

          <div className="m-ask-body" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="m-ask-intro">
                <p className="m-ask-intro-line">{t.intro}</p>
                <p className="m-ask-intro-sub">{t.sub}</p>
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
                  {s[lang] || s.en}
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
                limited ? t.placeholderLimited :
                reachedTurnLimit ? t.placeholderSessionFull :
                t.placeholder
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
                aria-label={t.sendAriaLabel}
              >
                {busy ? "…" : "↑"}
              </button>
            )}
          </form>

          <div className="m-ask-footnote">
            {remaining !== null && !limited && (
              <span>{t.remaining(remaining)}</span>
            )}
            {reachedTurnLimit && !limited && (
              <span>{t.sessionFullNote}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
