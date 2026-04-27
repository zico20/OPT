import MobileTopBar from "./MobileTopBar";

const SECTION_TONES = {
  inputs: "info",
  probability: "ok",
  not: "warning"
};

export default function MobileMethodologyContent({
  locale = "en",
  messages,
  runDate = "-"
}) {
  const m = messages?.methodology;
  const note = messages?.common?.decisionSupport;

  if (!m) {
    return (
      <div className="m-about" data-page="methodology">
        <MobileTopBar tab="methodology" locale={locale} runDate={runDate} showScale={false} />
      </div>
    );
  }

  const sections = [
    {
      key: "inputs",
      title: m.inputsTitle,
      lead: m.inputsLead,
      items: [m.input1, m.input2, m.input3].filter(Boolean)
    },
    {
      key: "probability",
      title: m.probabilityTitle,
      lead: m.probabilityLead,
      items: [m.probability1, m.probability2, m.probability3].filter(Boolean)
    },
    {
      key: "not",
      title: m.notTitle,
      lead: m.notLead,
      items: [m.not1, m.not2, m.not3].filter(Boolean)
    }
  ];

  return (
    <div className="m-about" data-page="methodology">
      <MobileTopBar tab="methodology" locale={locale} runDate={runDate} showScale={false} />

      <div className="m-about-scroll">
        <section className="m-about-hero m-method-hero">
          <span className="m-about-eyebrow">{m.eyebrow}</span>
          <h1 className="m-about-title m-method-title">{m.title}</h1>
          <p className="m-about-tagline">{m.intro}</p>
        </section>

        {sections.map((section) => (
          <section className="m-about-card m-method-card" key={section.key} data-tone={SECTION_TONES[section.key]}>
            <h3 className="m-about-card-title">{section.title}</h3>
            {section.lead && <p>{section.lead}</p>}
            {section.items.length > 0 && (
              <ul className="m-method-list">
                {section.items.map((item, i) => (
                  <li key={i} className="m-method-list-item">{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {(m.noteTitle || note) && (
          <section className="m-about-card m-method-note">
            {m.noteTitle && <h3 className="m-about-card-title">{m.noteTitle}</h3>}
            {note && <p>{note}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
