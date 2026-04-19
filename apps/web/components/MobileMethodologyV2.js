"use client";

export default function MobileMethodologyV2({ messages }) {
  const m = messages?.methodology || {};

  const groups = [
    {
      eyebrow: m.inputsTitle,
      title: m.inputsTitle,
      lead: m.inputsLead,
      items: [m.input1, m.input2, m.input3].filter(Boolean),
      tone: "ember"
    },
    {
      eyebrow: m.probabilityTitle,
      title: m.probabilityTitle,
      lead: m.probabilityLead,
      items: [m.probability1, m.probability2, m.probability3].filter(Boolean),
      tone: "amber"
    },
    {
      eyebrow: m.notTitle,
      title: m.notTitle,
      lead: m.notLead,
      items: [m.not1, m.not2, m.not3].filter(Boolean),
      tone: "red"
    }
  ];

  return (
    <div className="hsv2-screen hsv2-method">
      <div className="hsv2-header hsv2-header-full">
        <div>
          <div className="hsv2-eyebrow">{m.eyebrow || "Methodology"}</div>
          <div className="hsv2-title-big">{m.title || "How it works"}</div>
          {m.intro && <div className="hsv2-subtitle">{m.intro}</div>}
        </div>
      </div>

      {groups.map((g, i) => (
        <div key={i} className={["hsv2-method-card", `tone-${g.tone}`].join(" ")}>
          <div className="hsv2-eyebrow">{g.eyebrow}</div>
          <h2 className="hsv2-method-title">{g.title}</h2>
          <p className="hsv2-method-lead">{g.lead}</p>
          {g.items.length > 0 && (
            <div className="hsv2-method-items">
              {g.items.map((item, j) => (
                <div key={j} className="hsv2-method-item">
                  <span className="hsv2-method-bullet" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="hsv2-foot">HazardSignal · Antalya wildfire risk · v2.4</div>
    </div>
  );
}
