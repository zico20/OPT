import { getTelegramSubscribeUrl } from "../lib/publicLinks";

export default function TelegramSubscribePanel({ messages, title, body, compact = false, buttonOnly = false }) {
  const subscribeUrl = getTelegramSubscribeUrl();

  if (!subscribeUrl) {
    return null;
  }

  if (buttonOnly) {
    return (
      <section className={["subscribe-card", "subscribe-minimal", compact ? "compact" : ""].filter(Boolean).join(" ")}>
        <a
          className="button telegram"
          href={subscribeUrl}
          target="_blank"
          rel="noreferrer"
        >
          {messages.common.subscribeTelegram}
        </a>
      </section>
    );
  }

  return (
    <section className={["subscribe-card", compact ? "compact" : ""].filter(Boolean).join(" ")}>
      {title ? <span className="eyebrow">{title}</span> : null}
      {body ? <p>{body}</p> : null}
      <div className="feature-list">
        <div className="feature-item">{messages.common.subscribeStep1}</div>
        <div className="feature-item">{messages.common.subscribeStep2}</div>
        <div className="feature-item">{messages.common.subscribeStep3}</div>
      </div>
      <a
        className="button telegram"
        href={subscribeUrl}
        target="_blank"
        rel="noreferrer"
      >
        {messages.common.subscribeTelegram}
      </a>
    </section>
  );
}

