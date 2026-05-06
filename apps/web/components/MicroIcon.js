export default function MicroIcon({ name = "dot", className = "", title = "" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  let shape = <circle cx="12" cy="12" r="4" />;

  switch (name) {
    case "calendar":
      shape = <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M7.5 3.8v3.5M16.5 3.8v3.5M3.5 9.5h17" /></>;
      break;
    case "flame":
      shape = <path d="M12 3.5c1.1 2 .8 3.8-.6 5.3-1 1.1-1.6 2.1-1.6 3.5 0 2 1.5 3.7 3.6 3.7 2.5 0 4.3-2.1 4.3-4.7 0-2.4-1.4-4.2-3.2-5.8.2 1.3-.2 2.3-1 3.1-.2-1.8-.4-3.3-1.5-4.9Z" />;
      break;
    case "alert":
      shape = <><path d="M12 4.5 20 18H4L12 4.5Z" /><path d="M12 9.5v3.8M12 16.2h.01" /></>;
      break;
    case "grid":
      shape = <><rect x="4" y="4" width="6.5" height="6.5" rx="1.4" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" /></>;
      break;
    case "bell":
      shape = <><path d="M7.5 17.5h9" /><path d="M9 17.5a3 3 0 0 0 6 0" /><path d="M17.5 17.5V11a5.5 5.5 0 1 0-11 0v6.5l-1.4 1.3h13.8l-1.4-1.3Z" /></>;
      break;
    case "bell-off":
      shape = <><path d="M7.5 17.5h9" /><path d="M9 17.5a3 3 0 0 0 6 0" /><path d="M17.5 17.5V11a5.5 5.5 0 0 0-9.6-2.6" /><path d="M6.5 11v6.5l-1.4 1.3h11" /><path d="M4.5 4.5l15 15" /></>;
      break;
    case "book":
      shape = <><path d="M5 5.5a2 2 0 0 1 2-2h11v16H7a2 2 0 0 0-2 2v-16Z" /><path d="M7 3.5v18" /></>;
      break;
    case "map":
      shape = <><path d="M9 5.5 4.5 7v11L9 16.5l6 1.5 4.5-1.5v-11L15 7 9 5.5Z" /><path d="M9 5.5v11M15 7v11" /></>;
      break;
    case "lang":
      shape = <><path d="M4.5 6.5h9" /><path d="M9 6.5c-.2 4.1-1.8 7.1-4.5 10" /><path d="M8.5 10.5c1.1 2.5 3.1 4.6 5.8 6" /><path d="M15.5 6.5 20 18" /><path d="M13.9 14h5.2" /></>;
      break;
    case "chevron-up":
      shape = <path d="m6.5 14.5 5.5-5 5.5 5" />;
      break;
    case "mission":
      shape = <><path d="M5 18 12 4l7 14" /><path d="M8.8 13h6.4" /></>;
      break;
    case "share":
      shape = <><path d="M12 15.5v-9" /><path d="m8.5 9.5 3.5-3.5 3.5 3.5" /><path d="M6 14.5v3a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-3" /></>;
      break;
    case "radar":
      shape = <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><path d="M12 12 18 6" /></>;
      break;
    case "info":
      shape = <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.5h.01" /></>;
      break;
    case "user":
      shape = (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
        </>
      );
      break;
    case "menu":
      shape = <><circle cx="6" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /></>;
      break;
    case "clock":
      shape = <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>;
      break;
    case "filter":
      shape = <><path d="M4.5 6h15M7 12h10M10 18h4" /></>;
      break;
    case "globe":
      shape = <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17" /></>;
      break;
    case "external":
      shape = <><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M19.5 14v3a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5h3" /></>;
      break;
    default:
      break;
  }

  return (
    <span className={["micro-icon", className].filter(Boolean).join(" ")} title={title}>
      <svg {...props}>{shape}</svg>
    </span>
  );
}
